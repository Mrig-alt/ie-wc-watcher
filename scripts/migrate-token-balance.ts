/**
 * One-time migration: safely adds token_balance column to students if missing.
 *
 * Run against production DB:
 *   DATABASE_URL=<your-render-db-url> npx tsx scripts/migrate-token-balance.ts
 *
 * Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 1,
});

async function run() {
  console.log("Running token_balance migration...");

  await sql`
    ALTER TABLE students
    ADD COLUMN IF NOT EXISTS token_balance integer NOT NULL DEFAULT 100
  `;
  console.log("\u2713 token_balance column exists");

  await sql`
    ALTER TABLE students
    ADD COLUMN IF NOT EXISTS last_seen_at timestamptz
  `;
  console.log("\u2713 last_seen_at column exists");

  await sql`
    ALTER TABLE students
    ADD COLUMN IF NOT EXISTS push_subscription text
  `;
  console.log("\u2713 push_subscription column exists");

  // Show current state
  const cols = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'students'
    ORDER BY ordinal_position
  `;
  console.log("\nStudents table columns:");
  cols.forEach((c) => console.log(` - ${c.column_name} (${c.data_type}, default: ${c.column_default})`));

  await sql.end();
  console.log("\nDone.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
