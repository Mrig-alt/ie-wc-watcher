import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams, connections, matches } from "@/db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import ClassmatesPageClient from "@/components/students/ClassmatesPageClient";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  try {
    const session = await auth();
    const validSession = session?.user?.id ? session : null;

    // Accepted friend IDs
    let friendIds = new Set<string>();
    if (validSession) {
      const myConnections = await db
        .select({ requesterId: connections.requesterId, requesteeId: connections.requesteeId })
        .from(connections)
        .where(
          and(
            eq(connections.status, "accepted"),
            or(
              eq(connections.requesterId, validSession.user.id),
              eq(connections.requesteeId, validSession.user.id)
            )
          )
        );
      for (const c of myConnections) {
        if (c.requesterId !== validSession.user.id) friendIds.add(c.requesterId);
        if (c.requesteeId !== validSession.user.id) friendIds.add(c.requesteeId);
      }
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
        .where(eq(students.flagged, false))
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
      <ClassmatesPageClient
        students={mappedStudents}
        upcomingMatches={upcomingMatches}
        teams={allTeams}
        currentUserId={validSession?.user.id ?? null}
        currentUserTokenBalance={validSession?.user.tokenBalance ?? 0}
      />
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
