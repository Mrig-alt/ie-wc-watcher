import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq, isNotNull, inArray, and } from "drizzle-orm";

export async function fetchAndSyncOdds() {
  const apiKey = process.env.ODDS_API_KEY;

  // Load our DB matches that are upcoming
  const upcomingMatches = await db
    .select({
      id: matches.id,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
    })
    .from(matches)
    .where(eq(matches.status, "upcoming"));

  if (upcomingMatches.length === 0) {
    return { success: true, message: "No upcoming matches to update." };
  }

  const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

  let updatedCount = 0;

  // 1. Fetch from Polymarket Gamma API
  const gammaUrl = `https://gamma-api.polymarket.com/events?closed=false`;
  let polymarketEvents: any[] = [];
  try {
    const pmRes = await fetch(gammaUrl);
    if (pmRes.ok) {
      polymarketEvents = await pmRes.json();
    }
  } catch (e) {
    console.error("Polymarket fetch failed", e);
  }

  // Helper to map share prices to odds
  const priceToOdds = (priceStr: string) => {
    const price = parseFloat(priceStr);
    if (!price || price <= 0 || price >= 1) return null;
    return parseFloat((1 / price).toFixed(2));
  };

  const matchesToFallback = [];

  for (const match of upcomingMatches) {
    if (!match.team1Id || !match.team2Id) continue;
    const t1Name = teamMap.get(match.team1Id);
    const t2Name = teamMap.get(match.team2Id);

    // Look for this match in Polymarket events
    let matchedEvent = polymarketEvents.find((e) => {
      const title = (e.title || "").toLowerCase();
      return title.includes(t1Name?.toLowerCase() || "") && title.includes(t2Name?.toLowerCase() || "");
    });

    if (matchedEvent && matchedEvent.markets && matchedEvent.markets.length > 0) {
      // Find the main match winner market
      const market = matchedEvent.markets[0]; // Assuming first market is the main one
      if (market.outcomePrices && market.tokens) {
        // Find which token belongs to which team
        let t1Odds = null;
        let t2Odds = null;
        for (let i = 0; i < market.tokens.length; i++) {
          const token = market.tokens[i].name?.toLowerCase() || "";
          const price = market.outcomePrices[i];
          if (token.includes(t1Name?.toLowerCase() || "") || token === "yes") {
            // "Yes" usually implies the first team in the title if it's a binary market
            t1Odds = priceToOdds(price);
          }
          if (token.includes(t2Name?.toLowerCase() || "") || token === "no") {
            t2Odds = priceToOdds(price);
          }
        }

        if (t1Odds && t2Odds) {
          await db
            .update(matches)
            .set({ team1Odds: t1Odds, team2Odds: t2Odds })
            .where(eq(matches.id, match.id));
          updatedCount++;
          continue;
        }
      }
    }

    matchesToFallback.push(match);
  }

  // 2. Fallback to The Odds API for matches not found on Polymarket
  if (matchesToFallback.length > 0 && apiKey) {
    const fallbackUrl = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
    try {
      const response = await fetch(fallbackUrl);
      if (response.ok) {
        const oddsData = await response.json();
        for (const match of matchesToFallback) {
          const t1Name = teamMap.get(match.team1Id!);
          const t2Name = teamMap.get(match.team2Id!);
          const oddsMatch = oddsData.find((o: any) => {
            const home = o.home_team.toLowerCase();
            const away = o.away_team.toLowerCase();
            const ourT1 = t1Name?.toLowerCase() || "";
            const ourT2 = t2Name?.toLowerCase() || "";
            return (home.includes(ourT1) && away.includes(ourT2)) || (home.includes(ourT2) && away.includes(ourT1));
          });

          if (oddsMatch && oddsMatch.bookmakers && oddsMatch.bookmakers.length > 0) {
            const h2h = oddsMatch.bookmakers[0].markets.find((m: any) => m.key === "h2h");
            if (h2h && h2h.outcomes) {
              const t1Outcome = h2h.outcomes.find((out: any) => out.name.toLowerCase().includes(t1Name?.toLowerCase() || ""));
              const t2Outcome = h2h.outcomes.find((out: any) => out.name.toLowerCase().includes(t2Name?.toLowerCase() || ""));
              if (t1Outcome && t2Outcome) {
                await db
                  .update(matches)
                  .set({ team1Odds: t1Outcome.price, team2Odds: t2Outcome.price })
                  .where(eq(matches.id, match.id));
                updatedCount++;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Fallback odds fetch failed", e);
    }
  }

  return { success: true, updatedCount };
}

