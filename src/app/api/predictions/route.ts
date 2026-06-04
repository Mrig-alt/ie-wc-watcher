import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { predictions, matches, bets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { predictionSchema } from "@/lib/validations";
import { STAKE_TOKENS } from "@/lib/tokens";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = predictionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { matchId, predictedScore1, predictedScore2 } = parsed.data;

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "upcoming") {
    return NextResponse.json({ error: "Predictions locked" }, { status: 403 });
  }

  const [pred] = await db
    .insert(predictions)
    .values({
      studentId: session.user.id,
      matchId,
      predictedScore1,
      predictedScore2,
    })
    .onConflictDoUpdate({
      target: [predictions.studentId, predictions.matchId],
      set: { predictedScore1, predictedScore2 },
    })
    .returning();

  return NextResponse.json({ prediction: pred }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
