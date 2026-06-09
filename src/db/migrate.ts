import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// IMPORTANT: Migrations MUST use DIRECT_URL (direct Postgres connection, port 5432).
// DATABASE_URL goes through Supabase's PgBouncer Transaction Pooler which is
// incompatible with DDL statements (CREATE SCHEMA, CREATE TYPE, CREATE INDEX, etc.)
// and causes "statement timeout" or "type already exists" errors.
//
// In Supabase: Settings → Database → Connection string → select "Direct connection"
// Add it to .env.local as: DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  console.error(
    "❌ DIRECT_URL is not set in .env.local\n" +
    "   Migrations require a direct Postgres connection (not PgBouncer).\n" +
    "   In Supabase: Settings → Database → Connection string → Direct connection\n" +
    "   Add to .env.local: DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
  );
  process.exit(1);
}

// No 'prepare: false' needed — direct connections are not PgBouncer, so prepared
// statements work. We keep max:1 since this is a one-shot migration script.
const migrationClient = postgres(connectionString, { max: 1, ssl: "require" });

async function main() {
  console.log("Running database migrations via direct connection...");
  try {
    await migrate(drizzle(migrationClient), { migrationsFolder: "./src/db/migrations" });
    console.log("✅ Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();
