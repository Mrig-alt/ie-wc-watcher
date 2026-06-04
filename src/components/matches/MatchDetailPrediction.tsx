"use client";

import { useState } from "react";
import PredictionForm from "./PredictionForm";

interface Props {
  matchId: string;
  team1: { name: string; flagEmoji: string };
  team2: { name: string; flagEmoji: string };
  existing: { predictedScore1: number; predictedScore2: number } | null;
}

/**
 * Client wrapper used on the match detail page.
 * Handles expand/collapse state so PredictionForm can call onDone() correctly,
 * and re-renders cleanly after router.refresh() fires from PredictionForm.
 */
export default function MatchDetailPrediction({ matchId, team1, team2, existing }: Props) {
  const [showForm, setShowForm] = useState(!existing);
  const [localPrediction, setLocalPrediction] = useState(existing);

  const handleDone = () => {
    // router.refresh() in PredictionForm will update `existing` from the server;
    // until it does, optimistically show the last-saved values
    setShowForm(false);
  };

  return (
    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-green-800">
          {existing || localPrediction
            ? "\uD83C\uDFC6 Your prediction"
            : "\uD83C\uDFC6 Predict the score \u2014 earn tokens!"}
        </p>
        {(existing || localPrediction) && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-green-700 underline hover:text-green-900"
          >
            edit
          </button>
        )}
      </div>

      {showForm ? (
        <PredictionForm
          matchId={matchId}
          team1={team1}
          team2={team2}
          existing={localPrediction ?? existing}
          locked={false}
          onDone={handleDone}
        />
      ) : (
        <p className="text-sm text-green-700">
          {team1.flagEmoji}{" "}
          {(localPrediction ?? existing)!.predictedScore1}
          {" \u2013 "}
          {(localPrediction ?? existing)!.predictedScore2}
          {" "}{team2.flagEmoji}
        </p>
      )}

      {!showForm && (
        <p className="text-xs text-green-700 mt-2">
          Exact score \u2192 +15 tokens \u00b7 Correct result \u2192 +5 tokens
        </p>
      )}
      {showForm && (
        <p className="text-xs text-green-700 mt-2">
          Exact score \u2192 +15 tokens \u00b7 Correct result \u2192 +5 tokens
        </p>
      )}
    </div>
  );
}
