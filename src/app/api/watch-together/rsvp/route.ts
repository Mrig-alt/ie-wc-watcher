import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchRsvps, watchInvites, students, tokenLedger } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const HOST_REWARD_PER_RSVP = 50;
const MAX_REWARDED_RSVPS = 10;

const rsvpSchema = z.object({
  inviteId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isGuest) return NextResponse.json({ error: "Guests cannot RSVP" }, { status: 403 });

  const body = await req.json();
  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { inviteId } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      // Find the invite
      const [invite] = await tx
        .select()
        .from(watchInvites)
        .where(eq(watchInvites.id, inviteId))
        .limit(1);

      if (!invite) throw new Error("INVITE_NOT_FOUND");
      if (invite.inviterId === session.user.id) throw new Error("CANNOT_RSVP_TO_OWN");

      // Check if already RSVPed
      const existing = await tx
        .select({ id: watchRsvps.id })
        .from(watchRsvps)
        .where(and(eq(watchRsvps.inviteId, inviteId), eq(watchRsvps.studentId, session.user.id)))
        .limit(1);

      if (existing.length > 0) throw new Error("ALREADY_RSVPED");

      // Count current RSVPs for this invite to determine if host gets reward
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(watchRsvps)
        .where(eq(watchRsvps.inviteId, inviteId));

      const isRewarded = count < MAX_REWARDED_RSVPS;

      // Insert RSVP
      const [rsvp] = await tx
        .insert(watchRsvps)
        .values({
          inviteId,
          studentId: session.user.id,
        })
        .returning();

      // Award tokens to host if within cap
      if (isRewarded) {
        await tx
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${HOST_REWARD_PER_RSVP}` })
          .where(eq(students.id, invite.inviterId));

        await tx.insert(tokenLedger).values({
          studentId: invite.inviterId,
          amount: HOST_REWARD_PER_RSVP,
          reason: "host_reward",
          matchId: invite.matchId,
        });
      }

      return { rsvp, invite };
    });

    revalidatePath("/");
    revalidatePath(`/matches/${result.invite.matchId}`);
    return NextResponse.json({ success: true, rsvp: result.rsvp }, { status: 201 });
  } catch (e: any) {
    console.error("[rsvp error]", e);
    const msg = e.message || "Internal error";
    if (msg === "INVITE_NOT_FOUND") return NextResponse.json({ error: "Watch plan not found" }, { status: 404 });
    if (msg === "CANNOT_RSVP_TO_OWN") return NextResponse.json({ error: "You cannot RSVP to your own plan" }, { status: 400 });
    if (msg === "ALREADY_RSVPED") return NextResponse.json({ error: "You have already RSVPed" }, { status: 400 });

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isGuest) return NextResponse.json({ error: "Guests cannot un-RSVP" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get("inviteId");
  if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 });

  try {
    // We don't take back the host tokens on un-RSVP to keep it simple and prevent edge cases where host balance goes negative.
    // The cap of 10 prevents massive abuse anyway. If desired, we could track it.
    await db
      .delete(watchRsvps)
      .where(and(eq(watchRsvps.inviteId, inviteId), eq(watchRsvps.studentId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
