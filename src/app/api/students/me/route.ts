import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { checkAndReplenishFloor } from "@/lib/tokens";

// Returns live (DB) values for all mutable user fields.
// Used by the useLiveProfile() hook to avoid stale JWT reads.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Daily floor replenishment check
  await checkAndReplenishFloor(session.user.id);

  const [student] = await db
    .select({
      tokenBalance: students.tokenBalance,
      teamId: students.teamId,
      visibility: students.visibility,
    })
    .from(students)
    .where(and(eq(students.id, session.user.id), isNull(students.deletedAt)))
    .limit(1);

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    tokenBalance: student.tokenBalance,
    teamId: student.teamId,
    visibility: student.visibility,
  });
}
