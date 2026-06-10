"use client";

import { useState, useEffect } from "react";
import { Users, ChevronDown, ChevronUp, Check, X } from "lucide-react";

interface PlayerRow {
  id: string;
  name: string;
  position: string;
}

interface TeamGroup {
  teamId: string;
  teamName: string;
  flagEmoji: string;
  players: PlayerRow[];
}

interface Props {
  matchId: string;
  cutoffTime: string;
}

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;

const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

export default function LineupPrediction({ matchId, cutoffTime }: Props) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<TeamGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedMeta, setSelectedMeta] = useState<Map<string, { name: string; position: string }>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPast = new Date() >= new Date(cutoffTime);

  useEffect(() => {
    if (!open || teams) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/matches/${matchId}/players`).then((r) => r.json()),
      fetch(`/api/matches/${matchId}/lineup-prediction`).then((r) => r.json()),
    ]).then(([playersData, lineupData]) => {
      setTeams(playersData?.teams ?? []);
      if (lineupData?.picks?.length > 0) {
        const ids = new Set<string>(lineupData.picks.map((p: any) => p.playerId));
        const meta = new Map<string, { name: string; position: string }>(
          lineupData.picks.map((p: any) => [p.playerId, { name: p.playerName, position: p.position }])
        );
        setSelected(ids);
        setSelectedMeta(meta);
        setSaved(true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, matchId, teams]);

  function toggle(player: PlayerRow) {
    const next = new Set(selected);
    const nextMeta = new Map(selectedMeta);
    if (next.has(player.id)) {
      next.delete(player.id);
      nextMeta.delete(player.id);
    } else {
      if (next.size >= 11) { setError("You can only pick 11 players"); return; }
      next.add(player.id);
      nextMeta.set(player.id, { name: player.name, position: player.position });
    }
    setSelected(next);
    setSelectedMeta(nextMeta);
    setError(null);
    setSaved(false);
  }

  async function handleSave() {
    if (selected.size !== 11) { setError("Select exactly 11 players"); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/matches/${matchId}/lineup-prediction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerIds: [...selected] }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setOpen(false); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
  }

  if (isPast && !saved) return null;

  if (isPast && saved) {
    const byPos: Record<string, string[]> = {};
    for (const [, meta] of selectedMeta) {
      if (!byPos[meta.position]) byPos[meta.position] = [];
      byPos[meta.position].push(meta.name.split(" ").at(-1)!);
    }
    return (
      <div className="flex items-start gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700 w-fit">
        <Users className="h-3 w-3 mt-0.5 shrink-0" />
        XI: {POSITIONS.filter((p) => byPos[p]).map((p) => byPos[p].join(", ")).join(" · ")}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center w-full gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          saved
            ? "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
            : "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
        }`}
      >
        <Users className="h-4 w-4 text-blue-500 shrink-0" />
        {saved ? `✅ XI picked (${selected.size}/11) · edit` : `👥 Predict starting XI → +20 pts/player`}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-blue-100 bg-white shadow-sm overflow-hidden">
          {/* Counter */}
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-100">
            <span className="text-xs font-medium text-blue-700">{selected.size}/11 selected</span>
            {selected.size === 11 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save XI"}
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-xs">
              <X className="h-3 w-3" /> {error}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-gray-400 p-3 text-center">Loading squads…</p>
          ) : !teams || teams.length === 0 ? (
            <p className="text-xs text-gray-400 p-3 text-center">No squad data available</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {teams.map((team) => (
                <div key={team.teamId}>
                  <div className="sticky top-0 px-3 py-1.5 bg-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wide z-10">
                    {team.flagEmoji} {team.teamName}
                  </div>
                  {POSITIONS.map((pos) => {
                    const group = team.players.filter((p) => p.position === pos);
                    if (group.length === 0) return null;
                    return (
                      <div key={pos}>
                        <div className="px-3 py-0.5 text-[10px] text-gray-400 uppercase bg-white">
                          {POSITION_LABELS[pos]}
                        </div>
                        {group.map((p) => {
                          const isSelected = selected.has(p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggle(p)}
                              className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-colors ${
                                isSelected
                                  ? "bg-blue-50 text-blue-700 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span>{p.name}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
