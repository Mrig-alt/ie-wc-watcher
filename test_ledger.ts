import { db } from "./src/db";
import { tokenLedger } from "./src/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  const res = await db.execute(sql`SELECT DISTINCT reason FROM token_ledger`);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
run();
