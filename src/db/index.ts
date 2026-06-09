import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

// Supabase pooler (port 6543) requires SSL but with a valid cert
// Using ssl:'require' is the correct mode for Supabase
const sslMode = isLocalhost ? false : "require";

// Supabase's transaction pooler (port 6543) assigns one server-side connection
// per client connection. In a serverless/short-lived Node process like Render,
// max:1 is correct — each request borrows one connection, runs its queries
// sequentially, then returns it. Using max>1 causes pool contention that hangs
// requests indefinitely when all slots are occupied.
const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  ssl: sslMode,
  connect_timeout: 15,
  idle_timeout: 10,
  max_lifetime: 60,
  types: {
    real: {
      to: 700,
      from: [700],
      parse: parseFloat,
      serialize: (x: any) => x.toString()
    },
    float8: {
      to: 701,
      from: [701],
      parse: parseFloat,
      serialize: (x: any) => x.toString()
    }
  }
});

export const db = drizzle(client, { schema });
