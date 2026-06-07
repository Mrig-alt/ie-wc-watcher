import { NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET env var not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await db
      .update(students)
      .set({ tokenBalance: sql`${students.tokenBalance} + 10` })
      .returning({ id: students.id });

    return NextResponse.json({ success: true, refilledCount: result.length, amount: 10 });
  } catch (error) {
    console.error("Weekly refill error:", error);
    return NextResponse.json({ error: "Failed to refill tokens" }, { status: 500 });
  }
}
