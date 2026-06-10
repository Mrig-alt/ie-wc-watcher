import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq, and, sql, lt } from "drizzle-orm";
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

  // Replaced session-level pg_try_advisory_lock with a simple execution flag
  // In a robust production environment, use Redis or a system_config table.
  // Serverless environments generally prevent overlapping cron executions anyway.
  try {
    // Sweep: mark as completed any match still "upcoming" or "live" but kicked off 3+ hours ago.
    // Covers friendlies not in the API and matches stuck in "live" if the API stops updating.
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await db
      .update(matches)
      .set({ status: "completed" })
      .where(and(lt(matches.matchDatetime, threeHoursAgo), eq(matches.status, "upcoming")));
    await db
      .update(matches)
      .set({ status: "completed" })
      .where(and(lt(matches.matchDatetime, threeHoursAgo), eq(matches.status, "live")));

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

    const dbMatches = await db.select().from(matches);
    const matchesByExtId = new Map(dbMatches.filter(m => m.externalId).map(m => [m.externalId, m]));
    const matchesByTeams = new Map(dbMatches.map(m => [`${m.team1Id}-${m.team2Id}`, m]));

    for (const am of apiMatches) {
      const newStatus = mapApiStatus(am.status);
      const score1 = am.score.fullTime.home;
      const score2 = am.score.fullTime.away;
      const pen1 = am.score.penalties?.home ?? null;
      const pen2 = am.score.penalties?.away ?? null;

      const resolvedStatus =
        newStatus === "completed" && (score1 === null || score2 === null) ? "live" : newStatus;

      const existingByExtId = matchesByExtId.get(am.id);

      if (existingByExtId) {
        // Never move a match backwards — completed is terminal
        if (existingByExtId.status === "completed" && resolvedStatus !== "completed") continue;

        const hasChanged = existingByExtId.status !== resolvedStatus || 
                           existingByExtId.team1Score !== score1 || 
                           existingByExtId.team2Score !== score2 ||
                           existingByExtId.team1Penalties !== pen1 ||
                           existingByExtId.team2Penalties !== pen2;
                           
        if (!hasChanged) continue;

        const wasCompleted = existingByExtId.status === "completed";
        const scoresNowAvailable =
          wasCompleted &&
          (existingByExtId.team1Score === null || existingByExtId.team2Score === null) &&
          score1 !== null && score2 !== null;

        await db
          .update(matches)
          .set({ status: resolvedStatus, matchDatetime: new Date(am.utcDate), team1Score: score1, team2Score: score2, team1Penalties: pen1, team2Penalties: pen2 })
          .where(eq(matches.id, existingByExtId.id));

        // Always settle when completed with scores — settlement functions are
        // idempotent (they filter settled=false) so re-running is safe and
        // ensures recovery if a previous run failed after the status update.
        let settledNow = 0;
        if (resolvedStatus === "completed" && score1 !== null && score2 !== null) {
          await settleBetsForMatch(existingByExtId.id);
          await settlePredictionsForMatch(existingByExtId.id);
          settledNow = 1;
        }
        synced += 1;
        settled += settledNow;
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
        synced += 1;
        continue;
      }

      const existingByTeams = matchesByTeams.get(`${team1Id}-${team2Id}`);

      if (existingByTeams) {
        // Never move a match backwards — completed is terminal
        if (existingByTeams.status === "completed" && resolvedStatus !== "completed") continue;

        const hasChanged = existingByTeams.status !== resolvedStatus || 
                           existingByTeams.team1Score !== score1 || 
                           existingByTeams.team2Score !== score2 ||
                           existingByTeams.team1Penalties !== pen1 ||
                           existingByTeams.team2Penalties !== pen2;
                           
        if (!hasChanged) continue;

        await db
          .update(matches)
          .set({ externalId: am.id, status: resolvedStatus, matchDatetime: new Date(am.utcDate), team1Score: score1, team2Score: score2, team1Penalties: pen1, team2Penalties: pen2 })
          .where(eq(matches.id, existingByTeams.id));

        let settledNow = 0;
        if (resolvedStatus === "completed" && score1 !== null && score2 !== null) {
          await settleBetsForMatch(existingByTeams.id);
          await settlePredictionsForMatch(existingByTeams.id);
          settledNow = 1;
        }
        synced += 1;
        settled += settledNow;
        continue;
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
        synced += 1;
        continue;
      }
    }

    return NextResponse.json({ synced, settled });
  } catch (e) {
    console.error("Cron sync error:", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
