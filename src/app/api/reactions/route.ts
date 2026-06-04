import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matchReactions, matchVibes, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { reactionSchema, vibeSchema } from "@/lib/validations";
import { broadcast } from "@/lib/reaction-stream";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Fetch student name for the broadcast
  const [student] = await db
    .select({ name: students.name })
    .from(students)
    .where(eq(students.id, session.user.id))
    .limit(1);

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

    broadcast({
      type: "vibe",
      studentName: student?.name ?? "Someone",
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

  broadcast({
    type: "reaction",
    studentName: student?.name ?? "Someone",
    emoji: parsed.data.emoji,
    matchId: parsed.data.matchId,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ reaction }, { status: 201 });
}
