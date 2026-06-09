import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL || "";

// Dedicated client for migrations (max: 1 connection)
const migrationClient = postgres(connectionString, { max: 1 });

async function main() {
  console.log("Running database migrations...");
  try {
    await migrate(drizzle(migrationClient), { migrationsFolder: "./src/db/migrations" });
    console.log("✅ Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await migrationClient.end();
    process.exit(0);
  }
}

main();
