import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { friendGroups, groupMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const joinSchema = z.object({
  inviteCode: z.string().min(4).max(8).toUpperCase(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  const [group] = await db
    .select()
    .from(friendGroups)
    .where(eq(friendGroups.inviteCode, parsed.data.inviteCode))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: "Group not found — check the code" }, { status: 404 });
  }

  // Already a member?
  const existing = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.studentId, session.user.id)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ group, alreadyMember: true });
  }

  await db.insert(groupMembers).values({ groupId: group.id, studentId: session.user.id });

  return NextResponse.json({ group, alreadyMember: false }, { status: 201 });
}
