import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString, { max: 1, ssl: "require" });
const db = drizzle(client);

async function main() {
  console.log("Adding indexes to the database...");
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS matches_match_datetime_idx ON matches (match_datetime);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS matches_status_idx ON matches (status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS bets_student1_idx ON bets (student1_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS bets_student2_idx ON bets (student2_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS bets_status_idx ON bets (status);`);
    console.log("✅ Indexes successfully applied!");
  } catch (error) {
    console.error("Error applying indexes:", error);
  } finally {
    await client.end();
  }
  process.exit(0);
}

main();
