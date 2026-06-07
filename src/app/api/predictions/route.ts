import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { predictions, matches, predictionHistory, students } from "@/db/schema";
import { eq, and, count, isNull, sql } from "drizzle-orm";
import { predictionSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, session.user.id), isNull(students.deletedAt)))
    .limit(1);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isGuest) {
    return NextResponse.json({ error: "Guests cannot submit predictions. Verify your class PIN first." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = predictionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { matchId, predictedScore1, predictedScore2, stakeTokens } = parsed.data;

  try {
    const pred = await db.transaction(async (tx) => {
      const [match] = await tx
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .for("update")
        .limit(1);

      if (!match) throw new Error("MATCH_NOT_FOUND");
      const cutoffTime = new Date(match.matchDatetime.getTime() - 30 * 60 * 1000); // 30 minutes before
      if (new Date() >= cutoffTime) {
        throw new Error("LOCKED_TIME_LIMIT");
      }
      if (match.status !== "upcoming") {
        throw new Error("LOCKED_STATUS");
      }

      // Get existing prediction if any
      const [existingPrediction] = await tx
        .select()
        .from(predictions)
        .where(and(eq(predictions.studentId, session.user.id), eq(predictions.matchId, matchId)))
        .limit(1);

      const oldStake = existingPrediction?.stakeTokens ?? 0;
      const stakeDelta = stakeTokens - oldStake;
      
      const isUpdate = !!existingPrediction;
      const isChanged =
        isUpdate &&
        (existingPrediction.predictedScore1 !== predictedScore1 ||
          existingPrediction.predictedScore2 !== predictedScore2 ||
          existingPrediction.stakeTokens !== stakeTokens);

      if (stakeDelta > 0) {
        const [liveStudent] = await tx
          .select({ tokenBalance: students.tokenBalance })
          .from(students)
          .where(eq(students.id, session.user.id))
          .for("update")
          .limit(1);
        if (!liveStudent || liveStudent.tokenBalance < stakeDelta) {
          throw new Error("INSUFFICIENT_FUNDS");
        }
      }

      if (isChanged) {
        // Check prediction history count
        const [historyResult] = await tx
          .select({ value: count() })
          .from(predictionHistory)
          .where(
            and(
              eq(predictionHistory.studentId, session.user.id),
              eq(predictionHistory.matchId, matchId)
            )
          );

        const historyCount = historyResult?.value ?? 0;
        if (historyCount >= 10) {
          throw new Error("TOO_MANY_EDITS");
        }
      }

      if (stakeDelta !== 0) {
        await tx
          .update(students)
          .set({ 
            tokenBalance: sql`${students.tokenBalance} - ${stakeDelta}`,
            escrowTokens: sql`${students.escrowTokens} + ${stakeDelta}`
          })
          .where(eq(students.id, session.user.id));
      }

      const [predRow] = await tx
        .insert(predictions)
        .values({
          studentId: session.user.id,
          matchId,
          predictedScore1,
          predictedScore2,
          stakeTokens,
        })
        .onConflictDoUpdate({
          target: [predictions.studentId, predictions.matchId],
          set: { predictedScore1, predictedScore2, stakeTokens, updatedAt: new Date() },
        })
        .returning();

      if (isChanged) {
        await tx.insert(predictionHistory).values({
          predictionId: predRow.id,
          studentId: session.user.id,
          matchId,
          oldScore1: existingPrediction.predictedScore1,
          oldScore2: existingPrediction.predictedScore2,
          newScore1: predictedScore1,
          newScore2: predictedScore2,
        });
      }

      return predRow;
    });

    return NextResponse.json({ prediction: pred }, { status: 201 });
  } catch (e: any) {
    if (e.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Insufficient tokens for this stake" }, { status: 400 });
    }
    if (e.message === "MATCH_NOT_FOUND") {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (e.message === "LOCKED_TIME_LIMIT") {
      return NextResponse.json({ error: "Predictions are locked — 30-minute lockout reached!" }, { status: 403 });
    }
    if (e.message === "LOCKED_STATUS") {
      return NextResponse.json({ error: "Predictions locked" }, { status: 403 });
    }
    if (e.message === "TOO_MANY_EDITS") {
      return NextResponse.json({ error: "Too many edits for this match. Limit is 10 edits." }, { status: 429 });
    }
    throw e;
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, session.user.id), isNull(students.deletedAt)))
    .limit(1);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  const query = db
    .select()
    .from(predictions)
    .where(
      matchId
        ? and(eq(predictions.studentId, session.user.id), eq(predictions.matchId, matchId))
        : eq(predictions.studentId, session.user.id)
    );

  const results = await query;
  return NextResponse.json({ predictions: results });
}
