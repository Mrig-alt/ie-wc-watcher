import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, players, teams } from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;

  const [match] = await db
    .select({ team1Id: matches.team1Id, team2Id: matches.team2Id })
    .from(matches).where(eq(matches.id, matchId)).limit(1);

  if (!match) return NextResponse.json({ players: [] });

  const teamIds = [match.team1Id, match.team2Id].filter(Boolean) as string[];
  if (teamIds.length === 0) return NextResponse.json({ players: [] });

  const [teamRows, playerRows] = await Promise.all([
    db.select({ id: teams.id, name: teams.name, flagEmoji: teams.flagEmoji })
      .from(teams).where(inArray(teams.id, teamIds)),
    db.select({ id: players.id, name: players.name, position: players.position, teamId: players.teamId })
      .from(players)
      .where(and(inArray(players.teamId, teamIds), eq(players.isActive, true)))
      .orderBy(asc(players.position), asc(players.name)),
  ]);

  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  const grouped = teamIds.map((teamId) => ({
    teamId,
    teamName: teamMap.get(teamId)?.name ?? "",
    flagEmoji: teamMap.get(teamId)?.flagEmoji ?? "",
    players: playerRows.filter((p) => p.teamId === teamId),
  }));

  return NextResponse.json({ teams: grouped });
}
