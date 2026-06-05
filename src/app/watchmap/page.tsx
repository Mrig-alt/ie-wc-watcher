import { db } from "@/db";
import { watchInvites, venues, matches, teams, students, connections } from "@/db/schema";
import { eq, asc, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import WatchMapClient from "@/components/watchmap/WatchMapClient";

export const dynamic = "force-dynamic";

export default async function WatchMapPage() {
  const session = await auth();

  let friendIds = new Set<string>();
  if (session?.user?.id) {
    const myConnections = await db
      .select({ requesterId: connections.requesterId, requesteeId: connections.requesteeId })
      .from(connections)
      .where(
        and(
          eq(connections.status, "accepted"),
          or(
            eq(connections.requesterId, session.user.id),
            eq(connections.requesteeId, session.user.id)
          )
        )
      );
    for (const c of myConnections) {
      if (c.requesterId !== session.user.id) friendIds.add(c.requesterId);
      if (c.requesteeId !== session.user.id) friendIds.add(c.requesteeId);
    }
  }

  // Scope to upcoming/live matches only and filter flagged inviters — prevents full table scan
  const allInvitesRaw = await db
    .select({
      id: watchInvites.id,
      matchId: watchInvites.matchId,
      inviterId: watchInvites.inviterId,
      venueId: watchInvites.venueId,
      locationName: watchInvites.locationName,
      locationUrl: watchInvites.locationUrl,
      inviterName: students.name,
      visibility: students.visibility,
    })
    .from(watchInvites)
    .innerJoin(students, eq(students.id, watchInvites.inviterId))
    .innerJoin(matches, eq(matches.id, watchInvites.matchId))
    .where(and(eq(students.flagged, false), or(eq(matches.status, "upcoming"), eq(matches.status, "live"))));

  const allInvites = allInvitesRaw.filter((inv) => {
    if (inv.visibility === "stealth") return false;
    if (inv.visibility === "friends") {
      if (!session?.user?.id) return false;
      if (inv.inviterId === session.user.id) return true;
      return friendIds.has(inv.inviterId);
    }
    return true;
  });

  const allMatches = await db
    .select({
      id: matches.id,
      matchDatetime: matches.matchDatetime,
      stage: matches.stage,
      groupName: matches.groupName,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
      team1Placeholder: matches.team1Placeholder,
      team2Placeholder: matches.team2Placeholder,
      status: matches.status,
    })
    .from(matches)
    .orderBy(asc(matches.matchDatetime));

  const allTeams = await db
    .select({ id: teams.id, name: teams.name, flagEmoji: teams.flagEmoji })
    .from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const allVenues = await db
    .select({ id: venues.id, name: venues.name, area: venues.area, mapsUrl: venues.mapsUrl })
    .from(venues);
  const venueMap = new Map(allVenues.map((v) => [v.id, v]));
  const matchMap = new Map(allMatches.map((m) => [m.id, m]));

  // My existing watch plans (for logged-in user)
  const myPlans = session?.user?.id
    ? await db
        .select({
          matchId: watchInvites.matchId,
          locationName: watchInvites.locationName,
          venueId: watchInvites.venueId,
        })
        .from(watchInvites)
        .where(eq(watchInvites.inviterId, session.user.id))
    : [];

  // ── Hottest matches
  const invitesByMatch = new Map<string, typeof allInvites>();
  for (const inv of allInvites) {
    if (!invitesByMatch.has(inv.matchId)) invitesByMatch.set(inv.matchId, []);
    invitesByMatch.get(inv.matchId)!.push(inv);
  }

  const hottestMatches = allMatches
    .filter((m) => (invitesByMatch.get(m.id)?.length ?? 0) > 0)
    .map((m) => {
      const invites = invitesByMatch.get(m.id) ?? [];
      const t1 = m.team1Id ? teamMap.get(m.team1Id) : null;
      const t2 = m.team2Id ? teamMap.get(m.team2Id) : null;

      const venueCounts: Record<string, { name: string; url: string | null; mapsUrl: string | null; count: number; people: string[] }> = {};
      for (const inv of invites) {
        const key = inv.venueId ?? inv.locationName ?? "Unknown";
        const linked = inv.venueId ? venueMap.get(inv.venueId) : null;
        const venueName = linked?.name ?? inv.locationName ?? "Unknown";
        const mapsUrl = linked?.mapsUrl ?? null;
        if (!venueCounts[key]) venueCounts[key] = { name: venueName, url: inv.locationUrl ?? null, mapsUrl, count: 0, people: [] };
        venueCounts[key].count++;
        venueCounts[key].people.push(inv.inviterName);
      }

      return {
        matchId: m.id,
        matchDatetime: m.matchDatetime.toISOString(),
        stage: m.stage,
        groupName: m.groupName ?? null,
        status: m.status,
        team1Name: t1?.name ?? m.team1Placeholder ?? "TBD",
        team2Name: t2?.name ?? m.team2Placeholder ?? "TBD",
        team1Flag: t1?.flagEmoji ?? "🏳️",
        team2Flag: t2?.flagEmoji ?? "🏳️",
        totalPeople: invites.length,
        venueBreakdown: Object.values(venueCounts).sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.totalPeople - a.totalPeople);

  // ── Top bars
  const barCounts: Record<string, {
    venueId: string | null; name: string; area: string | null; mapsUrl: string | null;
    totalPeople: number;
    byMatch: { matchId: string; team1Name: string; team2Name: string; team1Flag: string; team2Flag: string; matchDatetime: string; people: string[] }[];
  }> = {};

  for (const inv of allInvites) {
    const key = inv.venueId ?? inv.locationName ?? "Unknown";
    const linked = inv.venueId ? venueMap.get(inv.venueId) : null;
    const name = linked?.name ?? inv.locationName ?? "Unknown";
    const area = linked?.area ?? null;
    const mapsUrl = linked?.mapsUrl ?? null;
    if (!barCounts[key]) barCounts[key] = { venueId: inv.venueId ?? null, name, area, mapsUrl, totalPeople: 0, byMatch: [] };
    barCounts[key].totalPeople++;
    const match = matchMap.get(inv.matchId);
    if (match) {
      const t1 = match.team1Id ? teamMap.get(match.team1Id) : null;
      const t2 = match.team2Id ? teamMap.get(match.team2Id) : null;
      let matchEntry = barCounts[key].byMatch.find((bm) => bm.matchId === inv.matchId);
      if (!matchEntry) {
        matchEntry = {
          matchId: match.id,
          team1Name: t1?.name ?? match.team1Placeholder ?? "TBD",
          team2Name: t2?.name ?? match.team2Placeholder ?? "TBD",
          team1Flag: t1?.flagEmoji ?? "🏳️",
          team2Flag: t2?.flagEmoji ?? "🏳️",
          matchDatetime: match.matchDatetime.toISOString(),
          people: [],
        };
        barCounts[key].byMatch.push(matchEntry);
      }
      matchEntry.people.push(inv.inviterName);
    }
  }

  const topBars = Object.values(barCounts)
    .sort((a, b) => b.totalPeople - a.totalPeople)
    .map((bar) => ({ ...bar, byMatch: bar.byMatch.sort((a, b) => b.people.length - a.people.length) }));

  // Shape matches for the update sheet
  const matchesForSheet = allMatches
    .filter((m) => m.status === "upcoming" || m.status === "live")
    .map((m) => {
      const t1 = m.team1Id ? teamMap.get(m.team1Id) : null;
      const t2 = m.team2Id ? teamMap.get(m.team2Id) : null;
      return {
        id: m.id,
        team1Name: t1?.name ?? m.team1Placeholder ?? "TBD",
        team2Name: t2?.name ?? m.team2Placeholder ?? "TBD",
        team1Flag: t1?.flagEmoji ?? "🏳️",
        team2Flag: t2?.flagEmoji ?? "🏳️",
        matchDatetime: m.matchDatetime.toISOString(),
      };
    });

  return (
    <WatchMapClient
      hottestMatches={hottestMatches}
      topBars={topBars}
      currentUserId={session?.user?.id ?? null}
      matchesForSheet={matchesForSheet}
      venuesForSheet={allVenues}
      myPlans={myPlans}
    />
  );
}
