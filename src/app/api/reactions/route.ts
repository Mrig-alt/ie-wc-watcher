import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matchReactions, matchVibes, students } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { reactionSchema, vibeSchema } from "@/lib/validations";
import { broadcast } from "@/lib/reaction-stream";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isGuest) return NextResponse.json({ error: "Forbidden for guests" }, { status: 403 });

  const body = await req.json();

  const [student] = await db
    .select({ name: students.name, visibility: students.visibility })
    .from(students)
    .where(and(eq(students.id, session.user.id), isNull(students.deletedAt), eq(students.flagged, false)))
    .limit(1);

  if (!student) return NextResponse.json({ error: "User not found or flagged" }, { status: 404 });

  if (body.vibe !== undefined) {
    const parsed = vibeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const [vibe] = await db
      .insert(matchVibes)
      .values({ studentId: session.user.id, ...parsed.data })
      .onConflictDoUpdate({
        target: [matchVibes.studentId, matchVibes.matchId],
        set: { vibe: parsed.data.vibe },
      })
      .returning();

    const vibeName = (student?.visibility === "stealth" || student?.visibility === "friends") ? "Anonymous" : (student?.name ?? "Someone");
    broadcast({
      type: "vibe",
      studentName: vibeName,
      vibe: parsed.data.vibe,
      matchId: parsed.data.matchId,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ vibe }, { status: 201 });
  }

  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [reaction] = await db
    .insert(matchReactions)
    .values({ studentId: session.user.id, ...parsed.data })
    .returning();

  const reactionName = (student?.visibility === "stealth" || student?.visibility === "friends") ? "Anonymous" : (student?.name ?? "Someone");
  broadcast({
    type: "reaction",
    studentName: reactionName,
    emoji: parsed.data.emoji,
    matchId: parsed.data.matchId,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ reaction }, { status: 201 });
}
