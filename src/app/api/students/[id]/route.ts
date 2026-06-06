import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, count, sql, and, isNull } from "drizzle-orm";
import { updateStudentSchema } from "@/lib/validations";
import {
  PUBLIC_BONUS_TOKENS,
  EARLY_BIRD_BONUS_TOKENS,
  EARLY_BIRD_LIMIT,
} from "@/lib/tokens";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session || session.user.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockAt = process.env.LOCK_TEAMS_AT
    ? new Date(process.env.LOCK_TEAMS_AT)
    : new Date("2026-06-11T00:00:00Z");

  const body = await req.json();
  const parsed = updateStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { teamId, isHonoraryFan, visibility, pin } = parsed.data;

  if (teamId !== undefined && new Date() > lockAt) {
    return NextResponse.json(
      { error: "Team selection is locked" },
      { status: 403 }
    );
  }

  // Fetch current student record
  const [currentStudent] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, id), isNull(students.deletedAt)))
    .limit(1);

  if (!currentStudent) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const joinPin = process.env.JOIN_PIN;
  const upgradingFromGuest = currentStudent.isGuest && pin !== undefined;

  if (currentStudent.isGuest && !upgradingFromGuest) {
    return NextResponse.json(
      { error: "Guests cannot update profile settings. Verify your class PIN first." },
      { status: 403 }
    );
  }

  if (upgradingFromGuest) {
    if (joinPin && pin !== joinPin) {
      return NextResponse.json({ error: "Incorrect class PIN" }, { status: 400 });
    }

    const updated = await db.transaction(async (tx) => {
      const [{ value: totalActiveStudents }] = await tx
        .select({ value: count() })
        .from(students)
        .where(eq(students.isGuest, false));

      let tokenBalance = 100;
      const effectiveVisibility = visibility !== undefined ? visibility : currentStudent.visibility;
      if (effectiveVisibility === "public") tokenBalance += PUBLIC_BONUS_TOKENS;
      const earlyBirdAwarded = totalActiveStudents < EARLY_BIRD_LIMIT;
      if (earlyBirdAwarded) tokenBalance += EARLY_BIRD_BONUS_TOKENS;

      const updates: Partial<typeof students.$inferInsert> = {
        isGuest: false,
        tokenBalance: tokenBalance,
      };
      if (teamId !== undefined) updates.teamId = teamId;
      if (isHonoraryFan !== undefined) updates.isHonoraryFan = isHonoraryFan;
      if (visibility !== undefined) updates.visibility = visibility;

      const [res] = await tx
        .update(students)
        .set(updates)
        .where(eq(students.id, id))
        .returning();

      if (earlyBirdAwarded) {
        const [{ value: postInsertCount }] = await tx
          .select({ value: count() })
          .from(students)
          .where(eq(students.isGuest, false));

        if (postInsertCount > EARLY_BIRD_LIMIT) {
          await tx
            .update(students)
            .set({
              tokenBalance: sql`${students.tokenBalance} - ${EARLY_BIRD_BONUS_TOKENS}`,
            })
            .where(eq(students.id, id));
          res.tokenBalance -= EARLY_BIRD_BONUS_TOKENS;
        }
      }
      return res;
    });

    return NextResponse.json({ student: updated });
  }

  const updates: Partial<typeof students.$inferInsert> = {};
  if (teamId !== undefined) updates.teamId = teamId;
  if (isHonoraryFan !== undefined) updates.isHonoraryFan = isHonoraryFan;
  if (visibility !== undefined) updates.visibility = visibility;

  const [updated] = await db
    .update(students)
    .set(updates)
    .where(eq(students.id, id))
    .returning();

  return NextResponse.json({ student: updated });
}
