import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

function isAdmin(email: string | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && email === adminEmail;
}

// POST /api/admin/moderate
// Body: { id: string; action: "flag" | "unflag" | "set_team" | "eliminate_team" | "restore_team"; teamId?: string; eliminatedStage?: string }
export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, action, teamId, eliminatedStage } = body as {
    id?: string;
    action: string;
    teamId?: string;
    eliminatedStage?: string;
  };

  const targetId = id || teamId;
  if (!targetId || !action) {
    return NextResponse.json({ error: "id/teamId and action required" }, { status: 400 });
  }

  if (action === "eliminate_team") {
    const [updatedTeam] = await db
      .update(teams)
      .set({ isEliminated: true, eliminatedStage: (eliminatedStage as any) ?? null })
      .where(eq(teams.id, targetId))
      .returning();
    return NextResponse.json({ team: updatedTeam });
  }

  if (action === "restore_team") {
    const [updatedTeam] = await db
      .update(teams)
      .set({ isEliminated: false, eliminatedStage: null })
      .where(eq(teams.id, targetId))
      .returning();
    return NextResponse.json({ team: updatedTeam });
  }

  let update: Partial<typeof students.$inferInsert> = {};

  if (action === "flag") {
    update = { flagged: true };
  } else if (action === "unflag") {
    update = { flagged: false };
  } else if (action === "set_team") {
    update = { teamId: teamId ?? null };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const [updated] = await db
    .update(students)
    .set(update)
    .where(eq(students.id, targetId))
    .returning({ id: students.id, flagged: students.flagged, teamId: students.teamId });

  return NextResponse.json({ student: updated });
}

// DELETE /api/admin/moderate
// Body: { id: string }
// Permanently removes a student row — use for test account cleanup only
export async function DELETE(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.update(students).set({ deletedAt: new Date() }).where(eq(students.id, id));

  return NextResponse.json({ deleted: id });
}
