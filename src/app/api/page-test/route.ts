import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matches, teams, students, predictions, watchInvites, bets, friendGroups } from "@/db/schema";
import { eq, and, gte, lte, asc, inArray, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getMadridTodayRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const log: string[] = [];
  log.push("Starting page-test");
  
  try {
    log.push("Calling auth()");
    const session = await auth();
    log.push("auth() completed");
    
    const validSession = session?.user?.id ? session : null;
    
    const { start: todayStart, end: todayEnd } = getMadridTodayRange();
    
    log.push("Querying todayMatches");
    const todayMatches = await db
      .select({
        id: matches.id, matchDatetime: matches.matchDatetime, status: matches.status,
        stage: matches.stage, groupName: matches.groupName,
        team1Score: matches.team1Score, team2Score: matches.team2Score,
        venue: matches.venue, city: matches.city,
        team1Placeholder: matches.team1Placeholder, team2Placeholder: matches.team2Placeholder,
        team1Id: matches.team1Id, team2Id: matches.team2Id,
      })
      .from(matches)
      .where(and(gte(matches.matchDatetime, todayStart), lte(matches.matchDatetime, todayEnd)))
      .orderBy(asc(matches.matchDatetime));
    log.push(`todayMatches query done, count: ${todayMatches.length}`);
    
    const todayMatchIds = todayMatches.map((m) => m.id);
    const challenger = alias(students, "challenger");
    
    log.push("Starting Promise.all");
    const [allTeams, allStudents, myPredictions, todayInvites, pendingChallenges] = await Promise.all([
      db.select().from(teams),
      db
        .select({ id: students.id, name: students.name, teamId: students.teamId, visibility: students.visibility, lastSeenAt: students.lastSeenAt })
        .from(students)
        .where(eq(students.flagged, false)),
      validSession
        ? db.select().from(predictions).where(eq(predictions.studentId, validSession.user.id))
        : Promise.resolve([]),
      todayMatchIds.length > 0
        ? db
            .select({
              inviterId: watchInvites.inviterId,
              matchId: watchInvites.matchId,
              locationName: watchInvites.locationName,
              locationUrl: watchInvites.locationUrl,
            })
            .from(watchInvites)
            .where(inArray(watchInvites.matchId, todayMatchIds))
        : Promise.resolve([]),
      validSession
        ? db
            .select({
              id: bets.id,
              stakeTokens: bets.stakeTokens,
              challengerName: challenger.name,
              matchDatetime: matches.matchDatetime,
              team1Id: matches.team1Id,
              team2Id: matches.team2Id,
              team1Placeholder: matches.team1Placeholder,
              team2Placeholder: matches.team2Placeholder,
              groupId: bets.groupId,
              student1Score1: bets.student1Score1,
              student1Score2: bets.student1Score2,
            })
            .from(bets)
            .innerJoin(matches, eq(matches.id, bets.matchId))
            .innerJoin(challenger, eq(challenger.id, bets.student1Id))
            .where(
              and(
                eq(bets.student2Id, validSession.user.id),
                eq(bets.status, "pending"),
                eq(bets.settled, false)
              )
            )
            .orderBy(desc(matches.matchDatetime))
        : Promise.resolve([]),
    ]);
    log.push("Promise.all completed");
    
    return NextResponse.json({
      success: true,
      log,
      counts: {
        teams: allTeams.length,
        students: allStudents.length,
        predictions: myPredictions.length,
        invites: todayInvites.length,
        challenges: pendingChallenges.length
      }
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      log,
      error: String(e)
    });
  }
}
