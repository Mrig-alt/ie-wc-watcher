import { db } from "./src/db";
import { matches } from "./src/db/schema";
import { and, gte, lte } from "drizzle-orm";

async function run() {
  const m = await db.select({ id: matches.id, matchDatetime: matches.matchDatetime, status: matches.status }).from(matches).where(and(gte(matches.matchDatetime, new Date('2026-06-01T00:00:00.000Z')), lte(matches.matchDatetime, new Date('2026-06-30T23:59:59.999Z'))));
  console.log("Matches in June:", m.length);
  if (m.length > 0) {
    console.log(m.map(x => x.matchDatetime.toISOString()));
  }
  process.exit(0);
}
run();
