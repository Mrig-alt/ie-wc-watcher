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

  // Mask sensitive parts of the URL for display
  const maskedUrl = connectionString.replace(
    /(postgres(?:ql)?:\/\/)([^:]+):([^@]+)@([^/:]+)(:\d+)?\/(.+)/,
    (_, proto, user, pass, host, port, db) => {
      const maskedPass = "*".repeat(pass.length);
      return `${proto}${user}:${maskedPass}@${host}${port || ""}/${db}`;
    }
  );

  const isLocalhost =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");
  const sslMode = isLocalhost ? false : "require";

  try {
    const client = postgres(connectionString, {
      prepare: false,
      max: 1,
      ssl: sslMode,
      connect_timeout: 3, // 3 seconds timeout
    });

    const result = await client`SELECT 1 as val`;
    await client.end();

    return NextResponse.json({
      success: true,
      maskedUrl,
      sslMode,
      result,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({
      success: false,
      maskedUrl,
      sslMode,
      errorMessage: err.message || String(error),
      errorStack: err.stack || null,
      errorName: err.name || null,
    });
  }
}
