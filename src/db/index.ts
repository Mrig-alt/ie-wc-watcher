import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const sslMode = isLocalhost ? false : "require";

// max:10 with PgBouncer transaction pooler — pooler handles up to 200
// concurrent clients on Supabase Nano, so 10 server-side connections
// is safe and eliminates the queue buildup under high load.
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
