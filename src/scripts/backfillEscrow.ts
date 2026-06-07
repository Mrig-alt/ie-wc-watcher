import { db } from "../db/index";
import { students, predictions, bets, tokenLedger } from "../db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

async function main() {
  console.log("Adding escrow_tokens column if not exists...");
  await db.execute(sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS escrow_tokens integer NOT NULL DEFAULT 0`);
  
  console.log("Backfilling escrowTokens...");

  const allStudents = await db.select({ id: students.id }).from(students);

  for (const s of allStudents) {
    let escrow = 0;

    // 1. Pending predictions
    const activePreds = await db.select().from(predictions).where(and(eq(predictions.studentId, s.id), eq(predictions.settled, false)));
    for (const p of activePreds) {
      escrow += p.stakeTokens ?? 0;
    }

    // 2. Pending 1v1 Bets (Global only)
    const activeBets1 = await db.select().from(bets).where(and(eq(bets.student1Id, s.id), eq(bets.settled, false), isNull(bets.groupId)));
    const activeBets2 = await db.select().from(bets).where(and(eq(bets.student2Id, s.id), eq(bets.settled, false), isNull(bets.groupId)));
    
    const allActiveBets = [...activeBets1, ...activeBets2];
    // Deduplicate in case they are playing themselves? Should not happen but just in case
    const uniqueBets = Array.from(new Set(allActiveBets.map(b => b.id)))
      .map(id => allActiveBets.find(b => b.id === id)!);

    for (const b of uniqueBets) {
      if (b.status === "accepted") {
        // Both players are invested
        escrow += b.stakeTokens;
      } else if (b.status === "pending") {
        // Only the requester is invested. Let's see if THIS user is the requester.
        // We can check token_ledger
        const [ledgerEntry] = await db.select()
          .from(tokenLedger)
          .where(and(
            eq(tokenLedger.studentId, s.id),
            eq(tokenLedger.matchId, b.matchId),
            eq(tokenLedger.reason, "bet_placed")
          )).limit(1);
        
        if (ledgerEntry) {
          escrow += b.stakeTokens;
        }
      }
    }

    if (escrow > 0) {
      console.log(`Setting escrowTokens = ${escrow} for student ${s.id}`);
      await db.update(students).set({ escrowTokens: escrow }).where(eq(students.id, s.id));
    }
  }

  console.log("Backfill complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
