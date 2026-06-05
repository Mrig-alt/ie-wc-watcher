import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const connectionString = process.env.DATABASE_URL || "";
  if (!connectionString) {
    return NextResponse.json({
      success: false,
      error: "DATABASE_URL environment variable is empty or undefined.",
    });
  }

  const isLocalhost =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");
  const sslMode = isLocalhost ? false : "require";

  try {
    const client = postgres(connectionString, {
      prepare: false,
      max: 1,
      ssl: sslMode,
      connect_timeout: 5,
    });

    // 1. Get all tables in public schema
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    // 2. Get columns of 'teams' table
    const teamsColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'teams'
    `;

    // 3. Get columns of 'bets' table
    const betsColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'bets'
    `;

    // 4. Get columns of 'students' table
    const studentsColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'students'
    `;

    // 4b. Get columns of 'matches' table
    const matchesColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'matches'
    `;

    // 5. Get list of migrations applied (if drizzle_migrations table exists)
    let migrations = null;
    try {
      migrations = await client`
        SELECT id, name, created_at 
        FROM __drizzle_migrations
        ORDER BY created_at DESC
      `;
    } catch (e) {
      migrations = "Table __drizzle_migrations does not exist or error: " + String(e);
    }

    await client.end();

    return NextResponse.json({
      success: true,
      tables: tables.map(t => t.table_name),
      teamsColumns: teamsColumns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable })),
      betsColumns: betsColumns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable })),
      studentsColumns: studentsColumns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable })),
      matchesColumns: matchesColumns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable })),
      migrations,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({
      success: false,
      errorMessage: err.message || String(error),
      errorStack: err.stack || null,
    });
  }
}
