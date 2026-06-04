import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchWCMatches, mapApiStatus } from "@/lib/football-api";
import { settleBetsForMatch, settlePredictionsForMatch } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // CRON_SECRET is REQUIRED — if not set, the endpoint is locked down entirely.
  // This prevents unauthenticated score syncing and bet/prediction settlement.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET env var not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }

  const apiMatches = await fetchWCMatches();
  if (!apiMatches.length) {
    return NextResponse.json({ synced: 0 });
  }

  const allTeams = await db.select({ id: teams.id, countryCode: teams.countryCode }).from(teams);
  const teamByCode: Record<string, string> = {};
  for (const t of allTeams) teamByCode[t.countryCode] = t.id;

  let synced = 0;
  let settled = 0;

  for (const am of apiMatches) {
    const newStatus = mapApiStatus(am.status);
    const score1 = am.score.fullTime.home;
    const score2 = am.score.fullTime.away;

    const resolvedStatus =
      newStatus === "completed" && (score1 === null || score2 === null) ? "live" : newStatus;

    const [existingByExtId] = await db
      .select()
      .from(matches)
      .where(eq(matches.externalId, am.id))
      .limit(1);

    if (existingByExtId) {
      const wasCompleted = existingByExtId.status === "completed";
      const scoresNowAvailable =
        wasCompleted &&
        (existingByExtId.team1Score === null || existingByExtId.team2Score === null) &&
        score1 !== null && score2 !== null;

      await db
        .update(matches)
        .set({ status: resolvedStatus, team1Score: score1, team2Score: score2 })
        .where(eq(matches.id, existingByExtId.id));

      if ((!wasCompleted && resolvedStatus === "completed") || scoresNowAvailable) {
        await settleBetsForMatch(existingByExtId.id);
        await settlePredictionsForMatch(existingByExtId.id);
        settled++;
      }
      synced++;
      continue;
    }

    const tla1 = am.homeTeam.tla?.toUpperCase();
    const tla2 = am.awayTeam.tla?.toUpperCase();
    if (!tla1 || !tla2) continue;
    const team1Id = teamByCode[tla1];
    const team2Id = teamByCode[tla2];
    if (!team1Id || !team2Id) continue;

    const [existingByTeams] = await db
      .select()
      .from(matches)
      .where(and(eq(matches.team1Id, team1Id), eq(matches.team2Id, team2Id)))
      .limit(1);

    if (existingByTeams) {
      const wasCompleted = existingByTeams.status === "completed";
      const scoresNowAvailable =
        wasCompleted &&
        (existingByTeams.team1Score === null || existingByTeams.team2Score === null) &&
        score1 !== null && score2 !== null;

      await db
        .update(matches)
        .set({ externalId: am.id, status: resolvedStatus, team1Score: score1, team2Score: score2 })
        .where(eq(matches.id, existingByTeams.id));

      if ((!wasCompleted && resolvedStatus === "completed") || scoresNowAvailable) {
        await settleBetsForMatch(existingByTeams.id);
        await settlePredictionsForMatch(existingByTeams.id);
        settled++;
      }
      synced++;
    }
  }

  return NextResponse.json({ synced, settled });
}
