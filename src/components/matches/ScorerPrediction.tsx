"use client";

import { useState } from "react";
import { Target, ChevronDown, ChevronUp, Check } from "lucide-react";

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

const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

export default function ScorerPrediction({ matchId, existing, cutoffTime }: Props) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<TeamGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    existing ? { id: existing.playerId, name: existing.playerName } : null
  );
  const [saved, setSaved] = useState(!!existing);
  const [saving, setSaving] = useState(false);

  const isPast = new Date() >= new Date(cutoffTime);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!teams) {
      setLoading(true);
      const r = await fetch(`/api/matches/${matchId}/players`).then((res) => res.json()).catch(() => null);
      setTeams(r?.teams ?? []);
      setLoading(false);
    }
  }

  async function handleSelect(id: string, name: string) {
    setSelected({ id, name });
    setSaving(true);
    await fetch("/api/scorer-predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId: id, playerName: name }),
    });
    setSaving(false);
    setSaved(true);
    setOpen(false);
  }

  if (isPast && !selected) return null;

  if (isPast && selected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700 w-fit">
        <Target className="h-3 w-3" />
        Scorer pick: {selected.name}
      </div>
    );
  }

  return (
    <div>
      {saved && !open ? (
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
        >
          <Target className="h-3 w-3" />
          Scorer: {selected?.name} · <span className="underline">edit</span>
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="flex items-center justify-center w-full gap-2 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
        >
          <Target className="h-4 w-4 text-purple-500" />
          🎯 Predict a goalscorer → +100 tokens
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}

      {open && (
        <div className="mt-2 rounded-lg border border-purple-100 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-xs text-gray-400 p-3 text-center">Loading squad...</p>
          ) : !teams || teams.length === 0 ? (
            <p className="text-xs text-gray-400 p-3 text-center">No squad data available yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {teams.map((team) => (
                <div key={team.teamId}>
                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {team.flagEmoji} {team.teamName}
                  </div>
                  {(["FWD", "MID", "DEF", "GK"] as const).map((pos) => {
                    const group = team.players.filter((p) => p.position === pos);
                    if (group.length === 0) return null;
                    return (
                      <div key={pos}>
                        <div className="px-3 py-0.5 text-[10px] text-gray-400 uppercase bg-white">{pos}</div>
                        {group.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelect(p.id, p.name)}
                            disabled={saving}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-purple-50 transition-colors ${
                              selected?.id === p.id ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700"
                            }`}
                          >
                            <span>{p.name}</span>
                            {selected?.id === p.id && <Check className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
                          </button>
                        ))}
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
