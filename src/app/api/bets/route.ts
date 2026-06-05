import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bets, students, matches } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { STAKE_TOKENS } from "@/lib/tokens";

const betSchema = z.object({
  matchId: z.string().uuid(),
  opponentId: z.string().uuid(),
  stakeTokens: z.number().int().min(1).max(500).default(STAKE_TOKENS),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = betSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { matchId, opponentId, stakeTokens } = parsed.data;

  if (opponentId === session.user.id) {
    return NextResponse.json({ error: "Cannot bet against yourself" }, { status: 400 });
  }

  // Verify match exists and is upcoming
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "upcoming") {
    return NextResponse.json({ error: "Betting is closed for this match" }, { status: 403 });
  }

  // Check requester has enough tokens
  const [requester] = await db
    .select({ tokenBalance: students.tokenBalance })
    .from(students)
    .where(eq(students.id, session.user.id))
    .limit(1);

  if (!requester || requester.tokenBalance < stakeTokens) {
    return NextResponse.json({ error: "Insufficient token balance" }, { status: 400 });
  }

  // Check bet doesn't already exist between these two for this match
  const existing = await db
    .select({ id: bets.id })
    .from(bets)
    .where(
      and(
        eq(bets.matchId, matchId),
        eq(bets.student1Id, session.user.id),
        eq(bets.student2Id, opponentId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "Bet already exists" }, { status: 409 });
  }

  // Deduct stake tokens from requester upfront
  await db
    .update(students)
    .set({ tokenBalance: sql`${students.tokenBalance} - ${stakeTokens}` })
    .where(eq(students.id, session.user.id));

  // Create the bet
  const [bet] = await db
    .insert(bets)
    .values({
      matchId,
      student1Id: session.user.id,
      student2Id: opponentId,
      stakeTokens,
    })
    .returning();

  return NextResponse.json({ bet }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  const results = await db
    .select()
    .from(bets)
    .where(
      matchId
        ? and(eq(bets.matchId, matchId), eq(bets.student1Id, session.user.id))
        : eq(bets.student1Id, session.user.id)
    );

  return NextResponse.json({ bets: results });
}
