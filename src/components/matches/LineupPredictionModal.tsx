"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Check, Users } from "lucide-react";

interface PlayerRow {
  id: string;
  name: string;
  position: string;
  club?: string;
}

interface TeamGroup {
  teamId: string;
  teamName: string;
  flagEmoji: string;
  players: PlayerRow[];
}

interface Props {
  matchId: string;
  matchLabel: string;
  cutoffTime: string;
}

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
const POS_COLOR: Record<string, string> = {
  GK: "bg-yellow-100 text-yellow-700",
  DEF: "bg-blue-100 text-blue-700",
  MID: "bg-green-100 text-green-700",
  FWD: "bg-red-100 text-red-700",
};

export default function LineupPredictionModal({ matchId, matchLabel, cutoffTime }: Props) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<TeamGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, PlayerRow>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  const isPast = new Date() >= new Date(cutoffTime);

  const load = useCallback(async () => {
    if (teams) return;
    setLoading(true);
    const [playersData, lineupData] = await Promise.all([
      fetch(`/api/matches/${matchId}/players`).then((r) => r.json()).catch(() => null),
      fetch(`/api/matches/${matchId}/lineup-prediction`).then((r) => r.json()).catch(() => null),
    ]);
    const fetchedTeams: TeamGroup[] = playersData?.teams ?? [];
    setTeams(fetchedTeams);
    if (fetchedTeams.length > 0) setActiveTeam(fetchedTeams[0].teamId);
    if (lineupData?.picks?.length > 0) {
      const map = new Map<string, PlayerRow>();
      for (const p of lineupData.picks) {
        map.set(p.playerId, { id: p.playerId, name: p.playerName, position: p.position });
      }
      setSelected(map);
      setSaved(true);
    }
    setLoading(false);
  }, [matchId, teams]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function toggle(player: PlayerRow) {
    const next = new Map(selected);
    if (next.has(player.id)) {
      next.delete(player.id);
    } else {
      if (next.size >= 11) {
        setError("Already at 11 — remove a player first");
        return;
      }
      next.set(player.id, player);
    }
    setSelected(next);
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
      body: JSON.stringify({ playerIds: [...selected.keys()] }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setOpen(false); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
  }

  if (isPast && !saved) return null;

  const currentTeam = teams?.find((t) => t.teamId === activeTeam);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center justify-center w-full gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors border ${
          saved
            ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        }`}
      >
        <Users className="h-4 w-4 text-blue-500 shrink-0" />
        {saved
          ? `✅ XI picked (${selected.size}/11) · edit`
          : "👥 Starting XI → +20 pts"}
      </button>

      {/* Modal backdrop + sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Bottom sheet */}
          <div className="relative bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[92vh] z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Starting XI</p>
                <p className="text-sm font-bold text-gray-900">{matchLabel}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${selected.size === 11 ? "text-green-600" : "text-gray-500"}`}>
                  {selected.size}/11
                </span>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Team tabs */}
            {teams && teams.length > 1 && (
              <div className="flex border-b border-gray-100 shrink-0">
                {teams.map((team) => (
                  <button
                    key={team.teamId}
                    onClick={() => setActiveTeam(team.teamId)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      activeTeam === team.teamId
                        ? "text-blue-700 border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {team.flagEmoji} {team.teamName}
                  </button>
                ))}
              </div>
            )}

            {/* Player grid */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-8">Loading squad…</p>
              ) : !currentTeam ? (
                <p className="text-sm text-gray-400 text-center py-8">No squad data</p>
              ) : (
                <div className="space-y-4">
                  {POSITIONS.map((pos) => {
                    const group = currentTeam.players.filter((p) => p.position === pos);
                    if (group.length === 0) return null;
                    return (
                      <div key={pos}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${POS_COLOR[pos]}`}>
                            {pos}
                          </span>
                          <span className="text-xs text-gray-400">
                            {pos === "GK" ? "Goalkeeper" : pos === "DEF" ? "Defenders" : pos === "MID" ? "Midfielders" : "Forwards"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {group.map((player) => {
                            const isSelected = selected.has(player.id);
                            return (
                              <button
                                key={player.id}
                                onClick={() => toggle(player)}
                                className={`relative flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                                }`}
                              >
                                <span className="text-sm font-semibold leading-snug">{player.name}</span>
                                {isSelected && (
                                  <span className="absolute top-2 right-2">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100 shrink-0">{error}</p>
            )}

            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-100 bg-white shrink-0">
              <button
                onClick={handleSave}
                disabled={selected.size !== 11 || saving}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                {saving ? "Saving…" : selected.size === 11 ? "Confirm XI ✓" : `Select ${11 - selected.size} more player${11 - selected.size !== 1 ? "s" : ""}`}
              </button>
              {selected.size > 0 && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Correct starters earn 20 tokens each · All 11 right = +100 bonus
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
