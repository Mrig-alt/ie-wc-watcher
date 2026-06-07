import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams, connections, matches } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import ClassmatesPageClient from "@/components/students/ClassmatesPageClient";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  try {
    const session = await auth();
    const validSession = session?.user?.id ? session : null;

    // Accepted friend IDs — use two separate indexed queries instead of OR
    // (OR on two UUID columns can't use individual indexes efficiently)
    let friendIds = new Set<string>();
    if (validSession) {
      const uid = validSession.user.id;
      const [asRequester, asRequestee] = await Promise.all([
        db
          .select({ requesteeId: connections.requesteeId })
          .from(connections)
          .where(and(eq(connections.requesterId, uid), eq(connections.status, "accepted"))),
        db
          .select({ requesterId: connections.requesterId })
          .from(connections)
          .where(and(eq(connections.requesteeId, uid), eq(connections.status, "accepted"))),
      ]);
      for (const c of asRequester) friendIds.add(c.requesteeId);
      for (const c of asRequestee) friendIds.add(c.requesterId);
    }

    const [allStudents, allTeams, upcomingMatches] = await Promise.all([
      db
        .select({
          id: students.id,
          name: students.name,
          nationality: students.nationality,
          isHonoraryFan: students.isHonoraryFan,
          tokenBalance: students.tokenBalance,
          visibility: students.visibility,
          lastSeenAt: students.lastSeenAt,
          teamId: students.teamId,
          teamName: teams.name,
          teamFlag: teams.flagEmoji,
          teamCode: teams.countryCode,
        })
        .from(students)
        .leftJoin(teams, eq(students.teamId, teams.id))
        .where(and(eq(students.flagged, false), eq(students.isGuest, false), isNull(students.deletedAt)))
        .orderBy(students.name),

      db
        .select({ id: teams.id, name: teams.name, flagEmoji: teams.flagEmoji })
        .from(teams),

      db
        .select({
          id: matches.id,
          team1Id: matches.team1Id,
          team2Id: matches.team2Id,
          team1Placeholder: matches.team1Placeholder,
          team2Placeholder: matches.team2Placeholder,
          matchDatetime: matches.matchDatetime,
          team1Odds: matches.team1Odds,
          team2Odds: matches.team2Odds,
        })
        .from(matches)
        .where(eq(matches.status, "upcoming"))
        .orderBy(asc(matches.matchDatetime)),
    ]);

    // Filter by visibility
    const visible = allStudents.filter((s) => {
      if (s.visibility === "public") return true;
      if (!validSession) return false;
      if (s.id === validSession.user.id) return true;
      if (s.visibility === "friends") return friendIds.has(s.id);
      return false; // stealth
    });

    const mappedStudents = visible.map((s) => ({
      id: s.id,
      name: s.name,
      nationality: s.nationality,
      isHonoraryFan: s.isHonoraryFan,
      tokenBalance: s.tokenBalance,
      lastSeenAt: s.lastSeenAt,
      team: s.teamName ? { name: s.teamName, flagEmoji: s.teamFlag!, countryCode: s.teamCode! } : null,
    }));

    return (
      <Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading classmates...</div>}>
        <ClassmatesPageClient
          students={mappedStudents}
          upcomingMatches={upcomingMatches}
          teams={allTeams}
          currentUserId={validSession?.user.id ?? null}
          currentUserTokenBalance={validSession?.user.tokenBalance ?? 0}
        />
      </Suspense>
    );
  } catch (e) {
    console.error("[students] render error", e);
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600 m-4">
        Something went wrong loading classmates. Please refresh or try again shortly.
      </div>
    );
  }
}
