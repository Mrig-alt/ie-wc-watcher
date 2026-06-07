import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bets, students, matches, groupMembers, tokenLedger } from "@/db/schema";
import { eq, and, or, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { STAKE_TOKENS } from "@/lib/tokens";
import { sendChallengeNotification } from "@/lib/push";

const betSchema = z.object({
  matchId: z.string().uuid(),
  opponentId: z.string().uuid(),
  stakeTokens: z.number().int().min(1).max(500).default(STAKE_TOKENS),
  challengerTeamSide: z.number().int().min(1).max(2).optional().nullable(),
  student1Score1: z.number().int().min(0).max(50).optional().nullable(),
  student1Score2: z.number().int().min(0).max(50).optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.isGuest) {
    return NextResponse.json({ error: "Guests cannot submit bets. Verify your class PIN first." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = betSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { matchId, opponentId, stakeTokens, challengerTeamSide, student1Score1, student1Score2, groupId } = parsed.data;

  if (opponentId === session.user.id) {
    return NextResponse.json({ error: "Cannot bet against yourself" }, { status: 400 });
  }

  // Verify match exists and is upcoming
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (new Date() >= new Date(match.matchDatetime)) {
    return NextResponse.json({ error: "Betting is closed — match has started" }, { status: 403 });
  }
  if (match.status !== "upcoming") {
    return NextResponse.json({ error: "Betting is closed for this match" }, { status: 403 });
  }

  let bet: typeof bets.$inferSelect;
  try {
    bet = await db.transaction(async (tx) => {
      // Check bet doesn't already exist between these two for this match (either direction)
      const existing = await tx
        .select({ id: bets.id })
        .from(bets)
        .where(
          and(
            eq(bets.matchId, matchId),
            or(
              and(eq(bets.student1Id, session.user.id), eq(bets.student2Id, opponentId)),
              and(eq(bets.student1Id, opponentId), eq(bets.student2Id, session.user.id))
            )
          )
        )
        .for("update")
        .limit(1);

      if (existing.length > 0) {
        throw new Error("BET_ALREADY_EXISTS");
      }
      if (groupId) {
        // Group-specific bet validation
        // Sort IDs to prevent deadlocks when locking group members
        const firstMemberId = session.user.id < opponentId ? session.user.id : opponentId;
        const secondMemberId = session.user.id < opponentId ? opponentId : session.user.id;

        const [firstMember] = await tx
          .select({ studentId: groupMembers.studentId, tokenBalance: groupMembers.tokenBalance })
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.studentId, firstMemberId)))
          .for("update")
          .limit(1);

        const [secondMember] = await tx
          .select({ studentId: groupMembers.studentId, tokenBalance: groupMembers.tokenBalance })
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.studentId, secondMemberId)))
          .for("update")
          .limit(1);

        if (!firstMember || !secondMember) {
          const hasChallenger = firstMemberId === session.user.id ? firstMember : secondMember;
          if (!hasChallenger) throw new Error("NOT_IN_GROUP_CHALLENGER");
          throw new Error("NOT_IN_GROUP_OPPONENT");
        }

        const challengerMember = firstMember.studentId === session.user.id ? firstMember : secondMember;
        const opponentMember = firstMember.studentId === opponentId ? firstMember : secondMember;

        if (challengerMember.tokenBalance < stakeTokens) {
          throw new Error("INSUFFICIENT_TOKENS_CHALLENGER");
        }
        if (opponentMember.tokenBalance < stakeTokens) {
          throw new Error("INSUFFICIENT_TOKENS_OPPONENT");
        }

        // Deduct stake ONLY from challenger upfront in the group balance
        await tx
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} - ${stakeTokens}` })
          .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.studentId, session.user.id)));
      } else {
        // Global bet validation
        // Sort IDs to prevent deadlocks when locking student records
        const firstId = session.user.id < opponentId ? session.user.id : opponentId;
        const secondId = session.user.id < opponentId ? opponentId : session.user.id;

        const [firstStudent] = await tx
          .select({ id: students.id, tokenBalance: students.tokenBalance })
          .from(students)
          .where(eq(students.id, firstId))
          .for("update")
          .limit(1);

        const [secondStudent] = await tx
          .select({ id: students.id, tokenBalance: students.tokenBalance })
          .from(students)
          .where(eq(students.id, secondId))
          .for("update")
          .limit(1);

        if (!firstStudent || !secondStudent) {
          throw new Error("OPPONENT_NOT_FOUND");
        }

        const requester = firstStudent.id === session.user.id ? firstStudent : secondStudent;
        const opponent = firstStudent.id === opponentId ? firstStudent : secondStudent;

        if (requester.tokenBalance < stakeTokens) {
          throw new Error("INSUFFICIENT_TOKENS_REQUESTER");
        }
        if (opponent.tokenBalance < stakeTokens) {
          throw new Error("INSUFFICIENT_TOKENS_OPPONENT");
        }

        // Deduct stake ONLY from challenger upfront in global balance
        await tx
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} - ${stakeTokens}` })
          .where(eq(students.id, session.user.id));

        // Log in token ledger
        await tx.insert(tokenLedger).values({
          studentId: session.user.id,
          amount: -stakeTokens,
          reason: "bet_placed",
          matchId,
        });
      }

      const isScore = student1Score1 !== undefined && student1Score1 !== null;
      let student1Id: string;
      let student2Id: string;

      if (isScore) {
        student1Id = session.user.id;
        student2Id = opponentId;
      } else {
        student1Id = challengerTeamSide === 1 ? session.user.id : opponentId;
        student2Id = challengerTeamSide === 1 ? opponentId : session.user.id;
      }

      const [created] = await tx
        .insert(bets)
        .values({
          matchId,
          student1Id,
          student2Id,
          groupId: groupId || null,
          status: "pending",
          challengerTeamSide: isScore ? null : challengerTeamSide,
          stakeTokens,
          student1Score1: isScore ? student1Score1 : null,
          student1Score2: isScore ? student1Score2 : null,
        })
        .returning();

      return created;
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "BET_ALREADY_EXISTS") {
        return NextResponse.json({ error: "Bet already exists" }, { status: 409 });
      }
      if (e.message === "NOT_IN_GROUP_CHALLENGER") {
        return NextResponse.json({ error: "You are not a member of this group" }, { status: 400 });
      }
      if (e.message === "NOT_IN_GROUP_OPPONENT") {
        return NextResponse.json({ error: "Opponent is not a member of this group" }, { status: 400 });
      }
      if (e.message === "INSUFFICIENT_TOKENS_CHALLENGER" || e.message === "INSUFFICIENT_TOKENS_REQUESTER") {
        return NextResponse.json({ error: "Insufficient token balance" }, { status: 400 });
      }
      if (e.message === "INSUFFICIENT_TOKENS_OPPONENT") {
        return NextResponse.json({ error: "Opponent has insufficient tokens to accept this challenge" }, { status: 400 });
      }
      if (e.message === "OPPONENT_NOT_FOUND") {
        return NextResponse.json({ error: "Opponent not found" }, { status: 404 });
      }
    }
    throw e;
  }

  // Send push notification asynchronously
  if (session.user.name) {
    sendChallengeNotification(opponentId, session.user.name, stakeTokens).catch(console.error);
  }

  return NextResponse.json({ bet }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  const groupIdParam = searchParams.get("groupId");
  const userId = session.user.id;

  const userFilter = or(eq(bets.student1Id, userId), eq(bets.student2Id, userId));
  let whereClause;

  if (matchId) {
    if (groupIdParam === "all") {
      whereClause = and(eq(bets.matchId, matchId), userFilter);
    } else if (groupIdParam) {
      whereClause = and(eq(bets.matchId, matchId), eq(bets.groupId, groupIdParam), userFilter);
    } else {
      whereClause = and(eq(bets.matchId, matchId), isNull(bets.groupId), userFilter);
    }
  } else {
    if (groupIdParam === "all") {
      whereClause = userFilter;
    } else if (groupIdParam) {
      whereClause = and(eq(bets.groupId, groupIdParam), userFilter);
    } else {
      whereClause = and(isNull(bets.groupId), userFilter);
    }
  }

  // Fetch bets with student names and match details so the UI doesn't have to map everything manually
  const results = await db
    .select({
      id: bets.id,
      matchId: bets.matchId,
      student1Id: bets.student1Id,
      student2Id: bets.student2Id,
      groupId: bets.groupId,
      status: bets.status,
      challengerTeamSide: bets.challengerTeamSide,
      stakeTokens: bets.stakeTokens,
      winnerId: bets.winnerId,
      settled: bets.settled,
      matchDatetime: matches.matchDatetime,
      statusMatch: matches.status,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
      team1Placeholder: matches.team1Placeholder,
      team2Placeholder: matches.team2Placeholder,
    })
    .from(bets)
    .innerJoin(matches, eq(matches.id, bets.matchId))
    .where(whereClause);

  return NextResponse.json({ bets: results });
}
