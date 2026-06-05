import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { connections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { connectionSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = connectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { requesteeId } = parsed.data;
  if (requesteeId === session.user.id) {
    return NextResponse.json({ error: "Cannot connect to yourself" }, { status: 400 });
  }

  // Check if we already sent a request
  const existing = await db
    .select({ id: connections.id, status: connections.status })
    .from(connections)
    .where(
      and(eq(connections.requesterId, session.user.id), eq(connections.requesteeId, requesteeId))
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ connection: existing[0] });
  }

  // Check if the other person already sent us a request (reverse)
  const reverse = await db
    .select({ id: connections.id })
    .from(connections)
    .where(
      and(eq(connections.requesterId, requesteeId), eq(connections.requesteeId, session.user.id))
    )
    .limit(1);

  if (reverse.length > 0) {
    // Just update the existing row to accepted — do NOT insert a second row.
    // Querying friends must check both directions: (A→B) OR (B→A) with status=accepted.
    const [conn] = await db
      .update(connections)
      .set({ status: "accepted" })
      .where(eq(connections.id, reverse[0].id))
      .returning();
    return NextResponse.json({ connection: conn }, { status: 200 });
  }

  // New request
  const [conn] = await db
    .insert(connections)
    .values({ requesterId: session.user.id, requesteeId })
    .returning();

  return NextResponse.json({ connection: conn }, { status: 201 });
}
