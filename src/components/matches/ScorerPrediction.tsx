"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Target, Check } from "lucide-react";

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
  existing?: { playerId: string; playerName: string } | null;
  cutoffTime: string;
}

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
const POS_COLOR: Record<string, string> = {
  GK: "bg-yellow-100 text-yellow-700",
  DEF: "bg-blue-100 text-blue-700",
  MID: "bg-green-100 text-green-700",
  FWD: "bg-red-100 text-red-700",
};
const POS_REWARD: Record<string, string> = {
  GK: "+250 pts", DEF: "+175 pts", MID: "+100 pts", FWD: "+50 pts",
};

export default function ScorerPrediction({ matchId, existing, cutoffTime }: Props) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<TeamGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    existing ? { id: existing.playerId, name: existing.playerName } : null
  );
  const [saved, setSaved] = useState(!!existing);
  const [saving, setSaving] = useState(false);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  const isPast = new Date() >= new Date(cutoffTime);

  const load = useCallback(async () => {
    if (teams) return;
    setLoading(true);
    const r = await fetch(`/api/matches/${matchId}/players`).then(res => res.json()).catch(() => null);
    const fetchedTeams: TeamGroup[] = r?.teams ?? [];
    setTeams(fetchedTeams);
    if (fetchedTeams.length > 0) setActiveTeam(fetchedTeams[0].teamId);
    setLoading(false);
  }, [matchId, teams]);

  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleSelect(id: string, name: string) {
    setSaving(true);
    await fetch("/api/scorer-predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId: id, playerName: name }),
    });
    setSelected({ id, name });
    setSaved(true);
    setSaving(false);
    setOpen(false);
  }

  if (isPast && !selected) return null;

  if (isPast && selected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700 w-fit">
        <Target className="h-3 w-3" />
        Scorer: {selected.name}
      </div>
    );
  }

  const currentTeam = teams?.find(t => t.teamId === activeTeam);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-full gap-2 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
      >
        <Target className="h-4 w-4 text-purple-500 shrink-0" />
        {saved ? `✅ Scorer: ${selected?.name} · edit` : "🎯 Goalscorer → +50 pts"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[92vh] z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Goalscorer</p>
                <p className="text-sm font-bold text-gray-900">Who scores first?</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Team tabs */}
            {teams && teams.length > 1 && (
              <div className="flex border-b border-gray-100 shrink-0">
                {teams.map(team => (
                  <button
                    key={team.teamId}
                    onClick={() => setActiveTeam(team.teamId)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      activeTeam === team.teamId
                        ? "text-purple-700 border-b-2 border-purple-500"
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
                  {POSITIONS.map(pos => {
                    const group = currentTeam.players.filter(p => p.position === pos);
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
                          <span className="ml-auto text-xs font-semibold text-green-600">{POS_REWARD[pos]}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {group.map(player => {
                            const isSelected = selected?.id === player.id;
                            return (
                              <button
                                key={player.id}
                                onClick={() => handleSelect(player.id, player.name)}
                                disabled={saving}
                                className={`relative flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
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

            <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
              <p className="text-xs text-gray-400 text-center">Tap a player to save · rarer positions pay more</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
