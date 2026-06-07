import { db } from "./src/db";
import { matches, predictions, bets } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const allMatches = await db.select().from(matches);
  const completedMatches = allMatches.filter(m => m.status === "completed");
  console.log("Completed matches:");
  for (const m of completedMatches) {
    console.log(`- Match ${m.id} | Score: ${m.team1Score}-${m.team2Score}`);
  }

  const allPreds = await db.select().from(predictions);
  console.log("\nPredictions:");
  for (const p of allPreds) {
    console.log(`- Pred ${p.id} | Match: ${p.matchId} | Score: ${p.predictedScore1}-${p.predictedScore2} | Earned: ${p.tokensEarned} | Settled: ${p.settled}`);
  }
  
  process.exit(0);
}
main().catch(console.error);
