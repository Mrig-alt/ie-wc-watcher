import { db } from "../db";
import { students, groupMembers } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const OLD_BASE = 100;
const OLD_PUBLIC = 50;
const OLD_EARLY = 75;

const NEW_BASE = 1000;
const NEW_PUBLIC = 200;
const NEW_EARLY = 100;

export async function run() {
  console.log("Starting dynamic token migration...");

  // 1. Fetch all students sorted by ID (to accurately determine early bird index)
  const allStudents = await db.select().from(students).where(eq(students.isGuest, false));
  
  // Sort by id to roughly approximate registration order
  allStudents.sort((a, b) => a.id.localeCompare(b.id));

  let migratedCount = 0;

  for (let i = 0; i < allStudents.length; i++) {
    const student = allStudents[i];

    // If totalTokensReceived is already >= 1000, we skip to make this idempotent
    if (student.totalTokensReceived >= 1000) {
      continue;
    }

    let diff = NEW_BASE - OLD_BASE;
    if (student.visibility === "public") {
      diff += (NEW_PUBLIC - OLD_PUBLIC);
    }
    // We use the same EARLY_BIRD_LIMIT = 20 from tokens.ts
    if (i < 20) {
      diff += (NEW_EARLY - OLD_EARLY);
    }

    await db
      .update(students)
      .set({
        tokenBalance: sql`${students.tokenBalance} + ${diff}`,
        totalTokensReceived: sql`${students.totalTokensReceived} + ${diff}`,
      })
      .where(eq(students.id, student.id));

    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} non-guest students to new token economy.`);

  // 2. Migrate Group Members
  const groups = await db.select().from(groupMembers);
  let groupMigrated = 0;

  for (const gm of groups) {
    if (gm.tokenBalance >= 1000) continue; // Roughly idempotent
    
    await db
      .update(groupMembers)
      .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${NEW_BASE - OLD_BASE}` })
      .where(sql`${groupMembers.groupId} = ${gm.groupId} AND ${groupMembers.studentId} = ${gm.studentId}`);
    
    groupMigrated++;
  }

  console.log(`Migrated ${groupMigrated} group member records.`);
  console.log("Done!");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
