import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString, { max: 1, ssl: "require", prepare: false });
const db = drizzle(client);

async function main() {
  console.log("Adding reminder_sent to predictions and dropping kickoff_reminded from matches...");
  try {
    await db.execute(sql`ALTER TABLE predictions ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;`);
    await db.execute(sql`ALTER TABLE matches DROP COLUMN IF EXISTS kickoff_reminded;`);
    console.log("✅ Columns successfully updated!");
  } catch (error) {
    console.error("Error updating columns:", error);
  } finally {
    await client.end();
  }
  process.exit(0);
}

main();
