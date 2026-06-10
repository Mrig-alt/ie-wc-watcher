import { NextResponse } from "next/server";
import { db } from "@/db";
import { scorerPredictions, lineupPredictions, matches, students, teams, players, tokenLedger } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Position-based scorer rewards — rarer = more tokens
const SCORER_REWARDS: Record<string, number> = {
  FWD: 50,
  MID: 100,
  DEF: 175,
  GK: 250,
};

// Lineup: 20 tokens per correct starter, 100 bonus for all 11 correct
const LINEUP_PER_PLAYER = 20;
const LINEUP_PERFECT_BONUS = 100;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serpApiKey = process.env.SERPAPI_KEY;
  const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;

  // Find completed matches with unprocessed predictions
  const [unprocessedScorers, unprocessedLineups] = await Promise.all([
    db.select({
      matchId: scorerPredictions.matchId,
      studentId: scorerPredictions.studentId,
      playerId: scorerPredictions.playerId,
      playerName: scorerPredictions.playerName,
      predId: scorerPredictions.id,
    }).from(scorerPredictions).where(eq(scorerPredictions.isProcessed, false)),
    db.select({
      matchId: lineupPredictions.matchId,
      studentId: lineupPredictions.studentId,
      playerId: lineupPredictions.playerId,
      playerName: lineupPredictions.playerName,
      position: lineupPredictions.position,
      predId: lineupPredictions.id,
    }).from(lineupPredictions).where(eq(lineupPredictions.isProcessed, false)),
  ]);

  const allUnprocessedMatchIds = [
    ...new Set([
      ...unprocessedScorers.map((p) => p.matchId),
      ...unprocessedLineups.map((p) => p.matchId),
    ]),
  ];

  if (allUnprocessedMatchIds.length === 0) return NextResponse.json({ success: true, scorerEvaluated: 0, lineupEvaluated: 0 });

  const completedMatches = await db
    .select({
      id: matches.id,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
      matchDatetime: matches.matchDatetime,
      externalId: matches.externalId,
    })
    .from(matches)
    .where(and(inArray(matches.id, allUnprocessedMatchIds), eq(matches.status, "completed")));

  if (completedMatches.length === 0) return NextResponse.json({ success: true, scorerEvaluated: 0, lineupEvaluated: 0 });

  const allTeamIds = [...new Set(completedMatches.flatMap((m) => [m.team1Id, m.team2Id].filter(Boolean) as string[]))];
  const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, allTeamIds));
  const teamMap = new Map(teamRows.map((t) => [t.id, t.name]));

  // Fetch position for scorer predictions (need to look up from players table)
  const scorerPlayerIds = [...new Set(unprocessedScorers.map((p) => p.playerId))];
  const playerPositions = scorerPlayerIds.length > 0
    ? await db.select({ id: players.id, position: players.position }).from(players).where(inArray(players.id, scorerPlayerIds))
    : [];
  const positionMap = new Map(playerPositions.map((p) => [p.id, p.position]));

  let scorerEvaluated = 0;
  let lineupEvaluated = 0;

  for (const match of completedMatches) {
    const t1Name = match.team1Id ? teamMap.get(match.team1Id) ?? "" : "";
    const t2Name = match.team2Id ? teamMap.get(match.team2Id) ?? "" : "";

    // ── Scorer evaluation (SerpAPI) ──────────────────────────────────────────
    const matchScorerPreds = unprocessedScorers.filter((p) => p.matchId === match.id);
    if (matchScorerPreds.length > 0 && serpApiKey) {
      const actualScorers = await fetchScorersSerpApi(t1Name, t2Name, serpApiKey);
      // If SerpAPI returned no scorers, skip — don't mark as processed; retry next cron run.
      // This prevents permanently marking predictions incorrect on a transient API failure.
      if (actualScorers.length > 0) {
        await db.transaction(async (tx) => {
          for (const pred of matchScorerPreds) {
            const isCorrect = actualScorers.some((s) =>
              normalise(s).includes(normalise(pred.playerName)) ||
              normalise(pred.playerName).includes(normalise(s))
            );
            const position = positionMap.get(pred.playerId) ?? "FWD";
            const reward = isCorrect ? (SCORER_REWARDS[position] ?? 100) : 0;

            await tx.update(scorerPredictions)
              .set({ isProcessed: true, isCorrect })
              .where(eq(scorerPredictions.id, pred.predId));

            if (isCorrect) {
              await tx.update(students)
                .set({
                  tokenBalance: sql`${students.tokenBalance} + ${reward}`,
                  totalTokensReceived: sql`${students.totalTokensReceived} + ${reward}`,
                })
                .where(eq(students.id, pred.studentId));
              await tx.insert(tokenLedger).values({
                studentId: pred.studentId,
                amount: reward,
                reason: "scorer_prediction_correct",
                matchId: match.id,
              });
            }
            scorerEvaluated++;
          }
        });
      }
    }

    // ── Lineup evaluation (football-data.org) ───────────────────────────────
    const matchLineupPreds = unprocessedLineups.filter((p) => p.matchId === match.id);
    if (matchLineupPreds.length === 0 || !footballDataKey || !match.externalId) continue;

    const actualStarters = await fetchStartingXI(match.externalId, footballDataKey);
    if (actualStarters.length === 0) continue;

    // Group lineup preds by student
    const byStudent = new Map<string, typeof matchLineupPreds>();
    for (const pred of matchLineupPreds) {
      if (!byStudent.has(pred.studentId)) byStudent.set(pred.studentId, []);
      byStudent.get(pred.studentId)!.push(pred);
    }

    for (const [studentId, preds] of byStudent) {
      await db.transaction(async (tx) => {
        let correct = 0;
        for (const pred of preds) {
          const isCorrect = actualStarters.some((s) =>
            normalise(s).includes(normalise(pred.playerName)) ||
            normalise(pred.playerName).includes(normalise(s))
          );
          await tx.update(lineupPredictions)
            .set({ isProcessed: true, isCorrect })
            .where(eq(lineupPredictions.id, pred.predId));
          if (isCorrect) correct++;
          lineupEvaluated++;
        }

        const reward = correct * LINEUP_PER_PLAYER + (correct === 11 ? LINEUP_PERFECT_BONUS : 0);
        if (reward > 0) {
          await tx.update(students)
            .set({
              tokenBalance: sql`${students.tokenBalance} + ${reward}`,
              totalTokensReceived: sql`${students.totalTokensReceived} + ${reward}`,
            })
            .where(eq(students.id, studentId));
          await tx.insert(tokenLedger).values({
            studentId,
            amount: reward,
            reason: "lineup_prediction_reward",
            matchId: match.id,
          });
        }
      });
    }
  }

  return NextResponse.json({ success: true, scorerEvaluated, lineupEvaluated });
}

