"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function MatchSimulator({ upcomingMatches }: { upcomingMatches: any[] }) {
  const [matchId, setMatchId] = useState("");
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSimulate = async () => {
    if (!matchId) return;
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/simulate-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, team1Score, team2Score }),
      });

      if (res.ok) {
        setSuccess(true);
        window.location.reload();
      } else {
        alert("Simulation failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error simulating match");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm space-y-4">
      <div>
        <h2 className="font-semibold text-amber-900">Match Simulator</h2>
        <p className="text-sm text-amber-700">Trigger token payouts for upcoming matches to test the settlement engine.</p>
      </div>

      <div className="flex flex-col gap-4 max-w-sm">
        <select
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2"
        >
          <option value="">Select a Match</option>
          {upcomingMatches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.team1Name || m.team1Placeholder} vs {m.team2Name || m.team2Placeholder}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-amber-800">Team 1 Score</label>
            <input
              type="number"
              min={0}
              value={team1Score}
              onChange={(e) => setTeam1Score(parseInt(e.target.value))}
              className="w-20 rounded-md border-gray-300 shadow-sm p-2"
            />
          </div>
          <span className="font-bold pt-4">-</span>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-amber-800">Team 2 Score</label>
            <input
              type="number"
              min={0}
              value={team2Score}
              onChange={(e) => setTeam2Score(parseInt(e.target.value))}
              className="w-20 rounded-md border-gray-300 shadow-sm p-2"
            />
          </div>
        </div>

        <Button onClick={handleSimulate} disabled={loading || !matchId} className="w-full bg-amber-600 hover:bg-amber-700">
          {loading ? "Simulating..." : success ? "Settled!" : "Simulate Completion"}
        </Button>
      </div>
    </div>
  );
}
