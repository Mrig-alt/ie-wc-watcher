import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matches, teams, students, matchReactions, watchInvites, venues, predictions, connections } from "@/db/schema";
import { eq, and, asc, inArray, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatMatchDate, formatKickoff, stageLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ReactionTimeline from "@/components/matches/ReactionTimeline";
import LiveReportsWidget from "@/components/watchmap/LiveReportsWidget";
import MatchDetailPrediction from "@/components/matches/MatchDetailPrediction";
import Link from "next/link";
import { MapPin, ExternalLink, Users } from "lucide-react";
import LocalTime from "@/components/ui/LocalTime";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  if (!match) notFound();

  const teamIds = [match.team1Id, match.team2Id].filter(Boolean) as string[];

  const [fetchedTeams, team1Supporters, team2Supporters, rawInvites, allVenues, reactions, myPrediction] =
    await Promise.all([
      teamIds.length > 0 ? db.select().from(teams).where(inArray(teams.id, teamIds)) : Promise.resolve([]),
      match.team1Id
        ? db.select({ id: students.id, name: students.name }).from(students)
            .where(and(eq(students.teamId, match.team1Id), eq(students.flagged, false), eq(students.visibility, "public")))
        : Promise.resolve([]),
      match.team2Id
        ? db.select({ id: students.id, name: students.name }).from(students)
            .where(and(eq(students.teamId, match.team2Id), eq(students.flagged, false), eq(students.visibility, "public")))
        : Promise.resolve([]),
      db.select({ id: watchInvites.id, inviterId: watchInvites.inviterId, venueId: watchInvites.venueId, locationName: watchInvites.locationName, locationUrl: watchInvites.locationUrl, inviterName: students.name, visibility: students.visibility })
        .from(watchInvites).innerJoin(students, eq(students.id, watchInvites.inviterId)).where(eq(watchInvites.matchId, id)),
      db.select({ id: venues.id, name: venues.name, area: venues.area, mapsUrl: venues.mapsUrl }).from(venues),
      db.select({ id: matchReactions.id, emoji: matchReactions.emoji, matchMinute: matchReactions.matchMinute, createdAt: matchReactions.createdAt, studentId: matchReactions.studentId, studentName: students.name, studentVisibility: students.visibility })
        .from(matchReactions)
        .leftJoin(students, and(eq(students.id, matchReactions.studentId), eq(students.flagged, false)))
        .where(eq(matchReactions.matchId, id)).orderBy(asc(matchReactions.createdAt)),
      session?.user?.id
        ? db.select().from(predictions).where(and(eq(predictions.studentId, session.user.id), eq(predictions.matchId, id))).limit(1)
        : Promise.resolve([]),
    ]);

  const teamMap = new Map(fetchedTeams.map((t) => [t.id, t]));
  const team1 = match.team1Id ? teamMap.get(match.team1Id) ?? null : null;
  const team2 = match.team2Id ? teamMap.get(match.team2Id) ?? null : null;

  const venueMap = new Map(allVenues.map((v) => [v.id, v]));
  const filteredInvites = rawInvites.filter((inv) => {
    if (inv.visibility === "stealth") return false;
    if (inv.visibility === "friends") {
      if (!session?.user?.id) return false;
      if (inv.inviterId === session.user.id) return true;
      return friendIds.has(inv.inviterId);
    }
    return true;
  });

  const venueCounts: Record<string, { name: string; area: string | null; mapsUrl: string | null; url: string | null; count: number; people: string[] }> = {};
  for (const inv of filteredInvites) {
    const key = inv.venueId ?? inv.locationName ?? "Unknown";
    const linked = inv.venueId ? venueMap.get(inv.venueId) : null;
    const name = linked?.name ?? inv.locationName ?? "Unknown";
    if (!venueCounts[key]) venueCounts[key] = { name, area: linked?.area ?? null, mapsUrl: linked?.mapsUrl ?? null, url: inv.locationUrl ?? null, count: 0, people: [] };
    venueCounts[key].count++;
    venueCounts[key].people.push(inv.inviterName);
  }
  const venueBreakdown = Object.values(venueCounts).sort((a, b) => b.count - a.count);

  const enrichedReactions = reactions.map((r) => ({
    ...r,
    studentName: r.studentId === session?.user?.id ? "You" : ((r.studentVisibility === "stealth" || r.studentVisibility === "friends") ? "Anonymous" : (r.studentName ?? "Classmate")),
  }));

  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const isUpcoming = match.status === "upcoming";
  const t1Name = team1?.name ?? match.team1Placeholder ?? "TBD";
  const t2Name = team2?.name ?? match.team2Placeholder ?? "TBD";

  const existingPrediction = (myPrediction as Array<typeof myPrediction[0]>)[0] ?? null;
  const cutoffTime = new Date(new Date(match.matchDatetime).getTime() - 30 * 60 * 1000);
  const canPredict = !!session?.user?.id && isUpcoming && !!team1 && !!team2 && new Date() < cutoffTime;
  const loginReturnUrl = `/join?next=/matches/${id}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>

      {/* Match header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">{stageLabel(match.stage)}{match.groupName && ` · Group ${match.groupName}`}</span>
          <div className="flex items-center gap-2">
            {isLive && <Badge variant="live">LIVE</Badge>}
            <span className="text-xs text-gray-400"><LocalTime datetime={match.matchDatetime} mode="full" /></span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-5xl">{team1?.flagEmoji ?? "🏳️"}</span>
            <span className="text-sm font-semibold text-center">{t1Name}</span>
            {match.team1Odds != null && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-sm mt-1">
                {match.team1Odds.toFixed(2)}x
              </span>
            )}
            <div className="flex flex-wrap justify-center gap-1 mt-1">
              {team1Supporters.map((s) => (<span key={s.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{s.name.split(" ")[0]}</span>))}
            </div>
          </div>
          <div className="flex flex-col items-center shrink-0">
            {isCompleted || isLive ? (
              match.team1Score !== null && match.team2Score !== null
                ? <span className="text-3xl font-bold">{match.team1Score}–{match.team2Score}</span>
                : <span className="text-xl text-gray-400">Live</span>
            ) : <span className="text-xl text-gray-400">vs</span>}
            {match.city && <span className="text-xs text-gray-400 mt-1">{match.city}</span>}
          </div>
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-5xl">{team2?.flagEmoji ?? "🏳️"}</span>
            <span className="text-sm font-semibold text-center">{t2Name}</span>
            {match.team2Odds != null && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-sm mt-1">
                {match.team2Odds.toFixed(2)}x
              </span>
            )}
            <div className="flex flex-wrap justify-center gap-1 mt-1">
              {team2Supporters.map((s) => (<span key={s.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{s.name.split(" ")[0]}</span>))}
            </div>
          </div>
        </div>
      </div>

      {/* Prediction card — client component handles collapse/expand + token refresh */}
      {canPredict && (
        <MatchDetailPrediction
          matchId={id}
          team1={team1!}
          team2={team2!}
          hasOdds={match.team1Odds != null || match.team2Odds != null || match.drawOdds != null}
          existing={
            existingPrediction
              ? { predictedScore1: existingPrediction.predictedScore1, predictedScore2: existingPrediction.predictedScore2 }
              : null
          }
        />
      )}

      {/* Logged-out CTA */}
      {!session?.user?.id && isUpcoming && team1 && team2 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-500">
          <Link href={loginReturnUrl} className="text-green-600 font-medium hover:underline">
            Join the class
          </Link>{" "}
          to predict scores and earn tokens
        </div>
      )}

      {/* Where people are watching */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-500" /> Where people are watching
          {filteredInvites.length > 0 && <span className="text-xs font-normal text-gray-400 flex items-center gap-1"><Users className="h-3.5 w-3.5" />{filteredInvites.length} going</span>}
        </h2>
        {venueBreakdown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            No watch plans yet.
            {match.status !== "completed" && <Link href="/watchmap" className="ml-1 text-green-600 font-medium hover:underline">Add yours &rarr;</Link>}
          </div>
        ) : (
          <div className="space-y-2">
            {venueBreakdown.map((v) => (
              <div key={v.name} className="rounded-xl border border-gray-100 bg-white shadow-sm px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900">{v.name}</span>
                      {v.area && <span className="text-xs text-gray-400">· {v.area}</span>}
                      {(v.mapsUrl || v.url) && (
                        <a href={v.mapsUrl ?? v.url ?? ""} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-gray-400 hover:text-green-600" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-5">{v.people.join(", ")}</div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{v.count} going</span>
                </div>
              </div>
            ))}
            {match.status !== "completed" && <Link href="/watchmap" className="block text-center text-xs text-green-600 hover:underline pt-1">Update your plan &rarr;</Link>}
          </div>
        )}
      </section>

      {/* Reactions */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">{isLive ? "🔴 Live reactions" : "Reactions"}</h2>
        {session ? (
          <ReactionTimeline matchId={id} reactions={enrichedReactions} isLive={isLive} />
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
            <Link href={loginReturnUrl} className="text-green-600 font-medium hover:underline">Join the class</Link> to drop reactions
          </div>
        )}
      </section>

      <div className="border-t border-gray-100 pt-4">
        <LiveReportsWidget
          currentUserId={session?.user?.id ?? null}
          matchId={id}
          matchDatetime={match.matchDatetime}
          knownVenues={allVenues.map((v) => ({ id: v.id, name: v.name, area: v.area }))}
        />
      </div>
    </div>
  );
}