async function fetchScorersSerpApi(t1: string, t2: string, key: string): Promise<string[]> {
  try {
    const query = `${t1} vs ${t2} World Cup 2026 result scorers`;
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    return extractScorers(data);
  } catch {
    return [];
  }
}

function extractScorers(data: any): string[] {
  const scorers: string[] = [];
  try {
    const spotlight = data?.sports_results?.game_spotlight;
    for (const team of spotlight?.teams ?? []) {
      for (const s of team?.scorers ?? []) {
        const name = String(s).replace(/\s*\d+['']?\s*(pen\.?|og\.?)?\s*$/i, "").trim();
        if (name) scorers.push(name);
      }
    }
    for (const game of data?.sports_results?.games ?? []) {
      for (const team of game?.teams ?? []) {
        for (const s of team?.scorers ?? []) {
          const name = String(s).replace(/\s*\d+['']?\s*(pen\.?|og\.?)?\s*$/i, "").trim();
          if (name) scorers.push(name);
        }
      }
    }
  } catch { /* ignore */ }
  return [...new Set(scorers)];
}

async function fetchStartingXI(externalId: number, apiKey: string): Promise<string[]> {
  try {
    const url = `https://api.football-data.org/v4/matches/${externalId}`;
    const res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const starters: string[] = [];
    for (const side of ["homeTeam", "awayTeam"] as const) {
      for (const player of data?.[side]?.lineup ?? []) {
        if (player?.name) starters.push(player.name);
      }
    }
    return starters;
  } catch {
    return [];
  }
}

function normalise(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
