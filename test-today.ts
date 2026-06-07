import { getMadridTodayRange } from "./src/lib/utils";
import { db } from "./src/db";
import { matches } from "./src/db/schema";
import { and, gte, lte } from "drizzle-orm";

async function run() {
  const { start, end } = getMadridTodayRange();
  console.log("Madrid Today Range:");
  console.log("Start:", start.toISOString());
  console.log("End:", end.toISOString());

  const todayMatches = await db
    .select({ id: matches.id, matchDatetime: matches.matchDatetime })
    .from(matches)
    .where(and(gte(matches.matchDatetime, start), lte(matches.matchDatetime, end)));

  console.log("Matches found within this range:", todayMatches.length);

  const allMatches = await db.select({ id: matches.id, matchDatetime: matches.matchDatetime }).from(matches).limit(5);
  console.log("Sample of match datetimes in DB:");
  allMatches.forEach(m => console.log(m.id, m.matchDatetime.toISOString()));
  
  process.exit(0);
}
run();
