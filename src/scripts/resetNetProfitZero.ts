import { db } from "../db/index";
import { students, tokenLedger } from "../db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("Recalculating totalTokensReceived so Net Profit perfectly reflects wins/losses...");
  
  const allStudents = await db.select({
    id: students.id,
    tokenBalance: students.tokenBalance,
    ledgerSum: sql`COALESCE((SELECT SUM(amount) FROM token_ledger WHERE student_id = students.id), 0)`.mapWith(Number),
    predictionsEarned: sql`COALESCE((SELECT SUM(tokens_earned) FROM predictions WHERE student_id = students.id), 0)`.mapWith(Number),
    predictionsStaked: sql`COALESCE((SELECT SUM(stake_tokens) FROM predictions WHERE student_id = students.id), 0)`.mapWith(Number)
  }).from(students).where(eq(students.isGuest, false));
  
  let updatedCount = 0;
  for (const s of allStudents) {
    // True profit = (tokens won from predictions) - (tokens staked on predictions) + (ledger sum, e.g. bets placed/won)
    // Actually, tokenLedger ONLY has bet_placed and bet_accepted (-70, -10) right now.
    // So true profit = ledgerSum + predictionsEarned - predictionsStaked
    const trueProfit = s.ledgerSum + s.predictionsEarned - s.predictionsStaked;
    
    // We want: tokenBalance - totalTokensReceived = trueProfit
    // So: totalTokensReceived = tokenBalance - trueProfit
    const correctTotalReceived = s.tokenBalance - trueProfit;
    
    await db.update(students)
      .set({ totalTokensReceived: correctTotalReceived })
      .where(eq(students.id, s.id));
      
    updatedCount++;
  }
  
  console.log(`Updated ${updatedCount} students. Net Profits are now perfectly accurate.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
