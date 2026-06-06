import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .update(students)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(students.id, userId), isNull(students.deletedAt)));

  return NextResponse.json({ ok: true });
}
