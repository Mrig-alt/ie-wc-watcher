import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// DIRECT_URL is the Supabase Direct Connection (port 5432).
// drizzle-kit needs this for schema introspection — PgBouncer (DATABASE_URL)
// does not support the session-level queries drizzle-kit uses.
const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error(
    "DIRECT_URL is not set.\n" +
    "In Supabase: Settings → Database → Connection string → Direct connection\n" +
    "Add to .env.local: DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: directUrl,
  },
} satisfies Config;
