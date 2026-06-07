import { db } from "../db";
import { students } from "../db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("Starting Net Profit migration...");
  
  try {
    console.log("Adding new columns...");
    await db.execute(sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS total_tokens_received integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE predictions ADD COLUMN IF NOT EXISTS stake_tokens integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS draw_odds real`);
    console.log("Columns added successfully.");
  } catch (e) {
    console.error("Error adding columns (might already exist):", e);
  }
  
  // Set totalTokensReceived = 100 for all existing non-guest students
  // Guests will remain at 0 (the default) until they verify
  const result = await db.update(students)
    .set({ totalTokensReceived: 100 })
    .where(eq(students.isGuest, false))
    .returning({ id: students.id, name: students.name });
    
  console.log(`Migrated ${result.length} non-guest students to 100 totalTokensReceived.`);
  console.log("Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
