import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bets, friendGroups, groupMembers, matches, students, teams } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.studentId, session.user.id)));

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Group details
  const [group] = await db.select().from(friendGroups).where(eq(friendGroups.id, id));
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Members with token balances
  const profitSql = sql<number>`${groupMembers.tokenBalance} + ${groupMembers.escrowTokens} - ${groupMembers.totalTokensReceived}`.mapWith(Number);
  const members = await db
    .select({
      studentId: groupMembers.studentId,
      name: students.name,
      tokenBalance: groupMembers.tokenBalance,
      escrowTokens: groupMembers.escrowTokens,
      profit: profitSql,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(students, eq(students.id, groupMembers.studentId))
    .where(eq(groupMembers.groupId, id))
    .orderBy(desc(profitSql));

  // Active bets in this group
  const s1 = alias(students, "s1");
  const s2 = alias(students, "s2");

  const groupBets = await db
    .select({
      id: bets.id,
      status: bets.status,
      stakeTokens: bets.stakeTokens,
      settled: bets.settled,
      student1Id: bets.student1Id,
      student2Id: bets.student2Id,
      challengerTeamSide: bets.challengerTeamSide,
      student1Name: s1.name,
      student2Name: s2.name,
      matchId: matches.id,
      matchDatetime: matches.matchDatetime,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
      team1Placeholder: matches.team1Placeholder,
      team2Placeholder: matches.team2Placeholder,
      team1Odds: matches.team1Odds,
      team2Odds: matches.team2Odds,
    })
    .from(bets)
    .innerJoin(matches, eq(matches.id, bets.matchId))
    .innerJoin(s1, eq(s1.id, bets.student1Id))
    .innerJoin(s2, eq(s2.id, bets.student2Id))
    .where(and(eq(bets.groupId, id), eq(bets.settled, false)))
    .orderBy(desc(matches.matchDatetime));

  // Team names for match display
  const allTeams = await db.select({ id: teams.id, name: teams.name, flagEmoji: teams.flagEmoji }).from(teams);

  return NextResponse.json({ group, members, bets: groupBets, teams: allTeams });
}
