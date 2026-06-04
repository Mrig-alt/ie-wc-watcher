import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Render internal Postgres uses self-signed certs — rejectUnauthorized:false handles this.
// For local dev (localhost), SSL is disabled entirely.
const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const sslMode = isLocalhost ? false : { rejectUnauthorized: false };

const client = postgres(connectionString, {
  prepare: false,
  max: 3,
  ssl: sslMode,
  connect_timeout: 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
