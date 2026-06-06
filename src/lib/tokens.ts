import { db } from "@/db";
import { students, bets, predictions, matches, groupMembers, tokenLedger } from "@/db/schema";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";

export const STAKE_TOKENS = 10;
export const PREDICTION_CORRECT_TOKENS = 5;
export const PREDICTION_EXACT_TOKENS = 15;
export const PUBLIC_BONUS_TOKENS = 50;
export const EARLY_BIRD_BONUS_TOKENS = 75;
export const EARLY_BIRD_LIMIT = 20;

export async function settleBetsForMatch(matchId: string) {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match || match.status !== "completed") return;
  if (match.team1Score === null || match.team2Score === null) return;

  const unsettledBets = await db
    .select()
    .from(bets)
    .where(and(eq(bets.matchId, matchId), eq(bets.settled, false)));

  for (const bet of unsettledBets) {
    if (bet.status === "pending") {
      // Pending bet expires since match has started
      const updated = await db
        .update(bets)
        .set({ settled: true, status: "expired" })
        .where(and(eq(bets.id, bet.id), eq(bets.settled, false)))
        .returning({ id: bets.id });
      if (updated.length === 0) continue;

      const challengerId = bet.challengerTeamSide === 1 ? bet.student1Id : bet.student2Id;
      if (bet.groupId) {
        await db
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens}` })
          .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, challengerId)));
      } else {
        await db
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}` })
          .where(eq(students.id, challengerId));

        await db.insert(tokenLedger).values({
          studentId: challengerId,
          amount: bet.stakeTokens,
          reason: "bet_refund_expired",
          matchId,
        });
      }
      continue;
    }

    let winnerId: string | null = null;
    let payoutType: "full" | "half" | "refund" = "full";

    const isScoreChallenge = bet.student1Score1 !== null && bet.student1Score2 !== null;

    if (isScoreChallenge) {
      const s1_1 = bet.student1Score1!;
      const s1_2 = bet.student1Score2!;
      const s2_1 = bet.student2Score1 ?? 0;
      const s2_2 = bet.student2Score2 ?? 0;

      const err1 = Math.abs(s1_1 - match.team1Score) + Math.abs(s1_2 - match.team2Score);
      const err2 = Math.abs(s2_1 - match.team1Score) + Math.abs(s2_2 - match.team2Score);

      const exact1 = s1_1 === match.team1Score && s1_2 === match.team2Score;
      const exact2 = s2_1 === match.team1Score && s2_2 === match.team2Score;

      if (exact1 && !exact2) {
        winnerId = bet.student1Id;
        payoutType = "full";
      } else if (exact2 && !exact1) {
        winnerId = bet.student2Id;
        payoutType = "full";
      } else if (exact1 && exact2) {
        winnerId = null;
        payoutType = "refund";
      } else {
        // Both wrong
        if (err1 < err2) {
          winnerId = bet.student1Id;
          payoutType = "half";
        } else if (err2 < err1) {
          winnerId = bet.student2Id;
          payoutType = "half";
        } else {
          winnerId = null;
          payoutType = "refund";
        }
      }
    } else {
      // Standard outcome-based challenge
      if (match.team1Score > match.team2Score) {
        winnerId = bet.student1Id;
      } else if (match.team2Score > match.team1Score) {
        winnerId = bet.student2Id;
      } else if (match.team1Penalties !== null && match.team2Penalties !== null) {
        if (match.team1Penalties > match.team2Penalties) {
          winnerId = bet.student1Id;
        } else if (match.team2Penalties > match.team1Penalties) {
          winnerId = bet.student2Id;
        }
      }
      payoutType = winnerId ? "full" : "refund";
    }

    // CAS guard: only update if still unsettled
    const updated = await db
      .update(bets)
      .set({ settled: true, winnerId })
      .where(and(eq(bets.id, bet.id), eq(bets.settled, false)))
      .returning({ id: bets.id });
    if (updated.length === 0) continue;

    // Execute payouts
    if (payoutType === "full" && winnerId) {
      if (bet.groupId) {
        await db
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens * 2}` })
          .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, winnerId)));
      } else {
        await db
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens * 2}` })
          .where(eq(students.id, winnerId));

        await db.insert(tokenLedger).values({
          studentId: winnerId,
          amount: bet.stakeTokens * 2,
          reason: "bet_payout_win",
          matchId,
        });
      }
    } else if (payoutType === "half" && winnerId) {
      // Closest wins half, the other half is returned to the loser
      const winnerRefund = Math.round(bet.stakeTokens * 1.5);
      const loserRefund = (bet.stakeTokens * 2) - winnerRefund;
      const loserId = winnerId === bet.student1Id ? bet.student2Id : bet.student1Id;

      if (bet.groupId) {
        await db
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${winnerRefund}` })
          .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, winnerId)));
        await db
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${loserRefund}` })
          .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, loserId)));
      } else {
        await db
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${winnerRefund}` })
          .where(eq(students.id, winnerId));
        await db
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${loserRefund}` })
          .where(eq(students.id, loserId));

        await db.insert(tokenLedger).values({
          studentId: winnerId,
          amount: winnerRefund,
          reason: "bet_payout_half_win",
          matchId,
        });
        await db.insert(tokenLedger).values({
          studentId: loserId,
          amount: loserRefund,
          reason: "bet_payout_half_loss",
          matchId,
        });
      }
    } else {
      // Refund both players their stakeTokens (draw/tie/both exact match)
      if (bet.groupId) {
        await db
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens}` })
          .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, bet.student1Id)));
        await db
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens}` })
          .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, bet.student2Id)));
      } else {
        await db
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}` })
          .where(eq(students.id, bet.student1Id));
        await db
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}` })
          .where(eq(students.id, bet.student2Id));

        await db.insert(tokenLedger).values({
          studentId: bet.student1Id,
          amount: bet.stakeTokens,
          reason: "bet_refund_draw",
          matchId,
        });
        await db.insert(tokenLedger).values({
          studentId: bet.student2Id,
          amount: bet.stakeTokens,
          reason: "bet_refund_draw",
          matchId,
        });
      }
    }
  }
}

