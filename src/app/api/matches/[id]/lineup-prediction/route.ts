import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { lineupPredictions, matches, players } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/matches/[id]/lineup-prediction — fetch user's current picks for this match
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ picks: [] });
  const { id: matchId } = await params;

  const picks = await db
    .select({ playerId: lineupPredictions.playerId, playerName: lineupPredictions.playerName, position: lineupPredictions.position })
    .from(lineupPredictions)
    .where(and(eq(lineupPredictions.studentId, session.user.id), eq(lineupPredictions.matchId, matchId)));

  return NextResponse.json({ picks });
}

// POST /api/matches/[id]/lineup-prediction — save full XI (replaces previous picks)
// body: { playerIds: string[] }  — exactly 11 player IDs
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isGuest) return NextResponse.json({ error: "Guests cannot predict" }, { status: 403 });

  const { id: matchId } = await params;
  const { playerIds } = await req.json() as { playerIds: string[] };

  if (!Array.isArray(playerIds) || playerIds.length !== 11) {
    return NextResponse.json({ error: "Must select exactly 11 players" }, { status: 400 });
  }

  const [match] = await db
    .select({ status: matches.status, matchDatetime: matches.matchDatetime, team1Id: matches.team1Id, team2Id: matches.team2Id })
    .from(matches).where(eq(matches.id, matchId)).limit(1);

  if (!match || match.status !== "upcoming") {
    return NextResponse.json({ error: "Match not available" }, { status: 400 });
  }
  const cutoff = new Date(new Date(match.matchDatetime).getTime() - 30 * 60 * 1000);
  if (new Date() >= cutoff) {
    return NextResponse.json({ error: "Prediction window closed" }, { status: 400 });
  }

  // Verify all players belong to one of the two teams
  const validTeamIds = [match.team1Id, match.team2Id].filter(Boolean) as string[];
  const playerRows = await db
    .select({ id: players.id, name: players.name, position: players.position, teamId: players.teamId })
    .from(players)
    .where(and(inArray(players.id, playerIds), inArray(players.teamId, validTeamIds)));

  if (playerRows.length !== 11) {
    return NextResponse.json({ error: "Invalid player selection" }, { status: 400 });
  }

  // Delete existing picks and re-insert atomically
  await db.transaction(async (tx) => {
    await tx.delete(lineupPredictions).where(
      and(eq(lineupPredictions.studentId, session.user.id), eq(lineupPredictions.matchId, matchId))
    );
    await tx.insert(lineupPredictions).values(
      playerRows.map((p) => ({
        studentId: session.user.id,
        matchId,
        playerId: p.id,
        playerName: p.name,
        position: p.position,
      }))
    );
  });

  return NextResponse.json({ success: true });
}
