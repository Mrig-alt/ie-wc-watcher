import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { connections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  action: z.enum(["accept", "decline", "remove"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { action } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Only the requestee can accept or decline a pending request
    if (action === "accept" || action === "decline") {
      if (existing.requesteeId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      
      if (action === "accept") {
        const [updated] = await db
          .update(connections)
          .set({ status: "accepted" })
          .where(eq(connections.id, id))
          .returning();
        return NextResponse.json({ connection: updated });
      } else {
        // Decline: delete the request so it no longer shows up
        await db.delete(connections).where(eq(connections.id, id));
        return NextResponse.json({ success: true });
      }
    }

    // Anyone in the connection can remove an accepted connection
    if (action === "remove") {
      if (existing.requesterId !== session.user.id && existing.requesteeId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db.delete(connections).where(eq(connections.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Connection update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
