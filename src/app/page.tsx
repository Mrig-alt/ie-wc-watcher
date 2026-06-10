import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matches, teams, students, predictions, watchInvites, bets, friendGroups } from "@/db/schema";
import { eq, and, or, gte, lte, asc, inArray, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import TodayHero from "@/components/matches/TodayHero";
import MatchCardClient from "@/components/matches/MatchCardClient";
import HomeTabsClient from "@/components/home/HomeTabsClient";
import JoinBanner from "@/components/home/JoinBanner";
import PendingChallengesModal from "@/components/home/PendingChallengesModal";
import NotificationOnboardingModal from "@/components/home/NotificationOnboardingModal";
import DevicePushPrompt from "@/components/home/DevicePushPrompt";
import TournamentPickBanner from "@/components/home/TournamentPickBanner";
import GuestConversionPrompt from "@/components/home/GuestConversionPrompt";
import { getCachedTeams, getCachedActiveStudents } from "@/db/queries";
import { getMadridTodayRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const session = await auth();
    const validSession = session?.user?.id ? session : null;

    const { start: todayStart, end: todayEnd } = getMadridTodayRange();

    // Alias students for pending bet names
    const challenger = alias(students, "challenger");
    const challenged = alias(students, "challenged");

    // Round 1: fetch todayMatches + all session-independent data in parallel
    const [todayMatches, allTeams, allStudents, myPredictions, pendingChallengesRaw, nextMatchRaw] =
      await Promise.all([
        db.select({
          id: matches.id, matchDatetime: matches.matchDatetime, status: matches.status,
          stage: matches.stage, groupName: matches.groupName,
          team1Score: matches.team1Score, team2Score: matches.team2Score,
          venue: matches.venue, city: matches.city,
          team1Placeholder: matches.team1Placeholder, team2Placeholder: matches.team2Placeholder,
          team1Odds: matches.team1Odds, team2Odds: matches.team2Odds,
          team1Id: matches.team1Id, team2Id: matches.team2Id,
        })
          .from(matches)
          .where(or(
            and(gte(matches.matchDatetime, todayStart), lte(matches.matchDatetime, todayEnd)),
            and(gte(matches.matchDatetime, todayStart), eq(matches.status, "upcoming"))
          ))
          .orderBy(asc(matches.matchDatetime))
          .limit(30),
        getCachedTeams(),
        getCachedActiveStudents(),
        validSession
          ? db.select().from(predictions).where(eq(predictions.studentId, validSession.user.id))
          : Promise.resolve([]),
        validSession
          ? db.select({
              id: bets.id, stakeTokens: bets.stakeTokens,
              challengerName: challenger.name, challengedName: challenged.name,
              student1Id: bets.student1Id, student2Id: bets.student2Id,
              challengerTeamSide: bets.challengerTeamSide,
              matchDatetime: matches.matchDatetime,
              team1Id: matches.team1Id, team2Id: matches.team2Id,
              team1Placeholder: matches.team1Placeholder, team2Placeholder: matches.team2Placeholder,
              groupId: bets.groupId,
              student1Score1: bets.student1Score1, student1Score2: bets.student1Score2,
            })
              .from(bets)
              .innerJoin(matches, eq(matches.id, bets.matchId))
              .innerJoin(challenger, eq(challenger.id, bets.student1Id))
              .innerJoin(challenged, eq(challenged.id, bets.student2Id))
              .where(and(
                or(eq(bets.student1Id, validSession.user.id), eq(bets.student2Id, validSession.user.id)),
                eq(bets.status, "pending"),
                eq(bets.settled, false)
              ))
              .orderBy(desc(matches.matchDatetime))
          : Promise.resolve([]),
        db.select().from(matches)
          .where(and(gte(matches.matchDatetime, new Date()), eq(matches.status, "upcoming")))
          .orderBy(asc(matches.matchDatetime))
          .limit(1),
      ]);

    const todayMatchIds = todayMatches.map((m) => m.id);

    // Round 2: todayInvites and group names need results from round 1
    const groupIdsNeeded = [...new Set((pendingChallengesRaw as Array<{ groupId: string | null }>).filter((c) => c.groupId).map((c) => c.groupId as string))];
    const [todayInvites, groupRows] = await Promise.all([
      todayMatchIds.length > 0
        ? db.select({
            inviterId: watchInvites.inviterId, matchId: watchInvites.matchId,
            locationName: watchInvites.locationName, locationUrl: watchInvites.locationUrl,
          }).from(watchInvites).where(inArray(watchInvites.matchId, todayMatchIds))
        : Promise.resolve([]),
      groupIdsNeeded.length > 0
        ? db.select({ id: friendGroups.id, name: friendGroups.name }).from(friendGroups).where(inArray(friendGroups.id, groupIdsNeeded))
        : Promise.resolve([]),
    ]);

    const groupNameMap = new Map<string, string>();
    for (const g of groupRows) groupNameMap.set(g.id, g.name);

    const teamMap = new Map(allTeams.map((t) => [t.id, t]));

    // Build serializable pending challenges for widget
    const pendingChallengeProps = (pendingChallengesRaw as Array<{
      id: string; stakeTokens: number; challengerName: string; challengedName: string;
      student1Id: string; student2Id: string; challengerTeamSide: number | null;
      matchDatetime: Date; team1Id: string | null; team2Id: string | null;
      team1Placeholder: string | null; team2Placeholder: string | null; groupId: string | null;
      student1Score1: number | null; student1Score2: number | null;
    }>).map((c) => {
      const t1 = c.team1Id ? teamMap.get(c.team1Id) : null;
      const t2 = c.team2Id ? teamMap.get(c.team2Id) : null;
      const n1 = t1 ? `${t1.flagEmoji} ${t1.name}` : (c.team1Placeholder ?? "TBD");
      const n2 = t2 ? `${t2.flagEmoji} ${t2.name}` : (c.team2Placeholder ?? "TBD");

      const isScore = c.student1Score1 !== null;
      const challengerId = isScore || !c.challengerTeamSide
        ? c.student1Id
        : (c.challengerTeamSide === 1 ? c.student1Id : c.student2Id);

      return {
        id: c.id,
        stakeTokens: c.stakeTokens,
        opponentName: c.student1Id === validSession?.user.id ? c.challengedName : c.challengerName,
        isSender: challengerId === validSession?.user.id,
        matchLabel: `${n1} vs ${n2}`,
        matchDatetime: c.matchDatetime.toISOString(),
        groupName: c.groupId ? (groupNameMap.get(c.groupId) ?? null) : null,
        student1Score1: c.student1Score1,
        student1Score2: c.student1Score2,
      };
    });

    const liveCount = todayMatches.filter((m) => m.status === "live").length;
    const upcomingCount = todayMatches.filter((m) => m.status === "upcoming").length;
    const nextMatchRawItem = nextMatchRaw[0] ?? null;
    const nextMatchObj = nextMatchRawItem
      ? {
          matchDatetime: nextMatchRawItem.matchDatetime.toISOString(),
          team1: nextMatchRawItem.team1Id ? (teamMap.get(nextMatchRawItem.team1Id) ?? null) : null,
          team2: nextMatchRawItem.team2Id ? (teamMap.get(nextMatchRawItem.team2Id) ?? null) : null,
        }
      : null;

    const myTeamId = validSession?.user.teamId;
    const myTeamRaw = myTeamId ? teamMap.get(myTeamId) ?? null : null;
    const myTeam = myTeamRaw
      ? { name: myTeamRaw.name, flagEmoji: myTeamRaw.flagEmoji, countryCode: myTeamRaw.countryCode }
      : null;

    return (
      <div className="space-y-6">
        <GuestConversionPrompt />
        {pendingChallengeProps.length > 0 && (
          <PendingChallengesModal challenges={pendingChallengeProps} />
        )}
        <TodayHero liveCount={liveCount} upcomingCount={upcomingCount} nextMatch={nextMatchObj} tokenBalance={validSession?.user.tokenBalance} myTeam={myTeam} isLoggedIn={!!validSession} />

        {/* Tournament winner pick — only for logged-in non-guests */}
        {validSession && !validSession.user.isGuest && (
          <TournamentPickBanner />
        )}

        {/* HOW TO PLAY ONBOARDING */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-sm">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
            <span>⚽</span> How to Play
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="font-bold text-green-600">1.</span>
              <span><strong>Predict:</strong> Guess the exact score to win 10x your stake, or just the correct winner for 2x.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-green-600">2.</span>
              <span><strong>Challenge:</strong> Bet your tokens against specific classmates, or hit the Open Market to take public bets.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-green-600">3.</span>
              <span><strong>Watch:</strong> RSVP to watch parties on the Watchmap to earn bonus tokens!</span>
            </li>
          </ul>
        </div>

        {/* Client component — uses useSession() so it always reflects true auth state */}
        <JoinBanner />
        <DevicePushPrompt />

        {validSession && !validSession.user.isGuest && !(validSession.user as any).notificationsOnboarded && (
          <NotificationOnboardingModal email={validSession.user.email!} />
        )}

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{liveCount > 0 ? "\uD83D\uDD34 Live now" : "Today's matches"}</h2>
          {(() => {
            const compiledMatches = todayMatches.map((match) => {
              const t1 = match.team1Id ? teamMap.get(match.team1Id) ?? null : null;
              const t2 = match.team2Id ? teamMap.get(match.team2Id) ?? null : null;

              const team1Supporters = match.team1Id !== null
                ? allStudents.filter((s) => s.teamId === match.team1Id && s.visibility !== "stealth")
                : [];
              const team2Supporters = match.team2Id !== null
                ? allStudents.filter((s) => s.teamId === match.team2Id && s.visibility !== "stealth")
                : [];

              const myPred = myPredictions.find((p) => p.matchId === match.id);
              const myInvite = todayInvites.find((i) => i.matchId === match.id && i.inviterId === validSession?.user.id);

              const myTeamId = validSession?.user.teamId;
              const isOnTeam1 = myTeamId != null && myTeamId === match.team1Id;
              const isOnTeam2 = myTeamId != null && myTeamId === match.team2Id;
              const opponentSupporters = isOnTeam1 ? team2Supporters : isOnTeam2 ? team1Supporters : [];
              const opponentIds = opponentSupporters.map((s) => s.id);
              const opponentInviteRaw = todayInvites.find((i) => i.matchId === match.id && opponentIds.includes(i.inviterId));
              const opponentInviter = opponentInviteRaw ? allStudents.find((s) => s.id === opponentInviteRaw.inviterId) : null;

              const fullMatch = {
                ...match,
                matchDatetime: match.matchDatetime.toISOString(),
                team1: t1 ? { id: t1.id, name: t1.name, flagEmoji: t1.flagEmoji } : null,
                team2: t2 ? { id: t2.id, name: t2.name, flagEmoji: t2.flagEmoji } : null,
              };

              return {
                match: fullMatch,
                team1Supporters: team1Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt ? new Date(s.lastSeenAt).toISOString() : null })),
                team2Supporters: team2Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt ? new Date(s.lastSeenAt).toISOString() : null })),
                prediction: myPred ? { predictedScore1: myPred.predictedScore1, predictedScore2: myPred.predictedScore2 } : null,
                myWatchInvite: myInvite ? { locationName: myInvite.locationName ?? "", locationUrl: myInvite.locationUrl } : null,
                opponentWatchInvite: opponentInviteRaw && opponentInviter
                  ? { locationName: opponentInviteRaw.locationName ?? "", locationUrl: opponentInviteRaw.locationUrl, inviterName: opponentInviter.name }
                  : null,
                watchCount: todayInvites.filter((i) => i.matchId === match.id).length,
              };
            });
            return <HomeTabsClient matches={compiledMatches} />;
          })()}
        </section>

        <div className="flex justify-center">
          <a href="/schedule" className="text-sm font-medium text-green-600 hover:text-green-700">View full schedule →</a>
        </div>
      </div>
    );
  } catch (e) {
    console.error("[home] render error", e);
    const err = e as Error;
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-left text-sm text-red-600 m-4 space-y-2">
        <p className="font-bold">Something went wrong loading the home page:</p>
        <p className="font-mono bg-red-100 p-2 rounded text-xs overflow-auto">{err?.message || String(e)}</p>
      </div>
    );
  }
}
