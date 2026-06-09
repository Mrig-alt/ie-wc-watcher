"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MatchOption = {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Placeholder: string | null;
  team2Placeholder: string | null;
  matchDatetime: Date | string;
  team1Odds: number | null;
  team2Odds: number | null;
};

type TeamInfo = {
  name: string;
  flagEmoji: string;
};

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponent: { id: string; name: string } | null;
  upcomingMatches: MatchOption[];
  teamMap: Map<string, TeamInfo>;
  myBalance: number;
  groupId?: string | null;
  onSuccess?: () => void;
}

export default function ChallengeModal({
  isOpen,
  onClose,
  opponent,
  upcomingMatches,
  teamMap,
  myBalance,
  groupId = null,
  onSuccess,
}: ChallengeModalProps) {
  const { update } = useSession();
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [challengeType, setChallengeType] = useState<"winner" | "score">("winner");
  const [challengerTeamSide, setChallengerTeamSide] = useState<number | null>(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [stakeTokens, setStakeTokens] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!opponent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId) { setError("Please select a match"); return; }
    if (challengeType === "winner" && challengerTeamSide === null) { setError("Please select a team to support"); return; }
    if (challengeType === "score" && (score1 < 0 || score2 < 0)) { setError("Scores must be non-negative"); return; }
    if (stakeTokens < 1) { setError("Stake must be at least 1 token"); return; }
    if (stakeTokens > myBalance) { setError(`You only have ${myBalance} tokens`); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          opponentId: opponent.id,
          stakeTokens,
          challengerTeamSide: challengeType === "winner" ? challengerTeamSide : null,
          student1Score1: challengeType === "score" ? score1 : null,
          student1Score2: challengeType === "score" ? score2 : null,
          groupId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to challenge");
      }

      await update({ tokenBalance: myBalance - stakeTokens });
      window.dispatchEvent(new Event("token-refresh"));
      router.refresh();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      window.dispatchEvent(new Event("token-refresh")); // Rollback optimistic update
    } finally {
      setLoading(false);
    }
  };

  const selectedMatch = upcomingMatches.find((m) => m.id === matchId);
  const t1 = selectedMatch?.team1Id ? teamMap.get(selectedMatch.team1Id) : null;
  const t2 = selectedMatch?.team2Id ? teamMap.get(selectedMatch.team2Id) : null;
  const team1Name = t1?.name ?? selectedMatch?.team1Placeholder ?? "TBD";
  const team2Name = t2?.name ?? selectedMatch?.team2Placeholder ?? "TBD";
  const team1Flag = t1?.flagEmoji ?? "🏳️";
  const team2Flag = t2?.flagEmoji ?? "🏳️";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Challenge {opponent.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Select Match */}
          <div className="grid gap-1.5">
            <Label htmlFor="match-select">Select Match</Label>
            <select
              id="match-select"
              value={matchId}
              onChange={(e) => {
                setMatchId(e.target.value);
                setChallengerTeamSide(null);
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none"
            >
              <option value="">-- Choose a match --</option>
              {upcomingMatches
                .filter(m => new Date(m.matchDatetime) > new Date())
                .map((m) => {
                const matchT1 = m.team1Id ? teamMap.get(m.team1Id) : null;
                const matchT2 = m.team2Id ? teamMap.get(m.team2Id) : null;
                const label1 = matchT1?.name ?? m.team1Placeholder ?? "TBD";
                const label2 = matchT2?.name ?? m.team2Placeholder ?? "TBD";
                const dateStr = new Date(m.matchDatetime).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <option key={m.id} value={m.id}>
                    {label1} vs {label2} ({dateStr})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Challenge Type */}
          {matchId && (
            <div className="grid gap-1.5">
              <Label>Challenge Type</Label>
              <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setChallengeType("winner");
                    setChallengerTeamSide(null);
                  }}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                    challengeType === "winner"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Match Winner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChallengeType("score");
                    setChallengerTeamSide(null);
                  }}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                    challengeType === "score"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Exact Score
                </button>
              </div>
            </div>
          )}

          {/* Select Supported Team */}
          {matchId && challengeType === "winner" && (
            <div className="grid gap-1.5">
              <Label>Your Pick (Who will win?)</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setChallengerTeamSide(1)}
                  className={`flex-1 rounded-lg border p-3 text-center transition-all flex flex-col items-center justify-center ${
                    challengerTeamSide === 1
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="block text-xl mb-1">{team1Flag}</span>
                  <span className="block text-xs font-semibold truncate max-w-full">{team1Name}</span>
                  {selectedMatch?.team1Odds != null && (
                    <span className="mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                      {selectedMatch.team1Odds.toFixed(2)}x
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setChallengerTeamSide(2)}
                  className={`flex-1 rounded-lg border p-3 text-center transition-all flex flex-col items-center justify-center ${
                    challengerTeamSide === 2
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="block text-xl mb-1">{team2Flag}</span>
                  <span className="block text-xs font-semibold truncate max-w-full">{team2Name}</span>
                  {selectedMatch?.team2Odds != null && (
                    <span className="mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                      {selectedMatch.team2Odds.toFixed(2)}x
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Predict Score */}
          {matchId && challengeType === "score" && (
            <div className="grid gap-2">
              <Label>Predict Scoreline</Label>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xl">{team1Flag}</span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-gray-500 truncate">{team1Name}</span>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={score1}
                      onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-400 mt-4">:</span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-gray-500 truncate">{team2Name}</span>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={score2}
                      onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <span className="text-xl">{team2Flag}</span>
                </div>
              </div>
            </div>
          )}

          {/* Stake Amount */}
          <div className="grid gap-1.5">
            <div className="flex justify-between">
              <Label htmlFor="stake-input">Stake Amount</Label>
              <span className="text-xs text-gray-400">Balance: 🪙 {myBalance}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-gray-400">🪙</span>
              <Input
                id="stake-input"
                type="number"
                value={stakeTokens}
                onChange={(e) => setStakeTokens(parseInt(e.target.value) || 0)}
                className="pl-8"
                min={1}
                max={myBalance}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? "Challenging..." : "Send Challenge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
