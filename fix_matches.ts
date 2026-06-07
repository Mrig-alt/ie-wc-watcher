import { db } from "./src/db";
import { matches } from "./src/db/schema";
import { eq, inArray } from "drizzle-orm";

async function run() {
  // Update matches on June 6 late UTC to be earlier so they show up today in Madrid time
  const targetIds = [
    '89cd0e9a-e923-4784-b1e9-44301dc56c5c', // wait, let's just query by date!
  ];
  const toUpdate = await db.select().from(matches).where(
    inArray(matches.matchDatetime, [
      new Date('2026-06-06T22:00:00.000Z'),
      new Date('2026-06-06T23:00:00.000Z')
    ])
  );
  console.log(`Found ${toUpdate.length} matches to shift.`);
  for (const m of toUpdate) {
    const newDate = new Date(m.matchDatetime.getTime() - 4 * 60 * 60 * 1000); // subtract 4 hours -> 18:00Z and 19:00Z
    await db.update(matches).set({ matchDatetime: newDate }).where(eq(matches.id, m.id));
  }
  console.log("Updated matches to fall squarely within Madrid's June 6.");
  process.exit(0);
}
run();
