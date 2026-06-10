import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { students, teams, friendGroups, groupMembers } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { sendGroupJoinNotification } from "@/lib/push";
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
  const cookieStore = await cookies();
  let deviceId = cookieStore.get("deviceId")?.value;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    cookieStore.set("deviceId", deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    });
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, nationality, teamId, isHonoraryFan, visibility, leaderboardVisibility, pin, groupPin, isGuest, ref } = parsed.data;

  // If a groupPin is provided, verify the group exists before proceeding
  let groupToJoin = null;
  if (groupPin) {
    const [group] = await db
      .select()
      .from(friendGroups)
      .where(eq(friendGroups.inviteCode, groupPin.toUpperCase()))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Invalid group PIN" }, { status: 400 });
    }
    groupToJoin = group;
  }

  // PIN check: if JOIN_PIN is set, the supplied pin MUST match regardless of whether
  // the client sent a pin field. Omitting pin is not a bypass.
  // Exception: Guest users registering without a pin do not get verified yet.
  const joinPin = process.env.JOIN_PIN;
  if (!isGuest && joinPin && pin !== joinPin) {
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

  let student;
  try {
    student = await db.transaction(async (tx) => {
    // Re-check email inside the serializable transaction — catches race conditions
    // where two registrations with the same email arrive simultaneously.
    // The unique constraint would catch it anyway, but this gives a clean 409.
    const [dup] = await tx
      .select({ id: students.id })
      .from(students)
      .where(eq(students.email, email.toLowerCase()))
      .limit(1);
    if (dup) throw Object.assign(new Error("EMAIL_EXISTS"), { code: "EMAIL_EXISTS" });

    const [{ value: totalStudents }] = await tx
      .select({ value: count() })
      .from(students);

    let tokenBalance = 0;
    let earlyBirdAwarded = false;
    if (!isGuest) {
      tokenBalance = 1000;
      if (visibility === "public") tokenBalance += PUBLIC_BONUS_TOKENS;
      earlyBirdAwarded = totalStudents < EARLY_BIRD_LIMIT;
      if (earlyBirdAwarded) tokenBalance += EARLY_BIRD_BONUS_TOKENS;
    }

    const [created] = await tx
      .insert(students)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        nationality: nationality?.trim() ?? null,
        teamId: teamId ?? null,
        isHonoraryFan: isHonoraryFan ?? false,
        visibility,
        leaderboardVisibility,
        deviceId,
        tokenBalance,
        totalTokensReceived: tokenBalance, // Ensures initial net profit is 0
        isGuest: isGuest ?? false,
        referredBy: ref || null,
      })
      .returning();

    if (!isGuest && ref) {
      // Award 10 tokens to the referrer
      await tx.update(students)
        .set({
          tokenBalance: sql`${students.tokenBalance} + 10`,
          totalTokensReceived: sql`${students.totalTokensReceived} + 10`,
          referralTokensEarned: sql`${students.referralTokensEarned} + 10`
        })
        .where(eq(students.id, ref));
    }

    if (!isGuest && earlyBirdAwarded) {
      const [{ value: postInsertCount }] = await tx
        .select({ value: count() })
        .from(students);

      if (postInsertCount > EARLY_BIRD_LIMIT) {
        await tx
          .update(students)
          .set({
            tokenBalance: sql`${students.tokenBalance} - ${EARLY_BIRD_BONUS_TOKENS}`,
          })
          .where(eq(students.id, created.id));

        created.tokenBalance -= EARLY_BIRD_BONUS_TOKENS;
      }
    }

    if (groupToJoin) {
      await tx.insert(groupMembers).values({
        groupId: groupToJoin.id,
        studentId: created.id,
        tokenBalance: 1000, // Fixed starting balance in a group
      });
    }

    return { created, groupToJoin };
  }, { isolationLevel: "serializable" });
  } catch (e: any) {
    if (e.code === "EMAIL_EXISTS" || e.code === "23505") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    throw e;
  }

  if (student.groupToJoin) {
    sendGroupJoinNotification(student.groupToJoin.id, student.created.name, student.created.id).catch(console.error);
  }

  return NextResponse.json({ student: student.created }, { status: 201 });
}
