"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PredictionFormProps {
  matchId: string;
  team1: { name: string; flagEmoji: string };
  team2: { name: string; flagEmoji: string };
  existing?: { predictedScore1: number; predictedScore2: number; stakeTokens?: number } | null;
  locked?: boolean;
  myBalance?: number;
  onDone?: (saved?: { predictedScore1: number; predictedScore2: number; stakeTokens: number }) => void;
}

export default function PredictionForm({ matchId, team1, team2, existing, locked, myBalance = 0, onDone }: PredictionFormProps) {
  const router = useRouter();
  const [score1, setScore1] = useState(existing?.predictedScore1 ?? 0);
  const [score2, setScore2] = useState(existing?.predictedScore2 ?? 0);
  const [stakeTokens, setStakeTokens] = useState(existing?.stakeTokens ?? 2);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, predictedScore1: score1, predictedScore2: score2, stakeTokens }),
      });
      if (res.ok) {
        setSaved(true);
        window.dispatchEvent(new Event("token-refresh"));
        router.refresh();
        setTimeout(() => onDone?.({ predictedScore1: score1, predictedScore2: score2, stakeTokens }), 800);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save prediction");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  if (locked) {
    return (
      <div className="text-xs text-gray-400 italic">
        {existing ? `Prediction: ${team1.flagEmoji} ${existing.predictedScore1}–${existing.predictedScore2} ${team2.flagEmoji} (Staked: ${existing.stakeTokens ?? 0}🪙)` : "Predictions locked"}
      </div>
    );
  }

  const maxAllowed = myBalance + (existing?.stakeTokens ?? 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Predict:</span>
        <span className="text-sm">{team1.flagEmoji}</span>
        <ScoreInput value={score1} onChange={setScore1} />
        <span className="text-xs text-gray-400">&ndash;</span>
        <ScoreInput value={score2} onChange={setScore2} />
        <span className="text-sm">{team2.flagEmoji}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500">Stake 🪙:</span>
        <StakeInput value={stakeTokens} onChange={setStakeTokens} max={Math.max(2, maxAllowed)} />
        <Button size="sm" variant={saved ? "secondary" : "default"} onClick={handleSubmit} disabled={loading} className="text-xs px-2 ml-auto">
          {loading ? "…" : saved ? "✓ Saved" : "Save Prediction"}
        </Button>
      </div>
      <div className="text-[10px] text-gray-400 text-left leading-tight mt-1">
        ℹ️ Exact score pays <strong>10x</strong> your stake. Correct winner pays <strong>2x</strong>. Tokens are escrowed until the match finishes.
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
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

function StakeInput({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  return (
    <input
      type="number"
      min={2}
      max={max}
      value={value}
      onChange={(e) => onChange(Math.max(2, Math.min(max, parseInt(e.target.value) || 2)))}
      className="w-12 rounded border border-amber-200 text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-600 bg-amber-50"
    />
  );
}
