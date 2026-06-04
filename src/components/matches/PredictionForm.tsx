"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PredictionFormProps {
  matchId: string;
  team1: { name: string; flagEmoji: string };
  team2: { name: string; flagEmoji: string };
  existing?: { predictedScore1: number; predictedScore2: number } | null;
  locked?: boolean;
  onDone?: () => void;
}

export default function PredictionForm({ matchId, team1, team2, existing, locked, onDone }: PredictionFormProps) {
  const router = useRouter();
  const [score1, setScore1] = useState(existing?.predictedScore1 ?? 0);
  const [score2, setScore2] = useState(existing?.predictedScore2 ?? 0);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, predictedScore1: score1, predictedScore2: score2 }),
      });
      if (res.ok) {
        setSaved(true);
        // Tell the Header to re-fetch the live token balance
        window.dispatchEvent(new Event("token-refresh"));
        // Re-render server components so the prediction chip reflects the save
        router.refresh();
        setTimeout(() => onDone?.(), 800);
      }
    } finally {
      setLoading(false);
    }
  };

  if (locked) {
    return (
      <div className="text-xs text-gray-400 italic">
        {existing
          ? `Your prediction: ${team1.flagEmoji} ${existing.predictedScore1}\u2013${existing.predictedScore2} ${team2.flagEmoji}`
          : "Predictions locked"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Predict:</span>
      <span className="text-sm">{team1.flagEmoji}</span>
      <ScoreInput value={score1} onChange={setScore1} />
      <span className="text-xs text-gray-400">&ndash;</span>
      <ScoreInput value={score2} onChange={setScore2} />
      <span className="text-sm">{team2.flagEmoji}</span>
      <Button
        size="sm"
        variant={saved ? "secondary" : "default"}
        onClick={handleSubmit}
        loading={loading}
        className="text-xs px-2"
      >
        {saved ? "\u2713 Saved" : "+5/15 \uD83E\uDE99"}
      </Button>
    </div>
  );
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
      className="w-8 rounded border border-gray-200 text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-green-600"
    />
  );
}
