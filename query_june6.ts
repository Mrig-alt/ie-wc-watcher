import { db } from "./src/db";
import { matches } from "./src/db/schema";
import { and, gte, lte } from "drizzle-orm";

async function run() {
  const m = await db.select({ id: matches.id, matchDatetime: matches.matchDatetime, status: matches.status }).from(matches).where(and(gte(matches.matchDatetime, new Date('2026-06-05T22:00:00.000Z')), lte(matches.matchDatetime, new Date('2026-06-06T21:59:59.999Z'))));
  console.log("Matches on June 6:", m.length);
  if (m.length > 0) {
    console.log(m);
  }
  process.exit(0);
}
run();
