"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
const DEFAULT_STAKE_TOKENS = 10;

interface OpenBetModalProps {
  matchId: string;
  team1: { id: string; name: string; flagEmoji: string };
  team2: { id: string; name: string; flagEmoji: string };
  hasOdds: boolean;
}

export default function OpenBetModal({ matchId, team1, team2, hasOdds }: OpenBetModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const [stakeTokens, setStakeTokens] = useState<number>(DEFAULT_STAKE_TOKENS);
  const [betType, setBetType] = useState<"outcome" | "score">("outcome");
  const [challengerTeamSide, setChallengerTeamSide] = useState<1 | 2>(1);
  const [s1, setS1] = useState<string>("0");
  const [s2, setS2] = useState<string>("0");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: any = {
        matchId,
        stakeTokens,
        isOpenMarket: true,
      };

      if (betType === "outcome") {
        payload.challengerTeamSide = challengerTeamSide;
      } else {
        payload.student1Score1 = parseInt(s1, 10);
        payload.student1Score2 = parseInt(s2, 10);
      }

      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post bet");
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full mt-4 py-3 bg-[#1e3a8a] text-white font-bold rounded-xl hover:bg-[#1e3a8a]/90 transition-colors"
      >
        Post Open Bet
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Post Open Bet \uD83D\uDCC8</h3>

            {success ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✅</div>
                <p className="font-bold text-gray-900">Bet Posted!</p>
                <p className="text-sm text-gray-500 mt-1">Anyone can now take your bet.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">{error}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stake (\uD83E\uDE99 tokens)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={stakeTokens}
                    onChange={(e) => setStakeTokens(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Tokens will be held in escrow until the bet is taken or the match completes.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBetType("outcome")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg border ${betType === "outcome" ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-gray-600 border-gray-200"}`}
                  >
                    Match Winner
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetType("score")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg border ${betType === "score" ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-gray-600 border-gray-200"}`}
                  >
                    Exact Score
                  </button>
                </div>

                {betType === "outcome" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setChallengerTeamSide(1)}
                      className={`flex-1 flex flex-col items-center p-3 rounded-xl border ${challengerTeamSide === 1 ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}
                    >
                      <span className="text-2xl mb-1">{team1.flagEmoji}</span>
                      <span className="text-xs font-bold text-center">{team1.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChallengerTeamSide(2)}
                      className={`flex-1 flex flex-col items-center p-3 rounded-xl border ${challengerTeamSide === 2 ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}
                    >
                      <span className="text-2xl mb-1">{team2.flagEmoji}</span>
                      <span className="text-xs font-bold text-center">{team2.name}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center">
                      <div className="text-sm font-bold mb-2">{team1.name}</div>
                      <input type="number" min={0} value={s1} onChange={(e) => setS1(e.target.value)} className="w-full text-center text-xl font-bold p-3 border border-gray-200 rounded-xl" required />
                    </div>
                    <div className="text-gray-400 font-bold">-</div>
                    <div className="flex-1 text-center">
                      <div className="text-sm font-bold mb-2">{team2.name}</div>
                      <input type="number" min={0} value={s2} onChange={(e) => setS2(e.target.value)} className="w-full text-center text-xl font-bold p-3 border border-gray-200 rounded-xl" required />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#1e3a8a] text-white font-bold rounded-xl disabled:opacity-50">
                    {loading ? "Posting..." : "Post Bet"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
