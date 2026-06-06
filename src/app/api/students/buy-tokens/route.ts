import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Refill student balance by 100 tokens and mark them as having bought in
  const [updated] = await db
    .update(students)
    .set({
      tokenBalance: sql`${students.tokenBalance} + 100`,
      hasBoughtIn: true,
    })
    .where(eq(students.id, session.user.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    tokenBalance: updated.tokenBalance,
    hasBoughtIn: updated.hasBoughtIn,
  });
}
