import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

// Supabase pooler (port 6543) requires SSL but with a valid cert
// Using ssl:'require' is the correct mode for Supabase
const sslMode = isLocalhost ? false : "require";

const client = postgres(connectionString, {
  prepare: false,
  max: 3,
  ssl: sslMode,
  connect_timeout: 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
