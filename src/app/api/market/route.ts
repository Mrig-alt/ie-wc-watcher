import { NextResponse } from "next/server";
import { db } from "@/db";
import { bets, matches, students, teams } from "@/db/schema";
import { eq, and, isNull, desc, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const offset = (page - 1) * PAGE_SIZE;

    // Fetch open market bets that are pending, not null opponent, and match is still upcoming
    const openBetsRaw = await db
      .select({
        id: bets.id,
        stakeTokens: bets.stakeTokens,
        challengerTeamSide: bets.challengerTeamSide,
        student1Score1: bets.student1Score1,
        student1Score2: bets.student1Score2,
        challengerId: bets.student1Id,
        challengerName: students.name,
        matchId: bets.matchId,
        matchDatetime: matches.matchDatetime,
        team1Id: matches.team1Id,
        team2Id: matches.team2Id,
      })
      .from(bets)
      .innerJoin(students, eq(bets.student1Id, students.id))
      .innerJoin(matches, eq(bets.matchId, matches.id))
      .where(
        and(
          eq(bets.isOpenMarket, true),
          eq(bets.status, "pending"),
          isNull(bets.student2Id),
          gte(matches.matchDatetime, new Date())
        )
      )
      .orderBy(desc(bets.id))
      .limit(PAGE_SIZE + 1)
      .offset(offset);

    const hasMore = openBetsRaw.length > PAGE_SIZE;
    const page_bets = openBetsRaw.slice(0, PAGE_SIZE);

    // Fetch teams for the matches
    const allTeams = await db.select().from(teams);
    const teamMap = new Map(allTeams.map((t) => [t.id, t]));

    const openBets = page_bets.map((bet) => {
      const t1 = bet.team1Id ? teamMap.get(bet.team1Id) : null;
      const t2 = bet.team2Id ? teamMap.get(bet.team2Id) : null;
      return {
        id: bet.id,
        stakeTokens: bet.stakeTokens,
        challengerTeamSide: bet.challengerTeamSide,
        student1Score1: bet.student1Score1,
        student1Score2: bet.student1Score2,
        challengerId: bet.challengerId,
        challengerName: bet.challengerName,
        matchId: bet.matchId,
        matchDatetime: bet.matchDatetime,
        team1: t1 ? { name: t1.name, flagEmoji: t1.flagEmoji } : null,
        team2: t2 ? { name: t2.name, flagEmoji: t2.flagEmoji } : null,
        isMine: bet.challengerId === session?.user?.id,
      };
    });

    return NextResponse.json({ openBets, hasMore });
  } catch (e) {
    console.error("[market api] error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
