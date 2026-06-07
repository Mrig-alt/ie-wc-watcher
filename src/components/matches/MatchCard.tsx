"use client";

import { formatKickoff, stageLabel } from "@/lib/utils";
import type { MatchStage } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ShareButton from "./ShareButton";
import WatchTogetherButton from "./WatchTogetherButton";
import WatchTogetherCard from "./WatchTogetherCard";
import PredictionForm from "./PredictionForm";
import PresenceDot from "@/components/students/PresenceDot";
import Link from "next/link";
import { useState } from "react";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import LocalTime from "@/components/ui/LocalTime";

interface Supporter {
  id: string;
  name: string;
  lastSeenAt: Date | null;
  watchInvite?: { locationName: string; locationUrl: string | null } | null;
}

interface MatchCardProps {
  match: {
    id: string;
    matchDatetime: Date;
    status: "upcoming" | "live" | "completed";
    stage: MatchStage;
    groupName: string | null;
    team1Score: number | null;
    team2Score: number | null;
    venue: string | null;
    city: string | null;
    team1: { id: string; name: string; flagEmoji: string } | null;
    team2: { id: string; name: string; flagEmoji: string } | null;
    team1Placeholder: string | null;
    team2Placeholder: string | null;
    team1Odds?: number | null;
    team2Odds?: number | null;
  };
  team1Supporters: Supporter[];
  team2Supporters: Supporter[];
  currentUserId?: string | null;
  currentUserTeamId?: string | null;
  currentUserIsGuest?: boolean;
  prediction?: { predictedScore1: number; predictedScore2: number } | null;
  myWatchInvite?: { locationName: string; locationUrl: string | null } | null;
  opponentWatchInvite?: { locationName: string; locationUrl: string | null; inviterName: string } | null;
}

