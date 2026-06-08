import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function main() {
  const { db } = await import("@/db");
  const sqlContent = fs.readFileSync("src/db/migrations/0010_previous_earthquake.sql", "utf8");
  const statements = sqlContent.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
      console.log("Executed: ", statement.slice(0, 50) + "...");
    } catch (e: any) { 
      console.log("Failed query:", statement);
      console.log("Error:", e.message); 
    }
  }
  
  console.log("Migration executed!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
