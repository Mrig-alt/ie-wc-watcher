import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams, connections } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const log: string[] = [];
  const timings: Record<string, number> = {};

  const t = () => Date.now();

  try {
    log.push("1. Calling auth()");
    const t0 = t();
    const session = await auth();
    if (process.env.NODE_ENV !== "development" && session?.user?.email !== process.env.ADMIN_EMAIL) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    timings.auth = t() - t0;
    const validSession = session?.user?.id ? session : null;
    log.push(`2. auth() done in ${timings.auth}ms — userId: ${validSession?.user?.id ?? "none"}`);

    if (validSession) {
      log.push("3. Querying connections (with OR)");
      const t1 = t();
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
      timings.connections = t() - t1;
      log.push(`4. connections done in ${timings.connections}ms — count: ${myConnections.length}`);
    } else {
      log.push("3. Skipped connections (no session)");
    }

    log.push("5. Querying students (with leftJoin teams, flagged filter, orderBy name)");
    const t2 = t();
    const allStudents = await db
      .select({
        id: students.id,
        name: students.name,
        visibility: students.visibility,
        flagged: students.flagged,
        teamName: teams.name,
      })
      .from(students)
      .leftJoin(teams, eq(students.teamId, teams.id))
      .where(eq(students.flagged, false))
      .orderBy(students.name);
    timings.students = t() - t2;
    log.push(`6. students done in ${timings.students}ms — count: ${allStudents.length}`);

    log.push("7. Querying teams");
    const t3 = t();
    const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);
    timings.teams = t() - t3;
    log.push(`8. teams done in ${timings.teams}ms — count: ${allTeams.length}`);

    log.push("9. All done!");

    return NextResponse.json({ success: true, log, timings });
  } catch (e) {
    return NextResponse.json({ success: false, log, error: String(e), stack: (e as Error)?.stack });
  }
}
