import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scorerPredictions, matches, players } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/scorer-predictions?matchIds=id1,id2
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ predictions: [] });

  const url = new URL(req.url);
  const matchIds = url.searchParams.get("matchIds")?.split(",").filter(Boolean) ?? [];
  if (matchIds.length === 0) return NextResponse.json({ predictions: [] });

  const rows = await db
    .select({ matchId: scorerPredictions.matchId, playerId: scorerPredictions.playerId, playerName: scorerPredictions.playerName })
    .from(scorerPredictions)
    .where(and(eq(scorerPredictions.studentId, session.user.id), inArray(scorerPredictions.matchId, matchIds)));

  return NextResponse.json({ predictions: rows });
}

// POST /api/scorer-predictions  { matchId, playerId, playerName }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isGuest) return NextResponse.json({ error: "Guests cannot predict" }, { status: 403 });

  const body = await req.json();
  const { matchId, playerId, playerName } = body as { matchId: string; playerId: string; playerName: string };
  if (!matchId || !playerId || !playerName) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Verify match is still upcoming and cutoff hasn't passed
  const [match] = await db.select({ status: matches.status, matchDatetime: matches.matchDatetime })
    .from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match || match.status !== "upcoming") return NextResponse.json({ error: "Match not available" }, { status: 400 });

  const cutoff = new Date(new Date(match.matchDatetime).getTime() - 30 * 60 * 1000);
  if (new Date() >= cutoff) return NextResponse.json({ error: "Prediction window closed" }, { status: 400 });

  // Verify player exists
  const [player] = await db.select({ id: players.id }).from(players).where(eq(players.id, playerId)).limit(1);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 400 });

  await db.insert(scorerPredictions)
    .values({ studentId: session.user.id, matchId, playerId, playerName })
    .onConflictDoUpdate({
      target: [scorerPredictions.studentId, scorerPredictions.matchId],
      set: { playerId, playerName, isCorrect: null, isProcessed: false },
    });

  return NextResponse.json({ success: true });
}
