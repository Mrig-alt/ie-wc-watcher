import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matches, teams, students, predictions, watchInvites } from "@/db/schema";
import { eq, and, gte, lte, asc, inArray } from "drizzle-orm";
import TodayHero from "@/components/matches/TodayHero";
import MatchCardClient from "@/components/matches/MatchCardClient";
import JoinBanner from "@/components/home/JoinBanner";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const session = await auth();
    const validSession = session?.user?.id ? session : null;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const todayMatches = await db
      .select({
        id: matches.id, matchDatetime: matches.matchDatetime, status: matches.status,
        stage: matches.stage, groupName: matches.groupName,
        team1Score: matches.team1Score, team2Score: matches.team2Score,
        venue: matches.venue, city: matches.city,
        team1Placeholder: matches.team1Placeholder, team2Placeholder: matches.team2Placeholder,
        team1Id: matches.team1Id, team2Id: matches.team2Id,
      })
      .from(matches)
      .where(and(gte(matches.matchDatetime, todayStart), lte(matches.matchDatetime, todayEnd)))
      .orderBy(asc(matches.matchDatetime));

    const allTeams = await db.select().from(teams);
    const teamMap = new Map(allTeams.map((t) => [t.id, t]));

    const allStudents = await db
      .select({ id: students.id, name: students.name, teamId: students.teamId, visibility: students.visibility, lastSeenAt: students.lastSeenAt })
      .from(students)
      .where(eq(students.flagged, false));

    const myPredictions = validSession
      ? await db.select().from(predictions).where(eq(predictions.studentId, validSession.user.id))
      : [];

    const todayMatchIds = todayMatches.map((m) => m.id);
    const todayInvites =
      todayMatchIds.length > 0
        ? await db
            .select({
              inviterId: watchInvites.inviterId,
              matchId: watchInvites.matchId,
              locationName: watchInvites.locationName,
              locationUrl: watchInvites.locationUrl,
            })
            .from(watchInvites)
            .where(inArray(watchInvites.matchId, todayMatchIds))
        : [];

    const liveCount = todayMatches.filter((m) => m.status === "live").length;
    const upcomingCount = todayMatches.filter((m) => m.status === "upcoming").length;
    const nextMatchRaw = todayMatches.find((m) => m.status === "upcoming") ?? null;
    const nextMatch = nextMatchRaw
      ? {
          matchDatetime: nextMatchRaw.matchDatetime,
          team1: nextMatchRaw.team1Id ? (teamMap.get(nextMatchRaw.team1Id) ?? null) : null,
          team2: nextMatchRaw.team2Id ? (teamMap.get(nextMatchRaw.team2Id) ?? null) : null,
        }
      : null;

    return (
      <div className="space-y-6">
        <TodayHero liveCount={liveCount} upcomingCount={upcomingCount} nextMatch={nextMatch} tokenBalance={validSession?.user.tokenBalance} />

        {/* Client component — uses useSession() so it always reflects true auth state */}
        <JoinBanner />

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{liveCount > 0 ? "\uD83D\uDD34 Live now" : "Today's matches"}</h2>
          {todayMatches.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No matches today — check the schedule for upcoming games.</p>
          ) : (
            <div className="space-y-3">
              {todayMatches.map((match) => {
                const t1 = match.team1Id ? teamMap.get(match.team1Id) ?? null : null;
                const t2 = match.team2Id ? teamMap.get(match.team2Id) ?? null : null;

                const team1Supporters = match.team1Id !== null
                  ? allStudents.filter((s) => s.teamId === match.team1Id && s.visibility !== "stealth")
                  : [];
                const team2Supporters = match.team2Id !== null
                  ? allStudents.filter((s) => s.teamId === match.team2Id && s.visibility !== "stealth")
                  : [];

                // Server-side predictions only available if auth() worked;
                // MatchCardClient will also re-check client-side for personalised actions.
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
                  team1: t1 ? { id: t1.id, name: t1.name, flagEmoji: t1.flagEmoji } : null,
                  team2: t2 ? { id: t2.id, name: t2.name, flagEmoji: t2.flagEmoji } : null,
                };

                return (
                  <MatchCardClient
                    key={match.id}
                    match={fullMatch as Parameters<typeof MatchCardClient>[0]["match"]}
                    team1Supporters={team1Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt }))}
                    team2Supporters={team2Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt }))}
                    prediction={myPred ? { predictedScore1: myPred.predictedScore1, predictedScore2: myPred.predictedScore2 } : null}
                    myWatchInvite={myInvite ? { locationName: myInvite.locationName ?? "", locationUrl: myInvite.locationUrl } : null}
                    opponentWatchInvite={
                      opponentInviteRaw && opponentInviter
                        ? { locationName: opponentInviteRaw.locationName ?? "", locationUrl: opponentInviteRaw.locationUrl, inviterName: opponentInviter.name }
                        : null
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        <div className="flex justify-center">
          <a href="/schedule" className="text-sm font-medium text-green-600 hover:text-green-700">View full schedule →</a>
        </div>
      </div>
    );
  } catch (e) {
    console.error("[home] render error", e);
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600 m-4">
        Something went wrong loading the home page. Please refresh or try again shortly.
      </div>
    );
  }
}
