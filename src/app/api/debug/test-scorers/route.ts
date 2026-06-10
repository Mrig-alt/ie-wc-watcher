import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Test endpoint: GET /api/debug/test-scorers?t1=England&t2=Costa+Rica
// Returns raw SerpAPI response + extracted scorer names. No DB writes.
// Remove or gate behind auth before going to production.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const t1 = searchParams.get("t1") ?? "England";
  const t2 = searchParams.get("t2") ?? "Costa Rica";

  const key = process.env.SERPAPI_KEY;
  if (!key) {
    return NextResponse.json({ error: "SERPAPI_KEY not set in environment" }, { status: 503 });
  }

  const query = `${t1} vs ${t2} World Cup 2026 result scorers`;
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${key}`;

  let raw: any = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    raw = await res.json();
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  // Extract scorers using same logic as the cron
  const extracted: string[] = [];
  try {
    const spotlight = raw?.sports_results?.game_spotlight;
    for (const team of spotlight?.teams ?? []) {
      for (const s of team?.scorers ?? []) {
        const name = String(s).replace(/\s*\d+['']?\s*(pen\.?|og\.?)?\s*$/i, "").trim();
        if (name) extracted.push(name);
      }
    }
    for (const game of raw?.sports_results?.games ?? []) {
      for (const team of game?.teams ?? []) {
        for (const s of team?.scorers ?? []) {
          const name = String(s).replace(/\s*\d+['']?\s*(pen\.?|og\.?)?\s*$/i, "").trim();
          if (name) extracted.push(name);
        }
      }
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    query,
    extractedScorers: [...new Set(extracted)],
    // Include the relevant slice of the raw response for debugging
    sports_results: raw?.sports_results ?? null,
    search_metadata: raw?.search_metadata ?? null,
  });
}