export default function MatchCard({
  match,
  team1Supporters,
  team2Supporters,
  currentUserId,
  currentUserTeamId,
  currentUserIsGuest,
  prediction,
  myWatchInvite,
  opponentWatchInvite,
}: MatchCardProps) {
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const isUpcoming = match.status === "upcoming";
  const isFriendly = match.stage === "friendly";
  const [showWatchCard, setShowWatchCard] = useState(false);
  const [showPredict, setShowPredict] = useState(false);

  const myTeamSide =
    currentUserTeamId === match.team1?.id
      ? "team1"
      : currentUserTeamId === match.team2?.id
      ? "team2"
      : null;

  const myTeam = myTeamSide === "team1" ? match.team1 : myTeamSide === "team2" ? match.team2 : null;
  const predictionStr = prediction
    ? `${prediction.predictedScore1}\u2013${prediction.predictedScore2}`
    : undefined;

  const t1Name = match.team1?.name ?? match.team1Placeholder ?? "TBD";
  const t2Name = match.team2?.name ?? match.team2Placeholder ?? "TBD";
  const t1Flag = match.team1?.flagEmoji ?? (match.stage === 'global' ? "⚽" : "🏳️");
  const t2Flag = match.team2?.flagEmoji ?? (match.stage === 'global' ? "⚽" : "🏳️");

  // Can predict if logged in, match is upcoming, both teams known, and it's >30min before kickoff
  const cutoffTime = new Date(new Date(match.matchDatetime).getTime() - 30 * 60 * 1000);
  const canPredict = !!currentUserId && isUpcoming && !!match.team1 && !!match.team2 && new Date() < cutoffTime;

  return (
    <Card className={isLive ? "ring-2 ring-red-400" : ""}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {isFriendly ? "Friendly" : stageLabel(match.stage)}
              {match.groupName && ` \u00b7 Group ${match.groupName}`}
            </span>
            {isLive && <Badge variant="live">LIVE</Badge>}
            {isFriendly && <Badge variant="friendly">Practice</Badge>}
          </div>
          <span className="text-xs text-gray-400"><LocalTime datetime={match.matchDatetime} /></span>
        </div>

        {/* Scoreline / teams */}
        <Link href={`/matches/${match.id}`} className="block hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-between gap-3">
            <TeamSide flag={t1Flag} name={t1Name} supporters={team1Supporters} highlight={myTeamSide === "team1"} odds={match.team1Odds} />

            <div className="flex flex-col items-center shrink-0 min-w-[56px]">
              {isCompleted || isLive ? (
                <span className="text-xl font-bold text-gray-900">
                  {match.team1Score != null && match.team2Score != null
                    ? `${match.team1Score}–${match.team2Score}`
                    : <span className="text-red-500 text-base font-semibold">Live</span>}
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-400">vs</span>
              )}
              {match.city && (
                <span className="text-[10px] text-gray-400 text-center leading-tight">{match.city}</span>
              )}
            </div>

            <TeamSide flag={t2Flag} name={t2Name} supporters={team2Supporters} highlight={myTeamSide === "team2"} odds={match.team2Odds} right />
          </div>
        </Link>

        {/* Prediction callout — show for all logged-in users on upcoming matches with known teams */}
        {canPredict && (
          <div className="mt-3">
            {currentUserIsGuest ? (
              <button
                onClick={() => alert("Verification Required: Upgrade your account in your Account Page settings using the class PIN to make predictions and bets!")}
                className="flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors w-full justify-center cursor-pointer"
              >
                🔒 Verify PIN to Predict
              </button>
            ) : prediction && !showPredict ? (
              // Already predicted — show summary chip, tap to edit
              <button
                onClick={() => setShowPredict(true)}
                className="flex items-center gap-1.5 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
              >
                🏆 Your prediction: {prediction.predictedScore1}–{prediction.predictedScore2} · <span className="underline">edit</span>
              </button>
            ) : !prediction && !showPredict ? (
              // No prediction yet — prominent CTA
              <button
                onClick={() => setShowPredict(true)}
                className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors w-full justify-center"
              >
                🏆 Predict the score → earn tokens
              </button>
            ) : (
              <PredictionForm
                matchId={match.id}
                team1={match.team1!}
                team2={match.team2!}
                existing={prediction}
                locked={false}
                onDone={() => setShowPredict(false)}
              />
            )}
          </div>
        )}

        {/* Watch together nudge from opponent */}
        {opponentWatchInvite && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium">{opponentWatchInvite.inviterName}</span> is watching at{" "}
              {opponentWatchInvite.locationUrl ? (
                <a href={opponentWatchInvite.locationUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {opponentWatchInvite.locationName}
                </a>
              ) : (
                opponentWatchInvite.locationName
              )}
            </span>
          </div>
        )}

        {/* Watch together full card */}
        {isUpcoming && (
          <div className="mt-3">
            <button
              onClick={() => setShowWatchCard((v) => !v)}
              className="flex items-center justify-center w-full gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <MapPin className="h-4 w-4 shrink-0 text-indigo-500" />
              Wanna watch the match together? Find a group!
              {showWatchCard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showWatchCard && (
              <div className="mt-2">
                <WatchTogetherCard matchId={match.id} />
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        {currentUserId && isUpcoming && (
          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              {myTeamSide && (
                <WatchTogetherButton matchId={match.id} existingInvite={myWatchInvite} />
              )}
              {match.team1 && match.team2 && (
                <ShareButton
                  matchId={match.id}
                  team1={match.team1}
                  team2={match.team2}
                  myTeam={myTeam}
                  prediction={predictionStr}
                />
              )}
            </div>
          </div>
        )}

        {currentUserId && isCompleted && match.team1 && match.team2 && (
          <div className="mt-2 flex justify-end">
            <ShareButton
              matchId={match.id}
              team1={match.team1}
              team2={match.team2}
              myTeam={myTeam}
              prediction={predictionStr}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamSide({
  flag,
  name,
  supporters,
  highlight,
  right,
  odds,
}: {
  flag: string;
  name: string;
  supporters: Supporter[];
  highlight?: boolean;
  right?: boolean;
  odds?: number | null;
}) {
  return (
    <div className={`flex flex-col ${right ? "items-end" : "items-start"} gap-1 flex-1 min-w-0`}>
      <div className={`flex items-center gap-2 ${right ? "flex-row-reverse" : ""}`}>
        <span className="text-2xl">{flag}</span>
        <div className={`flex flex-col ${right ? "items-end" : "items-start"}`}>
          <span className={`text-sm font-semibold truncate ${highlight ? "text-green-700" : "text-gray-900"}`}>
            {name}
          </span>
          {odds != null && (
            <span className="text-[10px] font-medium text-gray-500 mt-0.5">
              Odds: {odds.toFixed(2)}x
            </span>
          )}
        </div>
      </div>
      {supporters.length > 0 && (
        <div className={`flex flex-wrap gap-1 ${right ? "justify-end" : ""}`}>
          {supporters.slice(0, 3).map((s) => (
            <span key={s.id} className="flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {s.name.split(" ")[0]}
              <PresenceDot lastSeenAt={s.lastSeenAt} />
            </span>
          ))}
          {supporters.length > 3 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
              +{supporters.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
