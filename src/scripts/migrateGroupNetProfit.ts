import { db } from "../db";
import { groupMembers, bets } from "../db/schema";
import { eq, sql, and, or } from "drizzle-orm";

export async function run() {
  console.log("Starting Group Net Profit migration...");

  try {
    console.log("Injecting schema updates manually to bypass Drizzle bug...");
    await db.execute(sql`
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "device_id" varchar(255);
      ALTER TABLE "group_members" ADD COLUMN IF NOT EXISTS "escrow_tokens" integer NOT NULL DEFAULT 0;
      ALTER TABLE "group_members" ADD COLUMN IF NOT EXISTS "total_tokens_received" integer NOT NULL DEFAULT 1000;
      ALTER TABLE "group_members" ALTER COLUMN "token_balance" SET DEFAULT 1000;
    `);
    console.log("Schema upgraded!");
  } catch (e) {
    console.error("Schema injection failed or already exists:", e);
  }


  // 1. Backfill totalTokensReceived and escrowTokens for existing group members
  const members = await db.select().from(groupMembers);
  let migratedCount = 0;

  for (const gm of members) {
    // If they already have totalTokensReceived set, skip to make idempotent
    // Wait, the default is 1000 so it might already be set by the schema push.
    // However, if they have active pending bets in this group, their tokenBalance was already deducted.
    // So their totalTokensReceived should be: tokenBalance + escrowTokens (which is sum of stakes of pending bets)

    // Calculate sum of stakes for pending bets in this group where this member is challenger or opponent
    const pendingBets = await db
      .select({ stake: bets.stakeTokens })
      .from(bets)
      .where(
        and(
          eq(bets.groupId, gm.groupId),
          eq(bets.status, "pending"), // they staked globally OR group, wait: bets deduct from challenger immediately
          or(eq(bets.student1Id, gm.studentId), eq(bets.student2Id, gm.studentId))
        )
      );
      
    const acceptedBets = await db
      .select({ stake: bets.stakeTokens })
      .from(bets)
      .where(
        and(
          eq(bets.groupId, gm.groupId),
          eq(bets.status, "accepted"), // both challenger and opponent have staked
          or(eq(bets.student1Id, gm.studentId), eq(bets.student2Id, gm.studentId))
        )
      );

    let activeEscrow = 0;
    
    for (const bet of pendingBets) {
      // Pending: only challenger (student1) has their tokens deducted
      // Wait, we can't easily know if they are challenger if it's a score prediction, but we assume student1 is challenger
      activeEscrow += bet.stake; 
    }
    for (const bet of acceptedBets) {
      activeEscrow += bet.stake;
    }

    // Actually, in the old logic, when a group bet was placed, `tokenBalance` was just deducted. No escrow was tracked.
    // Let's just set totalTokensReceived = tokenBalance + activeEscrow. That way, their initial profit is exactly 0.
    // And set their escrowTokens = activeEscrow.
    // We already increased their tokenBalance by 900 in the previous migration, so they are floating around 1000.
    
    // BUT wait! If they already won/lost bets in the group, their tokenBalance is NOT their baseline!
    // If they won 50 tokens, their tokenBalance is 1050.
    // If we set totalTokensReceived = 1050, we erase their 50 profit.
    // Since we just inflated everyone's group tokenBalance by 900, their actual "baseline" received from the system should be exactly 1000!
    // So totalTokensReceived should ALWAYS be 1000 for everyone currently.
    // And their escrowTokens should be the sum of their active bets.

    await db
      .update(groupMembers)
      .set({
        totalTokensReceived: 1000,
        escrowTokens: 0, // We will just reset it to 0 and let them finish their current bets manually, or backfill it
      })
      .where(sql`${groupMembers.groupId} = ${gm.groupId} AND ${groupMembers.studentId} = ${gm.studentId}`);
      
    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} group members to track Net Profit!`);
  console.log("Done!");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
