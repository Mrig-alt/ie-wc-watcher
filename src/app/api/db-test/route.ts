import { NextResponse } from "next/server";
import postgres from "postgres";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (process.env.NODE_ENV !== "development" && session?.user?.email !== process.env.ADMIN_EMAIL) return NextResponse.json({error: "Unauthorized"}, {status: 401});

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

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
    ssl: sslMode,
    connect_timeout: 5,
  });

  const queryTimes: Record<string, number | string> = {};

  async function timeQuery(name: string, fn: () => Promise<any>) {
    const start = Date.now();
    try {
      await fn();
      queryTimes[name] = Date.now() - start;
    } catch (e) {
      queryTimes[name] = "Failed after " + (Date.now() - start) + "ms: " + String(e);
    }
  }

  try {
    // 1. SELECT 1
    await timeQuery("select_1", () => client`SELECT 1`);

    // 2. Query matches (today matches logic)
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    await timeQuery("query_matches", () => client`
      SELECT id 
      FROM matches 
      WHERE match_datetime >= ${todayStart} AND match_datetime <= ${todayEnd}
    `);

    // 3. Query all teams
    await timeQuery("query_teams", () => client`
      SELECT id, name FROM teams
    `);

    // 4. Query students
    await timeQuery("query_students", () => client`
      SELECT id, name FROM students WHERE flagged = false
    `);

    // 5. Query watch_invites
    await timeQuery("query_watch_invites", () => client`
      SELECT id FROM watch_invites LIMIT 5
    `);

    // 6. Query bets
    await timeQuery("query_bets", () => client`
      SELECT id FROM bets LIMIT 5
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      queryTimes,
    });
  } catch (error) {
    const err = error as Error;
    await client.end();
    return NextResponse.json({
      success: false,
      queryTimes,
      errorMessage: err.message || String(error),
    });
  }
}
