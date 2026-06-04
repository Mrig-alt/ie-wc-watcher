import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teams } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { registerSchema } from "@/lib/validations";
import {
  PUBLIC_BONUS_TOKENS,
  EARLY_BIRD_BONUS_TOKENS,
  EARLY_BIRD_LIMIT,
} from "@/lib/tokens";

export async function GET() {
  const [{ value: studentCount }] = await db.select({ value: count() }).from(students);

  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      flagEmoji: teams.flagEmoji,
      countryCode: teams.countryCode,
      group: teams.group,
      confederation: teams.confederation,
      takenBy: sql<string | null>`(SELECT name FROM students WHERE team_id = ${teams.id} LIMIT 1)`,
    })
    .from(teams)
    .orderBy(teams.group, teams.name);

  return NextResponse.json({
    teams: allTeams,
    count: studentCount,
    pinRequired: !!process.env.JOIN_PIN,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, nationality, teamId, isHonoraryFan, visibility, pin } = parsed.data;

  // PIN check: if JOIN_PIN is set, the supplied pin MUST match regardless of whether
  // the client sent a pin field. Omitting pin is not a bypass.
  const joinPin = process.env.JOIN_PIN;
  if (joinPin && pin !== joinPin) {
    return NextResponse.json({ error: "Incorrect class PIN" }, { status: 403 });
  }

  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const lockAt = process.env.LOCK_TEAMS_AT
    ? new Date(process.env.LOCK_TEAMS_AT)
    : new Date("2026-06-11T00:00:00Z");

  if (teamId && new Date() > lockAt) {
    return NextResponse.json(
      { error: "Team selection is locked — tournament has started" },
      { status: 403 }
    );
  }

  if (teamId) {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    if (!team) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 });
    }
  }

  const [{ value: totalStudents }] = await db
    .select({ value: count() })
    .from(students);

  let tokenBalance = 100;
  if (visibility === "public") tokenBalance += PUBLIC_BONUS_TOKENS;
  if (totalStudents < EARLY_BIRD_LIMIT) tokenBalance += EARLY_BIRD_BONUS_TOKENS;

  const [student] = await db
    .insert(students)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      nationality: nationality?.trim() ?? null,
      teamId: teamId ?? null,
      isHonoraryFan: isHonoraryFan ?? false,
      visibility,
      tokenBalance,
    })
    .returning();

  return NextResponse.json({ student }, { status: 201 });
}
