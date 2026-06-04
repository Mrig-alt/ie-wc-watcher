import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { friendGroups, groupMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  await db.transaction(async (tx) => {
    // Read ownership BEFORE deleting membership so we don't lose the check if process crashes
    const [group] = await tx
      .select({ createdBy: friendGroups.createdBy })
      .from(friendGroups)
      .where(eq(friendGroups.id, groupId))
      .limit(1);

    await tx
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.studentId, session.user.id)));

    if (group?.createdBy === session.user.id) {
      await tx.delete(friendGroups).where(eq(friendGroups.id, groupId));
    }
  });

  return NextResponse.json({ ok: true });
}
