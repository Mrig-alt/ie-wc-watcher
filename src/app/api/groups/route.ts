import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { friendGroups, groupMembers, students } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const createSchema = z.object({
  name: z.string().min(2).max(50),
});

// GET /api/groups — list my groups with members
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find all groups the user is a member of
  const myMemberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.studentId, session.user.id));

  if (myMemberships.length === 0) return NextResponse.json({ groups: [] });

  const groupIds = myMemberships.map((m) => m.groupId);

  const groups = await db
    .select()
    .from(friendGroups)
    .where(inArray(friendGroups.id, groupIds));

  // For each group, fetch members with names
  const allMembers = await db
    .select({
      groupId: groupMembers.groupId,
      studentId: groupMembers.studentId,
      name: students.name,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(students, eq(students.id, groupMembers.studentId))
    .where(inArray(groupMembers.groupId, groupIds));

  const result = groups.map((g) => ({
    ...g,
    members: allMembers.filter((m) => m.groupId === g.id),
    isOwner: g.createdBy === session.user.id,
  }));

  return NextResponse.json({ groups: result });
}

// POST /api/groups — create a new group
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.isGuest) {
    return NextResponse.json({ error: "Guests cannot create groups. Verify your class PIN first." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Generate a unique invite code; catch the DB unique constraint violation instead of
  // the manual retry loop (which could silently fail after 5 collisions)
  let group: typeof friendGroups.$inferSelect;
  for (let attempt = 0; attempt < 10; attempt++) {
    const inviteCode = generateCode();
    try {
      const [created] = await db
        .insert(friendGroups)
        .values({ name: parsed.data.name, inviteCode, createdBy: session.user.id })
        .returning();
      group = created;
      break;
    } catch (e: unknown) {
      // Postgres unique constraint violation (23505) — retry with a new code
      if ((e as { code?: string }).code === "23505") continue;
      throw e;
    }
  }
  if (!group!) return NextResponse.json({ error: "Could not generate invite code, try again" }, { status: 500 });

  // Auto-add creator as member
  await db.insert(groupMembers).values({ groupId: group.id, studentId: session.user.id });

  return NextResponse.json({ group }, { status: 201 });
}
