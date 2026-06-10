import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, tokenLedger } from "@/db/schema";
import { sql, eq, isNull, or, lt, and } from "drizzle-orm";

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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Only refill non-guest, non-deleted students who haven't been refilled in the last 7 days.
    // lastWeeklyRefillAt acts as an idempotency guard — double-firing the cron is safe.
    const result = await db
      .update(students)
      .set({
        tokenBalance: sql`${students.tokenBalance} + 10`,
        lastWeeklyRefillAt: now,
      })
      .where(
        and(
          eq(students.isGuest, false),
          isNull(students.deletedAt),
          or(
            isNull(students.lastWeeklyRefillAt),
            lt(students.lastWeeklyRefillAt, sevenDaysAgo)
          )
        )
      )
      .returning({ id: students.id });

    if (result.length > 0) {
      await db.insert(tokenLedger).values(
        result.map((s) => ({
          studentId: s.id,
          amount: 10,
          reason: "weekly_refill",
        }))
      );
    }

    return NextResponse.json({ success: true, refilledCount: result.length, amount: 10 });
  } catch (error) {
    console.error("Weekly refill error:", error);
    return NextResponse.json({ error: "Failed to refill tokens" }, { status: 500 });
  }
}
