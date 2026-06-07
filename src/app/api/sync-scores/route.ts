import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { fetchWCMatches, fetchGlobalMatches, mapApiStatus } from "@/lib/football-api";
import { settleBetsForMatch, settlePredictionsForMatch } from "@/lib/tokens";

export const dynamic = "force-dynamic";



export async function GET(req: Request) {
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

  const result = await db.execute(sql`SELECT pg_try_advisory_lock(1)`);
  const lockAcquired = (result as any).rows 
    ? (result as any).rows[0].pg_try_advisory_lock 
    : (result as any)[0]?.pg_try_advisory_lock;

  if (!lockAcquired) {
    return NextResponse.json({ skipped: true, reason: "sync already in progress" }, { status: 200 });
  }
  try {
    const apiMatchesWC = await fetchWCMatches();
    const apiMatchesGlobal = await fetchGlobalMatches();
    const apiMatches = [...apiMatchesWC, ...apiMatchesGlobal];
    
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
      const pen1 = am.score.penalties?.home ?? null;
      const pen2 = am.score.penalties?.away ?? null;

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
          .set({ status: resolvedStatus, team1Score: score1, team2Score: score2, team1Penalties: pen1, team2Penalties: pen2 })
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
      const team1Id = tla1 ? teamByCode[tla1] : null;
      const team2Id = tla2 ? teamByCode[tla2] : null;

      if (!team1Id || !team2Id) {
        // Global match with teams not in our DB
        await db.insert(matches).values({
          externalId: am.id,
          team1Placeholder: am.homeTeam.name,
          team2Placeholder: am.awayTeam.name,
          matchDatetime: new Date(am.utcDate),
          status: resolvedStatus,
          stage: "global",
          team1Score: score1,
          team2Score: score2,
        });
        synced++;
        continue;
      }

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
          .set({ externalId: am.id, status: resolvedStatus, team1Score: score1, team2Score: score2, team1Penalties: pen1, team2Penalties: pen2 })
          .where(eq(matches.id, existingByTeams.id));

        if ((!wasCompleted && resolvedStatus === "completed") || scoresNowAvailable) {
          await settleBetsForMatch(existingByTeams.id);
          await settlePredictionsForMatch(existingByTeams.id);
          settled++;
        }
        synced++;
      } else {
        // New WC match
        await db.insert(matches).values({
          externalId: am.id,
          team1Id,
          team2Id,
          matchDatetime: new Date(am.utcDate),
          status: resolvedStatus,
          stage: "friendly", // Default for new non-group matches
          team1Score: score1,
          team2Score: score2,
        });
        synced++;
      }
    }

    return NextResponse.json({ synced, settled });
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(1)`);
  }
}
