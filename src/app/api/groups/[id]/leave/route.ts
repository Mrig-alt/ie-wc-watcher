import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { friendGroups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/groups/[id]/leave — leave (or delete if owner) a group
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.studentId, session.user.id)));

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Check if owner
  const [group] = await db.select().from(friendGroups).where(eq(friendGroups.id, id));
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (group.createdBy === session.user.id) {
    // Owner deletes the whole group (cascade removes members and bets)
    await db.delete(friendGroups).where(eq(friendGroups.id, id));
  } else {
    // Non-owner just removes themselves
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, id), eq(groupMembers.studentId, session.user.id)));
  }

  return NextResponse.json({ ok: true });
}
