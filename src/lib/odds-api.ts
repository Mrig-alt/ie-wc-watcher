import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq, isNotNull, inArray, and } from "drizzle-orm";

const ALIASES: Record<string, string[]> = {
  "United States": ["usa", "us"],
  "Türkiye": ["turkey", "turkiye"],
  "Korea Republic": ["south korea", "korea"],
  "IR Iran": ["iran"],
  "Netherlands": ["holland"],
  "Cabo Verde": ["cape verde"],
  "Czech Republic": ["czechia"],
  "Saudi Arabia": ["ksa"],
  "United Arab Emirates": ["uae"]
};

function matchesTeam(apiName: string, dbName: string) {
  const apiLower = apiName.toLowerCase();
  const dbLower = dbName.toLowerCase();
  if (apiLower.includes(dbLower) || dbLower.includes(apiLower)) return true;
  
  const aliases = ALIASES[dbName] || [];
  return aliases.some(alias => apiLower.includes(alias));
}

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
    if (!t1Name || !t2Name) continue;

    // Look for this match in Polymarket events
    let matchedEvent = polymarketEvents.find((e) => {
      const title = (e.title || "");
      return matchesTeam(title, t1Name) && matchesTeam(title, t2Name);
    });

    if (matchedEvent && matchedEvent.markets && matchedEvent.markets.length > 0) {
      // Find the main match winner market
      const market = matchedEvent.markets[0]; // Assuming first market is the main one
      if (market.outcomePrices && market.tokens) {
        // Find which token belongs to which team
        let t1Odds = null;
        let t2Odds = null;
        for (let i = 0; i < market.tokens.length; i++) {
          const token = market.tokens[i].name || "";
          const price = market.outcomePrices[i];
          if (matchesTeam(token, t1Name) || token.toLowerCase() === "yes") {
            // "Yes" usually implies the first team in the title if it's a binary market
            t1Odds = priceToOdds(price);
          }
          if (matchesTeam(token, t2Name) || token.toLowerCase() === "no") {
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
          if (!t1Name || !t2Name) continue;

          const oddsMatch = oddsData.find((o: any) => {
            const home = o.home_team;
            const away = o.away_team;
            return (matchesTeam(home, t1Name) && matchesTeam(away, t2Name)) || 
                   (matchesTeam(home, t2Name) && matchesTeam(away, t1Name));
          });

          if (oddsMatch && oddsMatch.bookmakers && oddsMatch.bookmakers.length > 0) {
            const h2h = oddsMatch.bookmakers[0].markets.find((m: any) => m.key === "h2h");
            if (h2h && h2h.outcomes) {
              const t1Outcome = h2h.outcomes.find((out: any) => matchesTeam(out.name, t1Name));
              const t2Outcome = h2h.outcomes.find((out: any) => matchesTeam(out.name, t2Name));
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

