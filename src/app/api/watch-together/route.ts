import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchInvites, students } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { watchTogetherSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const invites = await db
    .select({
      id: watchInvites.id,
      locationName: watchInvites.locationName,
      locationUrl: watchInvites.locationUrl,
      venueId: watchInvites.venueId,
      inviterName: students.name,
      inviterId: watchInvites.inviterId,
      createdAt: watchInvites.createdAt,
    })
    .from(watchInvites)
    .innerJoin(students, eq(students.id, watchInvites.inviterId))
    .where(eq(watchInvites.matchId, matchId));

  // Group by venueId if set, otherwise fall back to locationName string
  const locations: Record<string, { locationName: string; locationUrl: string | null; venueId: string | null; people: string[] }> = {};
  for (const inv of invites) {
    const key = inv.venueId ?? inv.locationName ?? "Unknown";
    if (!locations[key]) {
      locations[key] = {
        locationName: inv.locationName ?? "Unknown",
        locationUrl: inv.locationUrl ?? null,
        venueId: inv.venueId ?? null,
        people: [],
      };
    }
    locations[key].people.push(inv.inviterName);
  }

  return NextResponse.json({ locations: Object.values(locations) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = watchTogetherSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { matchId, venueId, locationName, locationUrl } = parsed.data;

  const existing = await db
    .select({ id: watchInvites.id })
    .from(watchInvites)
    .where(and(eq(watchInvites.inviterId, session.user.id), eq(watchInvites.matchId, matchId)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(watchInvites)
      .set({
        venueId: venueId ?? null,
        locationName,
        locationUrl: locationUrl || null,
      })
      .where(eq(watchInvites.id, existing[0].id))
      .returning();
    return NextResponse.json({ invite: updated });
  }

  const [invite] = await db
    .insert(watchInvites)
    .values({
      inviterId: session.user.id,
      matchId,
      venueId: venueId ?? null,
      locationName,
      locationUrl: locationUrl || null,
    })
    .returning();

  return NextResponse.json({ invite }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  await db
    .delete(watchInvites)
    .where(and(eq(watchInvites.inviterId, session.user.id), eq(watchInvites.matchId, matchId)));

  return NextResponse.json({ ok: true });
}
