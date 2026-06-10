import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bets, friendGroups, groupMembers, matches, students, teams } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { redirect, notFound } from "next/navigation";
import GroupDetailClient from "@/components/students/GroupDetailClient";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.studentId, session.user.id)));

  if (!membership) notFound();

  const [group] = await db.select().from(friendGroups).where(eq(friendGroups.id, id));
  if (!group) notFound();

  const profitSql = sql<number>`${groupMembers.tokenBalance} + ${groupMembers.escrowTokens} - ${groupMembers.totalTokensReceived}`;
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
      student1Score1: bets.student1Score1,
      student1Score2: bets.student1Score2,
      student2Score1: bets.student2Score1,
      student2Score2: bets.student2Score2,
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

  const allTeams = await db
    .select({ id: teams.id, name: teams.name, flagEmoji: teams.flagEmoji })
    .from(teams);

  return (
    <GroupDetailClient
      groupId={id}
      groupName={group.name}
      inviteCode={group.inviteCode}
      isOwner={group.createdBy === session.user.id}
      members={members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() }))}
      bets={groupBets.map((b) => ({ ...b, student2Id: b.student2Id!, matchDatetime: b.matchDatetime.toISOString() }))}
      teams={allTeams}
      currentUserId={session.user.id}
    />
  );
}
