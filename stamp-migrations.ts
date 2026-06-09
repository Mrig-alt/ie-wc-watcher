import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

// Hashes match what drizzle-kit generate stores in the _journal snapshots.
// We only need to insert the tag + created_at; the hash column is not required
// by all versions of the Drizzle migrator but we include it to be safe.
const MIGRATIONS_TO_STAMP = [
  { tag: "0015_needy_spectrum",  when: 1781031822058 },
  { tag: "0016_fancy_beast",     when: 1781032636732 },
];

async function main() {
  const sql = postgres(process.env.DIRECT_URL!, { ssl: "require", max: 1 });

  console.log("Stamping already-applied migrations into drizzle.__drizzle_migrations...");

  for (const m of MIGRATIONS_TO_STAMP) {
    // created_at is stored as ms epoch in newer Drizzle, as a timestamp in older.
    // We use ON CONFLICT DO NOTHING so re-running is always safe.
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${m.tag}, ${m.when})
      ON CONFLICT DO NOTHING
    `;
    console.log(`  ✅ Stamped: ${m.tag}`);
  }

  await sql.end();
  console.log("Done! You can now run: pnpm tsx src/db/migrate.ts");
}

main().catch((e) => { console.error(e); process.exit(1); });