export async function settlePredictionsForMatch(matchId: string) {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match || match.status !== "completed") return;
  if (match.team1Score === null || match.team2Score === null) return;

  const unsettled = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.matchId, matchId), eq(predictions.settled, false)));

  for (const pred of unsettled) {
    let earned = 0;
    const actualWinner =
      match.team1Score > match.team2Score ? "home" :
      match.team2Score > match.team1Score ? "away" : "draw";
    const predWinner =
      pred.predictedScore1 > pred.predictedScore2 ? "home" :
      pred.predictedScore2 > pred.predictedScore1 ? "away" : "draw";

    if (actualWinner === predWinner) {
      if (actualWinner === "home" && match.team1Odds) {
        earned += Math.round(10 * match.team1Odds);
      } else if (actualWinner === "away" && match.team2Odds) {
        earned += Math.round(10 * match.team2Odds);
      } else if (actualWinner === "draw") {
        earned += 30; // standard draw odds are usually ~3.0
      } else {
        earned += PREDICTION_CORRECT_TOKENS;
      }
    }
    if (
      pred.predictedScore1 === match.team1Score &&
      pred.predictedScore2 === match.team2Score
    ) {
      earned += PREDICTION_EXACT_TOKENS;
    }

    // Hard cap prediction payouts to 100 tokens
    earned = Math.min(earned, 100);

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(predictions)
        .set({ tokensEarned: earned, settled: true })
        .where(and(eq(predictions.id, pred.id), eq(predictions.settled, false)))
        .returning({ id: predictions.id });
      
      if (updated.length === 0) return;

      if (earned > 0) {
        // Award globally
        await tx
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${earned}` })
          .where(eq(students.id, pred.studentId));

        // Log to token ledger
        await tx.insert(tokenLedger).values({
          studentId: pred.studentId,
          amount: earned,
          reason: "prediction_payout",
          matchId,
        });

        // Award to all friend groups the student is currently in
        const memberships = await tx
          .select({ groupId: groupMembers.groupId })
          .from(groupMembers)
          .where(eq(groupMembers.studentId, pred.studentId));

        if (memberships.length > 0) {
          const groupIds = memberships.map((m) => m.groupId);
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${earned}` })
            .where(and(inArray(groupMembers.groupId, groupIds), eq(groupMembers.studentId, pred.studentId)));
        }
      }
    });
  }
}

export async function checkAndReplenishFloor(studentId: string) {
  return await db.transaction(async (tx) => {
    const [student] = await tx
      .select({
        id: students.id,
        tokenBalance: students.tokenBalance,
        lastFloorReplenishedAt: students.lastFloorReplenishedAt,
      })
      .from(students)
      .where(eq(students.id, studentId))
      .for("update")
      .limit(1);

    if (!student) return null;

    const now = new Date();
    const balance = student.tokenBalance;
    const lastReplenished = student.lastFloorReplenishedAt;
    const isEligible =
      balance < 10 &&
      (!lastReplenished || now.getTime() - lastReplenished.getTime() > 24 * 60 * 60 * 1000);

    if (isEligible) {
      const diff = 10 - balance;
      await tx
        .update(students)
        .set({
          tokenBalance: 10,
          lastFloorReplenishedAt: now,
        })
        .where(eq(students.id, studentId));

      await tx.insert(tokenLedger).values({
        studentId,
        amount: diff,
        reason: "floor_grant",
      });

      return 10;
    }

    return balance;
  });
}
