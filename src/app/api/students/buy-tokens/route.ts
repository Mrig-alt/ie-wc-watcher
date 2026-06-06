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

  const result = await db.transaction(async (tx) => {
    const [student] = await tx
      .select({ tokenBalance: students.tokenBalance, hasBoughtIn: students.hasBoughtIn })
      .from(students)
      .where(eq(students.id, session.user.id))
      .for("update");

    if (!student) {
      return { status: 404, error: "Student not found" };
    }

    if (student.hasBoughtIn) {
      return { status: 400, error: "Already bought in" };
    }

    const [updated] = await tx
      .update(students)
      .set({
        tokenBalance: sql`${students.tokenBalance} + 100`,
        hasBoughtIn: true,
      })
      .where(eq(students.id, session.user.id))
      .returning();

    return { status: 200, data: updated };
  });

  if (result.status !== 200) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    tokenBalance: result.data!.tokenBalance,
    hasBoughtIn: result.data!.hasBoughtIn,
  });
}
