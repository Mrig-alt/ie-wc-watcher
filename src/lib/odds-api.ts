import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq, isNotNull, inArray, and } from "drizzle-orm";

export async function fetchAndSyncOdds() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.log("No ODDS_API_KEY provided, skipping odds sync.");
    return { success: false, reason: "no_api_key" };
  }

  // Fetch upcoming matches from The Odds API
  // Using soccer_fifa_world_cup as the standard sport key for WC
  const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch odds:", errorText);
      return { success: false, reason: "api_error" };
    }

    const oddsData = await response.json();
    if (!Array.isArray(oddsData)) {
      return { success: false, reason: "invalid_response" };
    }

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

    // Get team names to map against The Odds API
    const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);
    const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

    let updatedCount = 0;

    for (const match of upcomingMatches) {
      if (!match.team1Id || !match.team2Id) continue;

      const t1Name = teamMap.get(match.team1Id);
      const t2Name = teamMap.get(match.team2Id);

      // Find matching game in oddsData
      // Note: Team names might differ slightly (e.g., "USA" vs "United States")
      // A robust implementation would use a fuzzy match or a manual alias map.
      // For this implementation, we will look for substring matches.
      const oddsMatch = oddsData.find((o) => {
        const home = o.home_team.toLowerCase();
        const away = o.away_team.toLowerCase();
        const ourT1 = t1Name?.toLowerCase() || "";
        const ourT2 = t2Name?.toLowerCase() || "";
        return (
          (home.includes(ourT1) || ourT1.includes(home)) &&
          (away.includes(ourT2) || ourT2.includes(away))
        ) || (
          (home.includes(ourT2) || ourT2.includes(home)) &&
          (away.includes(ourT1) || ourT1.includes(away))
        );
      });

      if (oddsMatch && oddsMatch.bookmakers && oddsMatch.bookmakers.length > 0) {
        // Grab the first bookmaker's h2h market
        const h2h = oddsMatch.bookmakers[0].markets.find((m: any) => m.key === "h2h");
        if (h2h && h2h.outcomes) {
          const t1Outcome = h2h.outcomes.find((out: any) => 
            out.name.toLowerCase().includes(t1Name?.toLowerCase() || "") ||
            (t1Name?.toLowerCase() || "").includes(out.name.toLowerCase())
          );
          const t2Outcome = h2h.outcomes.find((out: any) => 
            out.name.toLowerCase().includes(t2Name?.toLowerCase() || "") ||
            (t2Name?.toLowerCase() || "").includes(out.name.toLowerCase())
          );

          if (t1Outcome && t2Outcome) {
            await db
              .update(matches)
              .set({
                team1Odds: t1Outcome.price,
                team2Odds: t2Outcome.price,
              })
              .where(eq(matches.id, match.id));
            updatedCount++;
          }
        }
      }
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error("Error in fetchAndSyncOdds:", error);
    return { success: false, reason: "exception" };
  }
}
