import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TYPE live_report_status ADD VALUE IF NOT EXISTS 'planning'`);
    console.log("Successfully added 'planning' to live_report_status");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

main();
