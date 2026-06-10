import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const sslMode = isLocalhost ? false : "require";

// max:3 allows Promise.all to run queries in parallel without serialising
// them through a single connection (which caused 8s statement timeouts).
// Supabase free tier allows 15 direct connections so 3 is safe.
const client = postgres(connectionString, {
  prepare: false,
  max: 3,
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
