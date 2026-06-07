import { db } from "../db/index";
import { students, tokenLedger } from "../db/schema";
import { eq, inArray, sql } from "drizzle-orm";

async function main() {
  console.log("Recalculating totalTokensReceived from token_ledger...");
  
  // 1. Reset everyone to 100 base
  await db.update(students).set({ totalTokensReceived: 100 }).where(eq(students.isGuest, false));
  
  // 2. Find all system awards in token_ledger
  // "daily_replenish", "admin_award", "survey_reward", "referral_bonus", "admin_penalty"
  
  const systemAwards = await db.select({
    studentId: tokenLedger.studentId,
    totalAwarded: sql`sum(${tokenLedger.amount})`.mapWith(Number),
  })
  .from(tokenLedger)
  .where(
    inArray(tokenLedger.reason, [
      "daily_replenish",
      "admin_award",
      "survey_reward",
      "referral_bonus",
      "admin_penalty"
    ])
  )
  .groupBy(tokenLedger.studentId);
  
  let updatedCount = 0;
  for (const award of systemAwards) {
    if (!award.studentId) continue;
    
    await db.update(students)
      .set({ totalTokensReceived: sql`${students.totalTokensReceived} + ${award.totalAwarded}` })
      .where(eq(students.id, award.studentId));
      
    updatedCount++;
  }
  
  console.log(`Updated ${updatedCount} students with extra system awards.`);
  console.log("Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
