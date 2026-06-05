import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matches, teams, students, predictions, watchInvites } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import MatchCard from "@/components/matches/MatchCard";
import { stageLabel, formatMatchDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  try {
    const session = await auth();
    const validSession = session?.user?.id ? session : null;

    const allMatches = await db
      .select({
        id: matches.id,
        matchDatetime: matches.matchDatetime,
        status: matches.status,
        stage: matches.stage,
        groupName: matches.groupName,
        team1Score: matches.team1Score,
        team2Score: matches.team2Score,
        venue: matches.venue,
        city: matches.city,
        team1Placeholder: matches.team1Placeholder,
        team2Placeholder: matches.team2Placeholder,
        team1Id: matches.team1Id,
        team2Id: matches.team2Id,
      })
      .from(matches)
      .orderBy(asc(matches.matchDatetime));

    const allStudents = await db
      .select({ id: students.id, name: students.name, teamId: students.teamId, visibility: students.visibility, lastSeenAt: students.lastSeenAt })
      .from(students)
      .where(eq(students.flagged, false));

    const allTeams = await db.select().from(teams);
    const teamMap = new Map(allTeams.map((t) => [t.id, t]));

    const myPredictions = validSession
      ? await db.select().from(predictions).where(eq(predictions.studentId, validSession.user.id))
      : [];

    const allMatchIds = allMatches.map((m) => m.id);
    const allInvites =
      validSession && allMatchIds.length > 0
        ? await db
            .select({
              id: watchInvites.id,
              matchId: watchInvites.matchId,
              inviterId: watchInvites.inviterId,
              venueId: watchInvites.venueId,
              locationName: watchInvites.locationName,
              locationUrl: watchInvites.locationUrl,
            })
            .from(watchInvites)
            .where(inArray(watchInvites.matchId, allMatchIds))
        : [];

    const grouped = new Map<string, typeof allMatches>();
    for (const m of allMatches) {
      const day = formatMatchDate(m.matchDatetime);
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day)!.push(m);
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Full Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">All matches — friendlies, group stage, and knockout</p>
        </div>

        {Array.from(grouped.entries()).map(([day, dayMatches]) => (
          <section key={day}>
            <h2 className="text-base font-semibold text-gray-700 mb-3 sticky top-14 bg-gray-50 py-1">{day}</h2>
            <div className="space-y-3">
              {dayMatches.map((match) => {
                const t1 = match.team1Id ? teamMap.get(match.team1Id) ?? null : null;
                const t2 = match.team2Id ? teamMap.get(match.team2Id) ?? null : null;

                // FIX: guard null teamId — null===null would match all teamless
                // students to every TBD knockout slot (same bug fixed on home page)
                const team1Supporters = match.team1Id !== null
                  ? allStudents.filter((s) => s.teamId === match.team1Id && s.visibility !== "stealth")
                  : [];
                const team2Supporters = match.team2Id !== null
                  ? allStudents.filter((s) => s.teamId === match.team2Id && s.visibility !== "stealth")
                  : [];

                const myPred = myPredictions.find((p) => p.matchId === match.id);
                const myInvite = allInvites.find((i) => i.matchId === match.id && i.inviterId === validSession?.user.id);

                const myTeamId = validSession?.user.teamId;
                // FIX: same null guard for isOnTeam checks
                const isOnTeam1 = myTeamId !== null && myTeamId !== undefined && myTeamId === match.team1Id;
                const isOnTeam2 = myTeamId !== null && myTeamId !== undefined && myTeamId === match.team2Id;
                const opponentTeamSupporters = isOnTeam1 ? team2Supporters : isOnTeam2 ? team1Supporters : [];
                const opponentInviteRaw = allInvites.find(
                  (i) => i.matchId === match.id && opponentTeamSupporters.map((s) => s.id).includes(i.inviterId)
                );
                const opponentInviter = opponentInviteRaw
                  ? allStudents.find((s) => s.id === opponentInviteRaw.inviterId)
                  : null;

                const fullMatch = {
                  ...match,
                  team1: t1 ? { id: t1.id, name: t1.name, flagEmoji: t1.flagEmoji } : null,
                  team2: t2 ? { id: t2.id, name: t2.name, flagEmoji: t2.flagEmoji } : null,
                };

                return (
                  <MatchCard
                    key={match.id}
                    match={fullMatch as Parameters<typeof MatchCard>[0]["match"]}
                    team1Supporters={team1Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt }))}
                    team2Supporters={team2Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt }))}
                    currentUserId={validSession?.user.id}
                    currentUserTeamId={validSession?.user.teamId}
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
          </section>
        ))}
      </div>
    );
  } catch (e) {
    // FIX: log full error server-side only — never expose stack/message in HTML
    console.error("[schedule] render error", e);
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600 m-4">
        Something went wrong loading the schedule. Please refresh or try again shortly.
      </div>
    );
  }
}
