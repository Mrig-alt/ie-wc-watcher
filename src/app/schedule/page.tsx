import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matches, teams, students, predictions, watchInvites } from "@/db/schema";
import { eq, asc, inArray, gte, or, and } from "drizzle-orm";
import { stageLabel, formatMatchDate, getMadridTodayRange } from "@/lib/utils";
import { getCachedTeams, getCachedActiveStudents } from "@/db/queries";
import { calculateGroupStandings } from "@/lib/standings";
import GroupStandingsTable from "@/components/standings/GroupStandingsTable";
import ScheduleMatchesList from "@/components/matches/ScheduleMatchesList";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  try {
    const { tab } = await searchParams;
    const isGroups = tab === "groups";

    const session = await auth();
    const validSession = session?.user?.id ? session : null;

    const { start: todayStart } = getMadridTodayRange();

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
        team1Odds: matches.team1Odds,
        team2Odds: matches.team2Odds,
        team1Id: matches.team1Id,
        team2Id: matches.team2Id,
      })
      .from(matches)
      .where(gte(matches.matchDatetime, todayStart))
      .orderBy(asc(matches.matchDatetime));

    const allMatchesForStandings = isGroups ? await db.select().from(matches) : [];

    const [allStudents, allTeams] = await Promise.all([
      getCachedActiveStudents(),
      getCachedTeams(),
    ]);
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
    const initialGrouped = Array.from(grouped.entries()).map(([day, matches]) => ({
      day,
      matches,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournament</h1>
          <p className="text-sm text-gray-500 mt-1">Track matches and view the live group standings</p>
        </div>

        <div className="flex gap-2 rounded-xl bg-gray-100 p-1 mb-6 max-w-[400px]">
          <Link href="/schedule" className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors ${!isGroups ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Matches
          </Link>
          <Link href="/schedule?tab=groups" className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors ${isGroups ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Groups
          </Link>
        </div>

        {isGroups ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map(groupLetter => {
              const groupTeams = allTeams.filter(t => t.group === groupLetter);
              if (groupTeams.length === 0) return null;
              const stats = calculateGroupStandings(groupLetter, allMatchesForStandings, groupTeams);
              return <GroupStandingsTable key={groupLetter} groupName={groupLetter} stats={stats} />;
            })}
          </div>
        ) : (
          <ScheduleMatchesList
            allMatches={allMatches}
            allStudents={allStudents}
            allTeams={allTeams}
            validSession={validSession}
            myPredictions={myPredictions}
            allInvites={allInvites}
            initialGrouped={initialGrouped}
          />
        )}
      </div>
    );
  } catch (e) {
    console.error("[schedule] render error", e);
    const err = e as Error;
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-left text-sm text-red-600 m-4 space-y-2">
        <p className="font-bold">Something went wrong loading the schedule:</p>
        <p className="font-mono bg-red-100 p-2 rounded text-xs overflow-auto">{err?.message || String(e)}</p>
        {err?.stack && (
          <pre className="font-mono bg-red-100 p-2 rounded text-xs overflow-auto max-h-40">{err.stack}</pre>
        )}
      </div>
    );
  }
}
