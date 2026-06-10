import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tokenLedger, students, matches } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, session.user.id), isNull(students.deletedAt)))
    .limit(1);
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await db
    .select({
      id: tokenLedger.id,
      amount: tokenLedger.amount,
      reason: tokenLedger.reason,
      matchId: tokenLedger.matchId,
      createdAt: tokenLedger.createdAt,
    })
    .from(tokenLedger)
    .where(eq(tokenLedger.studentId, session.user.id))
    .orderBy(desc(tokenLedger.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = rows.length > PAGE_SIZE;
  return NextResponse.json({ entries: rows.slice(0, PAGE_SIZE), hasMore });
}
