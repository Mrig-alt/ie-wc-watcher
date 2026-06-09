import { db } from "@/db";
import { students, bets, predictions, matches, groupMembers, tokenLedger } from "@/db/schema";
import { eq, and, or, isNull, sql, inArray } from "drizzle-orm";

export * from "./constants";

export async function settleBetsForMatch(matchId: string) {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match || match.status !== "completed") return;
  if (match.team1Score === null || match.team2Score === null) return;

  const unsettledBets = await db
    .select()
    .from(bets)
    .where(and(eq(bets.matchId, matchId), eq(bets.settled, false)));

  for (const bet of unsettledBets) {
    await db.transaction(async (tx) => {
      if (bet.status === "pending") {
        // Pending bet expires since match has started
        const updated = await tx
          .update(bets)
          .set({ settled: true, status: "expired" })
          .where(and(eq(bets.id, bet.id), eq(bets.settled, false)))
          .returning({ id: bets.id });
        if (updated.length === 0) return;

        const challengerId = bet.challengerTeamSide === 1 ? bet.student1Id : bet.student2Id;
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
            reason: "bet_refund_expired",
            matchId,
          });
        }
        return;
      }

      let winnerId: string | null = null;
      let payoutType: "full" | "half" | "refund" = "full";

      const isScoreChallenge = bet.student1Score1 !== null && bet.student1Score2 !== null;

      if (isScoreChallenge) {
        const s1_1 = bet.student1Score1!;
        const s1_2 = bet.student1Score2!;
        const s2_1 = bet.student2Score1 ?? 0;
        const s2_2 = bet.student2Score2 ?? 0;

        const err1 = Math.abs(s1_1 - match.team1Score!) + Math.abs(s1_2 - match.team2Score!);
        const err2 = Math.abs(s2_1 - match.team1Score!) + Math.abs(s2_2 - match.team2Score!);

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
        let matchWinner: 1 | 2 | null = null;
        if (match.team1Score! > match.team2Score!) {
          matchWinner = 1;
        } else if (match.team2Score! > match.team1Score!) {
          matchWinner = 2;
        } else if (match.team1Penalties !== null && match.team2Penalties !== null) {
          if (match.team1Penalties > match.team2Penalties) {
            matchWinner = 1;
          } else if (match.team2Penalties > match.team1Penalties) {
            matchWinner = 2;
          }
        }

        let winnerOdds = 2.0;
        if (matchWinner === 1) {
          winnerId = bet.challengerTeamSide === 1 ? bet.student1Id : bet.student2Id;
          winnerOdds = match.team1Odds ?? 2.0;
        } else if (matchWinner === 2) {
          winnerId = bet.challengerTeamSide === 2 ? bet.student1Id : bet.student2Id;
          winnerOdds = match.team2Odds ?? 2.0;
        } else {
          winnerId = null;
        }
        
        payoutType = winnerId ? "full" : "refund";
        (bet as any).winnerOdds = winnerOdds; // store locally for payout calculation
      }

      // CAS guard: only update if still unsettled
      const updated = await tx
        .update(bets)
        .set({ settled: true, winnerId })
        .where(and(eq(bets.id, bet.id), eq(bets.settled, false)))
        .returning({ id: bets.id });
      if (updated.length === 0) return;

      if (!bet.groupId) {
        // Decrease escrowTokens for both participants globally
        await tx
          .update(students)
          .set({ escrowTokens: sql`${students.escrowTokens} - ${bet.stakeTokens}` })
          .where(or(eq(students.id, bet.student1Id), eq(students.id, bet.student2Id)));
      } else {
        // Decrease escrowTokens for both participants locally in the group
        await tx
          .update(groupMembers)
          .set({ escrowTokens: sql`${groupMembers.escrowTokens} - ${bet.stakeTokens}` })
          .where(and(eq(groupMembers.groupId, bet.groupId), or(eq(groupMembers.studentId, bet.student1Id), eq(groupMembers.studentId, bet.student2Id))));
      }

      // Execute payouts
      if (payoutType === "full" && winnerId) {
        const payoutAmount = Math.round(bet.stakeTokens * ((bet as any).winnerOdds ?? 2.0));
        if (bet.groupId) {
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${payoutAmount}` })
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, winnerId)));
        } else {
          await tx
            .update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} + ${payoutAmount}` })
            .where(eq(students.id, winnerId));

          await tx.insert(tokenLedger).values({
            studentId: winnerId,
            amount: payoutAmount,
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
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${winnerRefund}` })
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, winnerId)));
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${loserRefund}` })
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, loserId)));
        } else {
          await tx
            .update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} + ${winnerRefund}` })
            .where(eq(students.id, winnerId));
          await tx
            .update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} + ${loserRefund}` })
            .where(eq(students.id, loserId));

          await tx.insert(tokenLedger).values({
            studentId: winnerId,
            amount: winnerRefund,
            reason: "bet_payout_half_win",
            matchId,
          });
          await tx.insert(tokenLedger).values({
            studentId: loserId,
            amount: loserRefund,
            reason: "bet_payout_half_loss",
            matchId,
          });
        }
      } else {
        // Refund both players their stakeTokens (draw/tie/both exact match)
        if (bet.groupId) {
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens}` })
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, bet.student1Id)));
          await tx
            .update(groupMembers)
            .set({ tokenBalance: sql`${groupMembers.tokenBalance} + ${bet.stakeTokens}` })
            .where(and(eq(groupMembers.groupId, bet.groupId), eq(groupMembers.studentId, bet.student2Id)));
        } else {
          await tx
            .update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}` })
            .where(eq(students.id, bet.student1Id));
          await tx
            .update(students)
            .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}` })
            .where(eq(students.id, bet.student2Id));

          await tx.insert(tokenLedger).values({
            studentId: bet.student1Id,
            amount: bet.stakeTokens,
            reason: "bet_refund_draw",
            matchId,
          });
          await tx.insert(tokenLedger).values({
            studentId: bet.student2Id,
            amount: bet.stakeTokens,
            reason: "bet_refund_draw",
            matchId,
          });
        }
      }
    });
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
    let actualWinner =
      match.team1Score > match.team2Score ? "home" :
      match.team2Score > match.team1Score ? "away" : "draw";

    // Factor in penalties for knockout stage matches
    if (actualWinner === "draw" && match.team1Penalties !== null && match.team2Penalties !== null) {
      if (match.team1Penalties > match.team2Penalties) {
        actualWinner = "home";
      } else if (match.team2Penalties > match.team1Penalties) {
        actualWinner = "away";
      }
    }

    const predWinner =
      pred.predictedScore1 > pred.predictedScore2 ? "home" :
      pred.predictedScore2 > pred.predictedScore1 ? "away" : "draw";

    const hasOdds = !!(match.team1Odds || match.team2Odds || match.drawOdds);
    
    // Predictions don't currently require an upfront stake, so they default to 0 in the DB.
    // To calculate odds-based payouts, we assume a base stake of 10 tokens.
    const BASE_ODDS_STAKE = 10;
    const actualStake = pred.stakeTokens ?? 0;
    
    let applicableOdds = 1.0; 
    if (actualWinner === "home" && match.team1Odds) applicableOdds = match.team1Odds;
    if (actualWinner === "away" && match.team2Odds) applicableOdds = match.team2Odds;
    if (actualWinner === "draw" && match.drawOdds) applicableOdds = match.drawOdds;

    if (actualWinner === predWinner) {
      if (
        pred.predictedScore1 === match.team1Score &&
        pred.predictedScore2 === match.team2Score
      ) {
        // Exact Score Reward
        if (hasOdds) {
          earned = Math.round(BASE_ODDS_STAKE * applicableOdds);
        } else {
          earned = actualStake + PREDICTION_EXACT_TOKENS;
        }
      } else {
        // Correct Outcome Reward
        if (hasOdds) {
          earned = Math.round((BASE_ODDS_STAKE * applicableOdds) / 2);
        } else {
          earned = actualStake + PREDICTION_CORRECT_TOKENS;
        }
      }
    } else {
      earned = 0; // Lost the prediction
    }

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(predictions)
        .set({ tokensEarned: earned, settled: true })
        .where(and(eq(predictions.id, pred.id), eq(predictions.settled, false)))
        .returning({ id: predictions.id });
      
      if (updated.length === 0) return;

      if (actualStake > 0) {
        await tx
          .update(students)
          .set({ escrowTokens: sql`${students.escrowTokens} - ${actualStake}` })
          .where(eq(students.id, pred.studentId));
      }

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
        isGuest: students.isGuest,
      })
      .from(students)
      .where(eq(students.id, studentId))
      .for("update")
      .limit(1);

    if (!student || student.isGuest) return null;

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
