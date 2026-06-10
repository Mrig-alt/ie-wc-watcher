import { NextResponse } from "next/server";
import { db } from "@/db";
import { scorerPredictions, lineupPredictions, matches, students, teams, players } from "@/db/schema";
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
  // TheSportsDB free key is "1"; set SPORTSDB_API_KEY to a Patreon key if lineup endpoint requires it
  const sportsDbKey = process.env.SPORTSDB_API_KEY ?? "1";

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
      apiFootballFixtureId: matches.apiFootballFixtureId,
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
      for (const pred of matchScorerPreds) {
        const isCorrect = actualScorers.length > 0 && actualScorers.some((s) =>
          normalise(s).includes(normalise(pred.playerName)) ||
          normalise(pred.playerName).includes(normalise(s))
        );
        const position = positionMap.get(pred.playerId) ?? "FWD";
        const reward = isCorrect ? (SCORER_REWARDS[position] ?? 100) : 0;

        await db.update(scorerPredictions)
          .set({ isProcessed: true, isCorrect: actualScorers.length > 0 ? isCorrect : false })
          .where(eq(scorerPredictions.id, pred.predId));

        if (isCorrect) {
          await db.update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} + ${reward}` })
            .where(eq(students.id, pred.studentId));
        }
        scorerEvaluated++;
      }
    }

    // ── Lineup evaluation (TheSportsDB) ─────────────────────────────────────
    const matchLineupPreds = unprocessedLineups.filter((p) => p.matchId === match.id);
    if (matchLineupPreds.length === 0) continue;

    // Resolve TheSportsDB event ID (cached in apiFootballFixtureId column)
    let eventId = match.apiFootballFixtureId;
    if (!eventId) {
      eventId = await resolveSportsDbEventId(match.matchDatetime, t1Name, t2Name, sportsDbKey);
      if (eventId) {
        await db.update(matches).set({ apiFootballFixtureId: eventId }).where(eq(matches.id, match.id));
      }
    }

    if (!eventId) {
      // Can't evaluate lineup — skip, will retry next cron run
      continue;
    }

    const actualStarters = await fetchStartingXI(eventId, sportsDbKey);
    if (actualStarters.length === 0) continue;

    // Group lineup preds by student
    const byStudent = new Map<string, typeof matchLineupPreds>();
    for (const pred of matchLineupPreds) {
      if (!byStudent.has(pred.studentId)) byStudent.set(pred.studentId, []);
      byStudent.get(pred.studentId)!.push(pred);
    }

    for (const [studentId, preds] of byStudent) {
      let correct = 0;
      const predIds = preds.map((p) => p.predId);

      for (const pred of preds) {
        const isCorrect = actualStarters.some((s) =>
          normalise(s).includes(normalise(pred.playerName)) ||
          normalise(pred.playerName).includes(normalise(s))
        );
        await db.update(lineupPredictions)
          .set({ isProcessed: true, isCorrect })
          .where(eq(lineupPredictions.id, pred.predId));
        if (isCorrect) correct++;
        lineupEvaluated++;
      }

      const reward = correct * LINEUP_PER_PLAYER + (correct === 11 ? LINEUP_PERFECT_BONUS : 0);
      if (reward > 0) {
        await db.update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${reward}` })
          .where(eq(students.id, studentId));
      }
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

async function resolveSportsDbEventId(
  matchDatetime: Date,
  t1Name: string,
  t2Name: string,
  apiKey: string
): Promise<number | null> {
  try {
    const date = matchDatetime.toISOString().slice(0, 10);
    const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${date}&s=Soccer`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await res.json();
    const t1 = normalise(t1Name);
    const t2 = normalise(t2Name);
    for (const event of data?.events ?? []) {
      const home = normalise(event?.strHomeTeam ?? "");
      const away = normalise(event?.strAwayTeam ?? "");
      if (
        (home.includes(t1) || t1.includes(home)) &&
        (away.includes(t2) || t2.includes(away))
      ) {
        return Number(event.idEvent) || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchStartingXI(eventId: number, apiKey: string): Promise<string[]> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/lookupeventlineup.php?id=${eventId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.lineup ?? [])
      .filter((p: any) => p?.strSubstitute === "No")
      .map((p: any) => String(p?.strPlayer ?? ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalise(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
