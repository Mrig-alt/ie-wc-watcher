import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bets, students, tokenLedger, matches } from "@/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { sendChallengeNotification } from "@/lib/push";
import { revalidatePath } from "next/cache";

const takeBetSchema = z.object({
  betId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.isGuest) {
    return NextResponse.json({ error: "Guests cannot take bets. Verify your class PIN first." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = takeBetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { betId } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      // Find the bet and lock it
      const [bet] = await tx
        .select()
        .from(bets)
        .where(
          and(
            eq(bets.id, betId),
            eq(bets.isOpenMarket, true),
            eq(bets.status, "pending"),
            isNull(bets.student2Id)
          )
        )
        .for("update")
        .limit(1);

      if (!bet) throw new Error("BET_NOT_FOUND");
      if (bet.student1Id === session.user.id) throw new Error("CANNOT_TAKE_OWN_BET");

      const [match] = await tx.select().from(matches).where(eq(matches.id, bet.matchId)).limit(1);
      if (!match) throw new Error("MATCH_NOT_FOUND");
      if (new Date() >= new Date(match.matchDatetime) || match.status !== "upcoming") {
        throw new Error("MATCH_STARTED");
      }

      // Check taker balance
      const [taker] = await tx
        .select({ tokenBalance: students.tokenBalance, escrowTokens: students.escrowTokens })
        .from(students)
        .where(eq(students.id, session.user.id))
        .for("update")
        .limit(1);

      if (!taker) throw new Error("TAKER_NOT_FOUND");
      if (taker.tokenBalance < bet.stakeTokens) throw new Error("INSUFFICIENT_TOKENS");

      // Deduct from taker
      await tx
        .update(students)
        .set({
          tokenBalance: sql`${students.tokenBalance} - ${bet.stakeTokens}`,
          escrowTokens: sql`${students.escrowTokens} + ${bet.stakeTokens}`,
        })
        .where(eq(students.id, session.user.id));

      await tx.insert(tokenLedger).values({
        studentId: session.user.id,
        amount: -bet.stakeTokens,
        reason: "bet_placed",
        matchId: bet.matchId,
      });

      // Assign taker to bet
      const [updatedBet] = await tx
        .update(bets)
        .set({
          student2Id: session.user.id,
          status: "accepted",
        })
        .where(and(eq(bets.id, betId), isNull(bets.student2Id)))
        .returning();

      if (!updatedBet) throw new Error("BET_NOT_FOUND"); // In case of race condition

      return updatedBet;
    });

    if (session.user.name) {
      sendChallengeNotification(result.student1Id, session.user.name, result.stakeTokens).catch(console.error);
    }

    revalidatePath("/");
    revalidatePath(`/matches/${result.matchId}`);
    return NextResponse.json({ success: true, bet: result });
  } catch (e: any) {
    console.error("[market take error]", e);
    const msg = e.message || "Internal error";
    if (msg === "BET_NOT_FOUND") return NextResponse.json({ error: "Bet is no longer available" }, { status: 404 });
    if (msg === "INSUFFICIENT_TOKENS") return NextResponse.json({ error: "Insufficient tokens" }, { status: 400 });
    if (msg === "CANNOT_TAKE_OWN_BET") return NextResponse.json({ error: "You cannot take your own bet" }, { status: 400 });
    if (msg === "MATCH_STARTED") return NextResponse.json({ error: "Match has already started" }, { status: 400 });

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
