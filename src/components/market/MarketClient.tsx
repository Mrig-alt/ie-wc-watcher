"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type OpenBet = {
  id: string;
  stakeTokens: number;
  challengerTeamSide: number | null;
  student1Score1: number | null;
  student1Score2: number | null;
  challengerId: string;
  challengerName: string;
  matchId: string;
  matchDatetime: Date;
  team1: { name: string; flagEmoji: string } | null;
  team2: { name: string; flagEmoji: string } | null;
  isMine: boolean;
};

export default function MarketClient({
  initialBets,
  currentUserId,
  isGuest,
  tokenBalance,
}: {
  initialBets: OpenBet[];
  currentUserId?: string;
  isGuest: boolean;
  tokenBalance: number;
}) {
  const router = useRouter();
  const [bets, setBets] = useState(initialBets);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTakeBet = async (bet: OpenBet) => {
    if (isGuest) {
      setError("Guests cannot take bets. Verify your class PIN first.");
      return;
    }
    if (tokenBalance < bet.stakeTokens) {
      setError(`You need ${bet.stakeTokens} tokens to take this bet.`);
      return;
    }
    
    setError(null);
    setTakingId(bet.id);
    try {
      const res = await fetch("/api/market/take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betId: bet.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to take bet");
      }
      
      // Remove it from the list
      setBets((prev) => prev.filter((b) => b.id !== bet.id));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTakingId(null);
    }
  };

  if (bets.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="text-4xl mb-4">\uD83C\uDF2C\uFE0F</div>
        <h3 className="text-lg font-bold text-gray-900">The market is quiet</h3>
        <p className="text-gray-500 mt-2">No open bets right now. You can post an open bet from any Match page!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}
      
      <div className="grid gap-4">
        {bets.map((bet) => {
          const isScore = bet.student1Score1 !== null && bet.student1Score2 !== null;
          let betDescription = "";
          if (isScore) {
            betDescription = `Exact Score: ${bet.team1?.name} ${bet.student1Score1} - ${bet.student1Score2} ${bet.team2?.name}`;
          } else {
            const team = bet.challengerTeamSide === 1 ? bet.team1?.name : bet.team2?.name;
            betDescription = `${team} to win`;
          }

          return (
            <div key={bet.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">{bet.challengerName}</span>
                  <span className="text-gray-400 text-sm">is betting</span>
                  <span className="font-bold text-[#1e3a8a]">\uD83E\uDE99 {bet.stakeTokens}</span>
                </div>
                
                <div className="text-gray-900 font-medium bg-gray-50 inline-block px-3 py-1.5 rounded-lg border border-gray-200">
                  {betDescription}
                </div>
                
                <div className="text-xs text-gray-500 mt-3 font-medium">
                  {bet.team1?.flagEmoji} {bet.team1?.name} vs {bet.team2?.name} {bet.team2?.flagEmoji}
                  <span className="mx-2">•</span>
                  {format(new Date(bet.matchDatetime), "MMM d, HH:mm")}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {bet.isMine ? (
                  <button disabled className="w-full md:w-auto px-6 py-2.5 bg-gray-100 text-gray-400 font-bold rounded-xl cursor-not-allowed">
                    Your Bet
                  </button>
                ) : (
                  <button
                    onClick={() => handleTakeBet(bet)}
                    disabled={takingId === bet.id}
                    className="w-full md:w-auto px-6 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-xl hover:bg-[#1e3a8a]/90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    {takingId === bet.id ? "Taking..." : "Take Bet"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
