import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams, connections } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import StudentCard from "@/components/students/StudentCard";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  try {
    const session = await auth();
    const validSession = session?.user?.id ? session : null;

    // Get accepted friend IDs if logged in
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

    const allStudents = await db
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
      .orderBy(students.name);

    // Filter by visibility
    const visible = allStudents.filter((s) => {
      if (s.visibility === "public") return true;
      if (!validSession) return false;
      if (s.id === validSession.user.id) return true;
      if (s.visibility === "friends") return friendIds.has(s.id);
      return false; // stealth
    });

    const byCountry = new Map<string, typeof visible>();
    for (const s of visible) {
      const key = s.teamCode ?? "no-team";
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(s);
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classmates</h1>
          <p className="text-sm text-gray-500 mt-1">{visible.length} classmates visible</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <StudentCard
              key={s.id}
              student={{
                id: s.id,
                name: s.name,
                nationality: s.nationality,
                isHonoraryFan: s.isHonoraryFan,
                tokenBalance: s.tokenBalance,
                lastSeenAt: s.lastSeenAt,
                team: s.teamName ? { name: s.teamName, flagEmoji: s.teamFlag!, countryCode: s.teamCode! } : null,
              }}
            />
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">
            No classmates visible yet. Be the first to join!
          </p>
        )}
      </div>
    );
  } catch (e) {
    // FIX: log full error server-side only — never expose stack/message in HTML
    console.error("[students] render error", e);
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600 m-4">
        Something went wrong loading classmates. Please refresh or try again shortly.
      </div>
    );
  }
}
