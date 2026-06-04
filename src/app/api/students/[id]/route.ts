import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateStudentSchema } from "@/lib/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session || session.user.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockAt = process.env.LOCK_TEAMS_AT
    ? new Date(process.env.LOCK_TEAMS_AT)
    : new Date("2026-06-11T00:00:00Z");

  const body = await req.json();
  const parsed = updateStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { teamId, isHonoraryFan, visibility } = parsed.data;

  if (teamId !== undefined && new Date() > lockAt) {
    return NextResponse.json(
      { error: "Team selection is locked" },
      { status: 403 }
    );
  }

  const updates: Partial<typeof students.$inferInsert> = {};
  if (teamId !== undefined) updates.teamId = teamId;
  if (isHonoraryFan !== undefined) updates.isHonoraryFan = isHonoraryFan;
  if (visibility !== undefined) updates.visibility = visibility;

  const [updated] = await db
    .update(students)
    .set(updates)
    .where(eq(students.id, id))
    .returning();

  return NextResponse.json({ student: updated });
}
