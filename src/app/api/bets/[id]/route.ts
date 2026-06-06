import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bets, students, groupMembers, matches, tokenLedger } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const updateBetSchema = z.object({
  action: z.enum(["accept", "decline"]),
  student2Score1: z.number().int().min(0).max(50).optional().nullable(),
  student2Score2: z.number().int().min(0).max(50).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateBetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { action, student2Score1, student2Score2 } = parsed.data;

  // Retrieve the bet and its match details
  const [bet] = await db
    .select({
      id: bets.id,
      matchId: bets.matchId,
      student1Id: bets.student1Id,
      student2Id: bets.student2Id,
      groupId: bets.groupId,
      status: bets.status,
      challengerTeamSide: bets.challengerTeamSide,
      stakeTokens: bets.stakeTokens,
      student1Score1: bets.student1Score1,
      student1Score2: bets.student1Score2,
      matchDatetime: matches.matchDatetime,
    })
    .from(bets)
    .innerJoin(matches, eq(matches.id, bets.matchId))
    .where(eq(bets.id, id))
    .limit(1);

  if (!bet) return NextResponse.json({ error: "Bet not found" }, { status: 404 });

  if (bet.status !== "pending") {
    return NextResponse.json({ error: "Bet is no longer pending" }, { status: 400 });
  }

  if (new Date() >= new Date(bet.matchDatetime)) {
    return NextResponse.json({ error: "Match has already started" }, { status: 400 });
  }

  // Deduce challenger and opponent IDs
  const isScore = bet.student1Score1 !== null;
  const challengerId = isScore 
    ? bet.student1Id 
    : (bet.challengerTeamSide === 1 ? bet.student1Id : bet.student2Id);
  const opponentId = isScore 
    ? bet.student2Id 
    : (bet.challengerTeamSide === 1 ? bet.student2Id : bet.student1Id);

  // Only the opponent can accept/decline
  if (session.user.id !== opponentId) {
    return NextResponse.json({ error: "Only the challenged opponent can perform this action" }, { status: 403 });
  }

  try {
    const updatedBet = await db.transaction(async (tx) => {
      if (action === "accept") {
        if (isScore) {
          if (student2Score1 === undefined || student2Score1 === null || student2Score2 === undefined || student2Score2 === null) {
            throw new Error("MISSING_SCORE_PREDICTIONS");
          }
          if (student2Score1 < 0 || student2Score2 < 0) {
            throw new Error("INVALID_SCORE_PREDICTIONS");
          }
          if (student2Score1 === bet.student1Score1 && student2Score2 === bet.student1Score2) {
            throw new Error("DUPLICATE_SCORE_PREDICTION");
          }
        }

        if (bet.groupId) {
          // Check opponent group balance
          const [opponentMember] = await tx
            .select({ tokenBalance: groupMembers.tokenBalance })
            .from(groupMembers)
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, opponentId)))
            .limit(1);

          if (!opponentMember || opponentMember.tokenBalance < bet.stakeTokens) {
            throw new Error("INSUFFICIENT_TOKENS");
          }

          // Deduct from opponent's group balance
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} - ${bet.stakeTokens}` })
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, opponentId)));
        } else {
          // Check opponent global balance
          const [opponent] = await tx
            .select({ tokenBalance: students.tokenBalance })
            .from(students)
            .where(eq(students.id, opponentId))
            .limit(1);

          if (!opponent || opponent.tokenBalance < bet.stakeTokens) {
            throw new Error("INSUFFICIENT_TOKENS");
          }

          // Deduct from opponent's global balance
          await tx
            .update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} - ${bet.stakeTokens}` })
            .where(eq(students.id, opponentId));

          await tx.insert(tokenLedger).values({
            studentId: opponentId,
            amount: -bet.stakeTokens,
            reason: "bet_accepted",
            matchId: bet.matchId,
          });
        }

        const updates: Partial<typeof bets.$inferInsert> = { status: "accepted" };
        if (isScore) {
          updates.student2Score1 = student2Score1;
          updates.student2Score2 = student2Score2;
        }

        const [acceptedBet] = await tx
          .update(bets)
          .set(updates)
          .where(eq(bets.id, id))
          .returning();

        return acceptedBet;
      } else {
        // Decline bet: refund challenger
        if (bet.groupId) {
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens}` })
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, challengerId)));
        } else {
          await tx
            .update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}` })
            .where(eq(students.id, challengerId));

          await tx.insert(tokenLedger).values({
            studentId: challengerId,
            amount: bet.stakeTokens,
            reason: "bet_refund_decline",
            matchId: bet.matchId,
          });
        }

        const [declinedBet] = await tx
          .update(bets)
          .set({ status: "declined", settled: true })
          .where(eq(bets.id, id))
          .returning();

        return declinedBet;
      }
    });

    return NextResponse.json({ bet: updatedBet });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "INSUFFICIENT_TOKENS") {
        return NextResponse.json({ error: "Insufficient tokens to accept this bet" }, { status: 400 });
      }
      if (e.message === "MISSING_SCORE_PREDICTIONS") {
        return NextResponse.json({ error: "Please predict a score to accept this challenge" }, { status: 400 });
      }
      if (e.message === "DUPLICATE_SCORE_PREDICTION") {
        return NextResponse.json({ error: "Your prediction must be different from the challenger's prediction" }, { status: 400 });
      }
    }
    throw e;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Retrieve the bet and its match details
  const [bet] = await db
    .select({
      id: bets.id,
      matchId: bets.matchId,
      student1Id: bets.student1Id,
      student2Id: bets.student2Id,
      groupId: bets.groupId,
      status: bets.status,
      challengerTeamSide: bets.challengerTeamSide,
      stakeTokens: bets.stakeTokens,
      student1Score1: bets.student1Score1,
      matchDatetime: matches.matchDatetime,
    })
    .from(bets)
    .innerJoin(matches, eq(matches.id, bets.matchId))
    .where(eq(bets.id, id))
    .limit(1);

  if (!bet) return NextResponse.json({ error: "Bet not found" }, { status: 404 });

  if (bet.status !== "pending") {
    return NextResponse.json({ error: "Can only cancel pending challenges" }, { status: 400 });
  }

  // Deduce challenger ID
  const isScore = bet.student1Score1 !== null;
  const challengerId = isScore 
    ? bet.student1Id 
    : (bet.challengerTeamSide === 1 ? bet.student1Id : bet.student2Id);

  // Only the challenger can cancel
  if (session.user.id !== challengerId) {
    return NextResponse.json({ error: "Only the challenger who created the bet can cancel it" }, { status: 403 });
  }

  // Cancel and refund challenger
  await db.transaction(async (tx) => {
    if (bet.groupId) {
      await tx
        .update(groupMembers)
        .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens}` })
        .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, challengerId)));
    } else {
      await tx
        .update(students)
        .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}` })
        .where(eq(students.id, challengerId));

      await tx.insert(tokenLedger).values({
        studentId: challengerId,
        amount: bet.stakeTokens,
        reason: "bet_refund_cancel",
        matchId: bet.matchId,
      });
    }

    await tx.delete(bets).where(eq(bets.id, id));
  });

  return NextResponse.json({ ok: true });
}
