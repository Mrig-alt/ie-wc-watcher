import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bets, predictions, matches, students } from "@/db/schema";
import { eq, or, and, desc, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    const userBets = await db
      .select({
        id: bets.id,
        matchId: bets.matchId,
        stakeTokens: bets.stakeTokens,
        status: bets.status,
        settled: bets.settled,
        winnerId: bets.winnerId,
        student1Id: bets.student1Id,
        student2Id: bets.student2Id,
        matchDatetime: matches.matchDatetime,
        team1Score: matches.team1Score,
        team2Score: matches.team2Score,
        opponentName: students.name,
      })
      .from(bets)
      .innerJoin(matches, eq(bets.matchId, matches.id))
      .leftJoin(students, eq(students.id, 
        sql`CASE WHEN ${bets.student1Id} = ${userId} THEN ${bets.student2Id} ELSE ${bets.student1Id} END`
      ))
      .where(or(eq(bets.student1Id, userId), eq(bets.student2Id, userId)));

    const userPredictions = await db
      .select({
        id: predictions.id,
        matchId: predictions.matchId,
        predictedScore1: predictions.predictedScore1,
        predictedScore2: predictions.predictedScore2,
        settled: predictions.settled,
        createdAt: predictions.createdAt,
        matchDatetime: matches.matchDatetime,
        team1Score: matches.team1Score,
        team2Score: matches.team2Score,
      })
      .from(predictions)
      .innerJoin(matches, eq(predictions.matchId, matches.id))
      .where(eq(predictions.studentId, userId))
      .orderBy(desc(predictions.createdAt));

    return NextResponse.json({ bets: userBets, predictions: userPredictions });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
