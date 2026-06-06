"use client";

import { useEffect, useState } from "react";
import MatchCard from "@/components/matches/MatchCard";
import { formatMatchDate } from "@/lib/utils";

type Match = any;

interface ScheduleMatchesListProps {
  allMatches: Match[];
  allStudents: any[];
  allTeams: any[];
  validSession: any;
  myPredictions: any[];
  allInvites: any[];
  initialGrouped: { day: string; matches: Match[] }[];
}

export default function ScheduleMatchesList({
  allMatches,
  allStudents,
  allTeams,
  validSession,
  myPredictions,
  allInvites,
  initialGrouped,
}: ScheduleMatchesListProps) {
  const [grouped, setGrouped] = useState<{ day: string; matches: Match[] }[]>(initialGrouped);

  useEffect(() => {
    const clientGrouped = new Map<string, Match[]>();
    for (const m of allMatches) {
      const dt = new Date(m.matchDatetime);
      const day = formatMatchDate(dt);
      if (!clientGrouped.has(day)) clientGrouped.set(day, []);
      clientGrouped.get(day)!.push(m);
    }
    setGrouped(
      Array.from(clientGrouped.entries()).map(([day, matches]) => ({
        day,
        matches,
      }))
    );
  }, [allMatches]);

  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-8">
      {grouped.map(({ day, matches: dayMatches }) => (
        <section key={day}>
          <h2 className="text-base font-semibold text-gray-700 mb-3 sticky top-14 bg-gray-50 py-1">{day}</h2>
          <div className="space-y-3">
            {dayMatches.map((match) => {
              const t1 = match.team1Id ? teamMap.get(match.team1Id) ?? null : null;
              const t2 = match.team2Id ? teamMap.get(match.team2Id) ?? null : null;

              const team1Supporters = match.team1Id !== null
                ? allStudents.filter((s) => s.teamId === match.team1Id && s.visibility !== "stealth")
                : [];
              const team2Supporters = match.team2Id !== null
                ? allStudents.filter((s) => s.teamId === match.team2Id && s.visibility !== "stealth")
                : [];
              const isOnTeam1 = validSession?.user.teamId === match.team1Id;
              const isOnTeam2 = validSession?.user.teamId === match.team2Id;

              const myInvite = validSession
                ? allInvites.find((i) => i.matchId === match.id && i.inviterId === validSession.user.id)
                : null;
              const myPred = myPredictions.find((p) => p.matchId === match.id);

              const opponentTeamSupporters = isOnTeam1 ? team2Supporters : isOnTeam2 ? team1Supporters : [];
              const opponentInviteRaw = allInvites.find(
                (i) => i.matchId === match.id && opponentTeamSupporters.map((s) => s.id).includes(i.inviterId)
              );
              const opponentInviter = opponentInviteRaw
                ? allStudents.find((s) => s.id === opponentInviteRaw.inviterId)
                : null;

              const fullMatch = {
                ...match,
                team1: t1 ? { id: t1.id, name: t1.name, flagEmoji: t1.flagEmoji } : null,
                team2: t2 ? { id: t2.id, name: t2.name, flagEmoji: t2.flagEmoji } : null,
              };

              return (
                <MatchCard
                  key={match.id}
                  match={fullMatch}
                  team1Supporters={team1Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt }))}
                  team2Supporters={team2Supporters.map((s) => ({ id: s.id, name: s.name, lastSeenAt: s.lastSeenAt }))}
                  currentUserId={validSession?.user.id}
                  currentUserTeamId={validSession?.user.teamId}
                  currentUserIsGuest={validSession?.user.isGuest}
                  prediction={myPred ? { predictedScore1: myPred.predictedScore1, predictedScore2: myPred.predictedScore2 } : null}
                  myWatchInvite={myInvite ? { locationName: myInvite.locationName ?? "", locationUrl: myInvite.locationUrl } : null}
                  opponentWatchInvite={
                    opponentInviteRaw && opponentInviter
                      ? { locationName: opponentInviteRaw.locationName ?? "", locationUrl: opponentInviteRaw.locationUrl, inviterName: opponentInviter.name }
                      : null
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
