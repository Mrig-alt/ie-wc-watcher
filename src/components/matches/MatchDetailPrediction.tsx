"use client";

import { useState } from "react";
import PredictionForm from "./PredictionForm";
import { ChevronDown, ChevronUp } from "lucide-react";

type EditEntry = {
  id: string;
  oldScore1: number | null;
  oldScore2: number | null;
  newScore1: number;
  newScore2: number;
  createdAt: string;
};

interface Props {
  matchId: string;
  team1: { name: string; flagEmoji: string };
  team2: { name: string; flagEmoji: string };
  hasOdds: boolean;
  existing: { predictedScore1: number; predictedScore2: number } | null;
  editHistory?: EditEntry[];
}

export default function MatchDetailPrediction({ matchId, team1, team2, hasOdds, existing, editHistory = [] }: Props) {
  const [showForm, setShowForm] = useState(!existing);
  const [localPrediction, setLocalPrediction] = useState(existing);
  const [showHistory, setShowHistory] = useState(false);

  const handleDone = (pred?: { predictedScore1: number; predictedScore2: number }) => {
    if (pred) setLocalPrediction(pred);
    setShowForm(false);
  };

  return (
    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-green-800">
          {existing || localPrediction ? "🏆 Your prediction" : "🏆 Predict the score — earn tokens!"}
        </p>
        {(existing || localPrediction) && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-xs text-green-700 underline hover:text-green-900">
            edit
          </button>
        )}
      </div>

      {showForm ? (
        <PredictionForm matchId={matchId} team1={team1} team2={team2} existing={localPrediction ?? existing} locked={false} onDone={handleDone} />
      ) : (
        <p className="text-sm text-green-700">
          {team1.flagEmoji} {(localPrediction ?? existing)!.predictedScore1} – {(localPrediction ?? existing)!.predictedScore2} {team2.flagEmoji}
        </p>
      )}

      <p className="text-xs text-green-700">
        {hasOdds ? "Exact score → odds payout · Correct result → ½ odds payout" : "Exact score → +15 tokens · Correct result → +5 tokens"}
      </p>

      {editHistory.length > 0 && (
        <div className="border-t border-green-200 pt-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
          >
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {editHistory.length} edit{editHistory.length !== 1 ? "s" : ""} · view history
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1">
              {editHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs text-green-700">
                  <span>
                    {h.oldScore1 !== null ? `${h.oldScore1}–${h.oldScore2}` : "—"} → {h.newScore1}–{h.newScore2}
                  </span>
                  <span className="text-green-500">
                    {new Date(h.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
