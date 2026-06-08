import { sql } from "drizzle-orm";
import { db } from "./index";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "referred_by" uuid REFERENCES "students"("id")`);
    await db.execute(sql`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "referral_tokens_earned" integer NOT NULL DEFAULT 0`);
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
