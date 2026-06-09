import { db } from "../db/index";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function main() {
  try {
    const migrationPath = path.join(__dirname, "../db/migrations/0012_secret_wallflower.sql");
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    
    // Split by statement-breakpoint because drizzle separates statements
    const statements = migrationSql.split("--> statement-breakpoint");
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        await db.execute(sql.raw(stmt.trim()));
      }
    }
    
    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

main();
