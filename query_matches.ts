import { db } from "./src/db";
import { matches } from "./src/db/schema";
import { asc } from "drizzle-orm";

async function run() {
  const allMatches = await db.select({ id: matches.id, matchDatetime: matches.matchDatetime, status: matches.status }).from(matches).orderBy(asc(matches.matchDatetime)).limit(10);
  console.log(allMatches);
  process.exit(0);
}
run();
