import { NextResponse } from "next/server";
import { db } from "@/db";
import { scorerPredictions, matches, students, teams } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) return NextResponse.json({ error: "SERPAPI_KEY not configured" }, { status: 503 });

  // Find unprocessed predictions for completed matches
  const unprocessed = await db
    .select({
      matchId: scorerPredictions.matchId,
      studentId: scorerPredictions.studentId,
      playerId: scorerPredictions.playerId,
      playerName: scorerPredictions.playerName,
      predId: scorerPredictions.id,
    })
    .from(scorerPredictions)
    .where(eq(scorerPredictions.isProcessed, false));

  if (unprocessed.length === 0) return NextResponse.json({ success: true, evaluated: 0 });

  const uniqueMatchIds = [...new Set(unprocessed.map((p) => p.matchId))];

  // Fetch completed matches only
  const completedMatches = await db
    .select({ id: matches.id, team1Id: matches.team1Id, team2Id: matches.team2Id, status: matches.status })
    .from(matches)
    .where(and(inArray(matches.id, uniqueMatchIds), eq(matches.status, "completed")));

  if (completedMatches.length === 0) return NextResponse.json({ success: true, evaluated: 0 });

  const completedIds = new Set(completedMatches.map((m) => m.id));
  const allTeamIds = [...new Set(completedMatches.flatMap((m) => [m.team1Id, m.team2Id].filter(Boolean) as string[]))];
  const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, allTeamIds));
  const teamMap = new Map(teamRows.map((t) => [t.id, t.name]));

  let evaluated = 0;
  let rewarded = 0;

  for (const match of completedMatches) {
    const matchPreds = unprocessed.filter((p) => p.matchId === match.id);
    if (matchPreds.length === 0) continue;

    const t1Name = match.team1Id ? teamMap.get(match.team1Id) ?? "" : "";
    const t2Name = match.team2Id ? teamMap.get(match.team2Id) ?? "" : "";
    const query = `${t1Name} vs ${t2Name} World Cup 2026 result scorers`;

    let actualScorers: string[] = [];
    try {
      const serpUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
      const serpRes = await fetch(serpUrl, { signal: AbortSignal.timeout(15000) });
      if (serpRes.ok) {
        const data = await serpRes.json();
        actualScorers = extractScorers(data);
      }
    } catch {
      // SerpAPI failed — skip this match, will retry next cron run
      continue;
    }

    const predIds = matchPreds.map((p) => p.predId);

    if (actualScorers.length === 0) {
      // No scorer data found — mark as processed but incorrect (no award)
      await db.update(scorerPredictions)
        .set({ isProcessed: true, isCorrect: false })
        .where(inArray(scorerPredictions.id, predIds));
      evaluated += matchPreds.length;
      continue;
    }

    for (const pred of matchPreds) {
      const isCorrect = actualScorers.some((scorer) =>
        normalise(scorer).includes(normalise(pred.playerName)) ||
        normalise(pred.playerName).includes(normalise(scorer))
      );

      await db.update(scorerPredictions)
        .set({ isProcessed: true, isCorrect })
        .where(eq(scorerPredictions.id, pred.predId));

      if (isCorrect) {
        await db.update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + 100` })
          .where(eq(students.id, pred.studentId));
        rewarded++;
      }
      evaluated++;
    }
  }

  return NextResponse.json({ success: true, evaluated, rewarded });
}

function extractScorers(data: any): string[] {
  const scorers: string[] = [];
  try {
    const spotlight = data?.sports_results?.game_spotlight;
    if (spotlight?.teams) {
      for (const team of spotlight.teams) {
        if (Array.isArray(team.scorers)) {
          for (const s of team.scorers) {
            // Strip minute: "Nico Williams 34'" → "Nico Williams"
            const name = String(s).replace(/\s*\d+['']?\s*(pen\.?|og\.?)?\s*$/i, "").trim();
            if (name) scorers.push(name);
          }
        }
      }
    }
    // Fallback: some responses use games array
    const games = data?.sports_results?.games ?? [];
    for (const game of games) {
      for (const team of game?.teams ?? []) {
        for (const s of team?.scorers ?? []) {
          const name = String(s).replace(/\s*\d+['']?\s*(pen\.?|og\.?)?\s*$/i, "").trim();
          if (name) scorers.push(name);
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return [...new Set(scorers)];
}

function normalise(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
