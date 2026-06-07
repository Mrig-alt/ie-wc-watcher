import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "endpoint" varchar(500) NOT NULL,
        "p256dh" varchar(200) NOT NULL,
        "auth" varchar(200) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("Successfully created push_subscriptions table");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

main();
