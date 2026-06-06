import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchInvites, students, connections } from "@/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { watchTogetherSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const session = await auth();

  let friendIds = new Set<string>();
  if (session?.user?.id) {
    const myConnections = await db
      .select({ requesterId: connections.requesterId, requesteeId: connections.requesteeId })
      .from(connections)
      .where(
        and(
          eq(connections.status, "accepted"),
          or(
            eq(connections.requesterId, session.user.id),
            eq(connections.requesteeId, session.user.id)
          )
        )
      );
    for (const c of myConnections) {
      if (c.requesterId !== session.user.id) friendIds.add(c.requesterId);
      if (c.requesteeId !== session.user.id) friendIds.add(c.requesteeId);
    }
  }

  const invitesRaw = await db
    .select({
      id: watchInvites.id,
      locationName: watchInvites.locationName,
      locationUrl: watchInvites.locationUrl,
      venueId: watchInvites.venueId,
      inviterName: students.name,
      inviterId: watchInvites.inviterId,
      visibility: students.visibility,
      createdAt: watchInvites.createdAt,
    })
    .from(watchInvites)
    .innerJoin(students, and(eq(students.id, watchInvites.inviterId), isNull(students.deletedAt), eq(students.flagged, false)))
    .where(eq(watchInvites.matchId, matchId));

  const invites = invitesRaw.filter((inv) => {
    if (inv.visibility === "stealth") return false;
    if (inv.visibility === "friends") {
      if (!session?.user?.id) return false;
      if (inv.inviterId === session.user.id) return true;
      return friendIds.has(inv.inviterId);
    }
    return true;
  });

  // Group by venueId if set, otherwise fall back to locationName string
  const locations: Record<
    string,
    {
      locationName: string;
      locationUrl: string | null;
      venueId: string | null;
      people: string[];
      inviterIds: string[];
    }
  > = {};
  for (const inv of invites) {
    const key = inv.venueId ?? inv.locationName ?? "Unknown";
    if (!locations[key]) {
      locations[key] = {
        locationName: inv.locationName ?? "Unknown",
        locationUrl: inv.locationUrl ?? null,
        venueId: inv.venueId ?? null,
        people: [],
        inviterIds: [],
      };
    }
    locations[key].people.push(inv.inviterName);
    locations[key].inviterIds.push(inv.inviterId);
  }

  return NextResponse.json({ locations: Object.values(locations) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isGuest) return NextResponse.json({ error: "Forbidden for guests" }, { status: 403 });

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
  if (session.user.isGuest) return NextResponse.json({ error: "Forbidden for guests" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  await db
    .delete(watchInvites)
    .where(and(eq(watchInvites.inviterId, session.user.id), eq(watchInvites.matchId, matchId)));

  return NextResponse.json({ ok: true });
}
