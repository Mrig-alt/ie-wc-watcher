import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

const lockAt = process.env.LOCK_TEAMS_AT
  ? new Date(process.env.LOCK_TEAMS_AT)
  : new Date("2026-06-11T00:00:00Z");

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [student] = await db
    .select({ tournamentPickTeamId: students.tournamentPickTeamId })
    .from(students)
    .where(eq(students.id, session.user.id))
    .limit(1);

  return NextResponse.json({ teamId: student?.tournamentPickTeamId ?? null });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (new Date() > lockAt) {
    return NextResponse.json({ error: "Tournament has started — picks are locked" }, { status: 403 });
  }

  const { teamId } = await req.json();

  if (teamId) {
    const [team] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  await db
    .update(students)
    .set({ tournamentPickTeamId: teamId ?? null })
    .where(eq(students.id, session.user.id));

  return NextResponse.json({ success: true });
}
