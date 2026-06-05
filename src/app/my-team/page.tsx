import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams, matches, connections } from "@/db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import MyTeamClient from "@/components/team/MyTeamClient";
import { calculateGroupStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/join");
  }

  // Get current student profile
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, session.user.id))
    .limit(1);

  if (!student) {
    redirect("/join");
  }

  const lockAt = process.env.LOCK_TEAMS_AT
    ? new Date(process.env.LOCK_TEAMS_AT)
    : new Date("2026-06-11T00:00:00Z");
  const isSelectionLocked = new Date() > lockAt;

  // Fetch all selectable teams (excluding friendly-only teams where group is null)
  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      flagEmoji: teams.flagEmoji,
      group: teams.group,
      confederation: teams.confederation,
    })
    .from(teams)
    .orderBy(teams.name);

  const selectableTeams = allTeams.filter((t) => t.group !== null);

  // If student hasn't selected a team, render picker
  if (!student.teamId) {
    return (
      <MyTeamClient
        selectableTeams={selectableTeams}
        isSelectionLocked={isSelectionLocked}
        currentUserId={student.id}
        hasSelectedTeam={false}
      />
    );
  }

  // User has selected a team, fetch all detailed team information
  const [selectedTeam] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, student.teamId))
    .limit(1);

  if (!selectedTeam) {
    return (
      <MyTeamClient
        selectableTeams={selectableTeams}
        isSelectionLocked={isSelectionLocked}
        currentUserId={student.id}
        hasSelectedTeam={false}
      />
    );
  }

  // Fetch accepted friend connections for privacy filter
  let friendIds = new Set<string>();
  const myConnections = await db
    .select({ requesterId: connections.requesterId, requesteeId: connections.requesteeId })
    .from(connections)
    .where(
      and(
        eq(connections.status, "accepted"),
        or(
          eq(connections.requesterId, student.id),
          eq(connections.requesteeId, student.id)
        )
      )
    );
  for (const c of myConnections) {
    if (c.requesterId !== student.id) friendIds.add(c.requesterId);
    if (c.requesteeId !== student.id) friendIds.add(c.requesteeId);
  }

  // Fetch supporters
  const supportersRaw = await db
    .select({
      id: students.id,
      name: students.name,
      tokenBalance: students.tokenBalance,
      visibility: students.visibility,
    })
    .from(students)
    .where(and(eq(students.teamId, selectedTeam.id), eq(students.flagged, false)));

  let publicSupporters: Array<{ id: string; name: string; tokenBalance: number }> = [];
  let anonymousCount = 0;
  let totalCohortBalance = 0;

  for (const s of supportersRaw) {
    totalCohortBalance += s.tokenBalance;
    const isVisible =
      s.visibility === "public" ||
      s.id === student.id ||
      (s.visibility === "friends" && friendIds.has(s.id));

    if (isVisible) {
      publicSupporters.push({
        id: s.id,
        name: s.name,
        tokenBalance: s.tokenBalance,
      });
    } else {
      anonymousCount++;
    }
  }

  // Sort public supporters by balance desc
  publicSupporters.sort((a, b) => b.tokenBalance - a.tokenBalance);

  // Fetch team matches
  const teamMatches = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      status: matches.status,
      matchDatetime: matches.matchDatetime,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
      team1Score: matches.team1Score,
      team2Score: matches.team2Score,
      team1Placeholder: matches.team1Placeholder,
      team2Placeholder: matches.team2Placeholder,
    })
    .from(matches)
    .where(or(eq(matches.team1Id, selectedTeam.id), eq(matches.team2Id, selectedTeam.id)))
    .orderBy(asc(matches.matchDatetime));

  // Fetch group standings data if team belongs to a group
  let standings: any[] = [];
  if (selectedTeam.group) {
    const groupTeams = allTeams.filter((t) => t.group === selectedTeam.group);
    const groupMatches = await db
      .select({
        id: matches.id,
        stage: matches.stage,
        status: matches.status,
        team1Id: matches.team1Id,
        team2Id: matches.team2Id,
        team1Score: matches.team1Score,
        team2Score: matches.team2Score,
        groupName: matches.groupName,
      })
      .from(matches)
      .where(eq(matches.stage, "group"));

    standings = calculateGroupStandings(selectedTeam.group, groupMatches, groupTeams);
  }

  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const formattedMatches = teamMatches.map((m) => {
    const t1 = m.team1Id ? teamMap.get(m.team1Id) : null;
    const t2 = m.team2Id ? teamMap.get(m.team2Id) : null;
    return {
      id: m.id,
      stage: m.stage,
      status: m.status,
      matchDatetime: m.matchDatetime.toISOString(),
      team1: t1 ? { id: t1.id, name: t1.name, flagEmoji: t1.flagEmoji } : null,
      team2: t2 ? { id: t2.id, name: t2.name, flagEmoji: t2.flagEmoji } : null,
      team1Score: m.team1Score,
      team2Score: m.team2Score,
      team1Placeholder: m.team1Placeholder,
      team2Placeholder: m.team2Placeholder,
    };
  });

  return (
    <MyTeamClient
      hasSelectedTeam={true}
      selectableTeams={selectableTeams}
      isSelectionLocked={isSelectionLocked}
      currentUserId={student.id}
      team={{
        id: selectedTeam.id,
        name: selectedTeam.name,
        flagEmoji: selectedTeam.flagEmoji,
        group: selectedTeam.group,
        confederation: selectedTeam.confederation,
        isEliminated: selectedTeam.isEliminated,
        eliminatedStage: selectedTeam.eliminatedStage,
      }}
      supporters={publicSupporters}
      anonymousSupportersCount={anonymousCount}
      totalCohortBalance={totalCohortBalance}
      matches={formattedMatches}
      standings={standings}
    />
  );
}
