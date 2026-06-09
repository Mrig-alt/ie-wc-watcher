"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import LocalTime from "@/components/ui/LocalTime";

export default function BetsHistory({ currentUserId }: { currentUserId: string }) {
  const [history, setHistory] = useState<{ bets: any[]; predictions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500 animate-pulse text-center py-4">Loading history...</div>;
  }

  if (!history || (history.bets.length === 0 && history.predictions.length === 0)) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 bg-gray-50">
        You haven't made any predictions or bets yet!
      </div>
    );
  }

  // Combine and sort
  const combined = [
    ...history.bets.map((b) => ({ ...b, type: "bet" as const })),
    ...history.predictions.map((p) => ({ ...p, type: "prediction" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900 text-base">Prediction & Challenge History</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {combined.map((item) => {
          const isPending = !item.settled;
          let title = "";
          let resultText = "";
          let resultClass = "";

          if (item.type === "bet") {
            const isSender = item.student1Id === currentUserId;
            if (item.isOpenMarket) {
              title = isSender ? "Your Open Bet" : `Took Open Bet from ${item.opponentName || "Classmate"}`;
            } else {
              title = `Challenge ${isSender ? "Sent to" : "Received from"} ${item.opponentName || "Classmate"}`;
            }
            
            if (item.status === "declined" || item.status === "cancelled") {
              resultText = `Declined (Refunded ${item.stakeTokens} 🪙)`;
              resultClass = "text-gray-500 bg-gray-100 border-gray-200 line-through";
            } else if (isPending) {
              if (item.status === "accepted") {
                resultText = `Accepted (${item.stakeTokens} 🪙 staked)`;
                resultClass = "text-blue-700 bg-blue-50 border-blue-200";
              } else if (item.isOpenMarket) {
                resultText = `Available on Market (${item.stakeTokens} 🪙 staked)`;
                resultClass = "text-purple-600 bg-purple-50 border-purple-200";
              } else {
                resultText = `Awaiting Response (${item.stakeTokens} 🪙 staked)`;
                resultClass = "text-yellow-600 bg-yellow-50 border-yellow-200";
              }
            } else if (item.winnerId === currentUserId) {
              resultText = `Won (+${item.stakeTokens * 2} 🪙)`;
              resultClass = "text-green-700 bg-green-50 border-green-200";
            } else if (item.winnerId === null) {
              resultText = `Draw (Refunded ${item.stakeTokens} 🪙)`;
              resultClass = "text-gray-600 bg-gray-100 border-gray-200";
            } else {
              resultText = `Lost (-${item.stakeTokens} 🪙)`;
              resultClass = "text-red-700 bg-red-50 border-red-200";
            }
          } else {
            title = `Global Prediction`;
            if (isPending) {
              resultText = `Pending: ${item.predictedScore1}-${item.predictedScore2}`;
              resultClass = "text-blue-600 bg-blue-50 border-blue-200";
            } else {
              // We'll just show "Settled" for predictions for simplicity since we don't store exact tokens won per prediction in the table easily right now.
              resultText = `Settled: ${item.predictedScore1}-${item.predictedScore2}`;
              resultClass = "text-gray-600 bg-gray-100 border-gray-200";
            }
          }

          return (
            <div key={`${item.type}-${item.id}`} className="p-3 border border-gray-100 rounded-lg flex items-center justify-between text-sm bg-white">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{title}</span>
                <span className="text-xs text-gray-500">
                  Match <LocalTime datetime={item.matchDatetime} mode="date" />
                </span>
              </div>
              <div className={`px-2 py-1 rounded border text-xs font-semibold ${resultClass}`}>
                {resultText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
