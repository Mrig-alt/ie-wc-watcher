import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString, { max: 1, ssl: "require", prepare: false });
const db = drizzle(client);

async function main() {
  console.log("Adding kickoff_reminded column to matches table...");
  try {
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS kickoff_reminded BOOLEAN NOT NULL DEFAULT FALSE;`);
    console.log("✅ Column successfully added!");
  } catch (error) {
    console.error("Error adding column:", error);
  } finally {
    await client.end();
  }
  process.exit(0);
}

main();
