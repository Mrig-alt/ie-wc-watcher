"use client";

import { useState, useEffect } from "react";


interface Team {
  id: string;
  name: string;
  flagEmoji: string;
}

export default function TournamentPickBanner() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [pickedTeamId, setPickedTeamId] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const lockAt = new Date("2026-06-11T00:00:00Z");
  const isLocked = new Date() > lockAt;

  useEffect(() => {
    Promise.all([
      fetch("/api/register").then((r) => r.json()),
      fetch("/api/tournament-pick").then((r) => (r.ok ? r.json() : null)),
    ]).then(([reg, pick]) => {
      setTeams(reg?.teams ?? []);
      setPickedTeamId(pick?.teamId ?? null);
    }).catch(() => setPickedTeamId(null));
  }, []);

  const pickedTeam = teams.find((t) => t.id === pickedTeamId);

  const handlePick = async (teamId: string) => {
    setSaving(true);
    try {
      await fetch("/api/tournament-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      setPickedTeamId(teamId);
      setSaved(true);
      setShowPicker(false);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Still loading
  if (pickedTeamId === undefined) return null;

  // Already picked and locked — show compact badge
  if (pickedTeam && isLocked) {
    return (
      <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">{pickedTeam.flagEmoji}</span>
        <div>
          <p className="text-sm font-semibold text-purple-900">Your WC winner pick: {pickedTeam.name}</p>
          <p className="text-xs text-purple-700">Tournament is underway — picks are locked</p>
        </div>
      </div>
    );
  }

  // Already picked, not locked — show with edit option
  if (pickedTeam && !isLocked) {
    return (
      <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{pickedTeam.flagEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-purple-900">Your WC winner pick: {pickedTeam.name}</p>
            <p className="text-xs text-purple-700">Locks when the tournament starts</p>
          </div>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium underline shrink-0"
        >
          Change
        </button>
        {showPicker && (
          <TeamPickerModal teams={teams} onPick={handlePick} onClose={() => setShowPicker(false)} saving={saving} />
        )}
      </div>
    );
  }

  // No pick yet
  return (
    <>
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-yellow-900">🏆 Pick your World Cup winner!</p>
          <p className="text-xs text-yellow-800 mt-0.5">
            Who lifts the trophy? Lock in your pick before the tournament starts.
            {saved && <span className="text-green-700 font-medium ml-2">Saved!</span>}
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          disabled={isLocked}
          className="shrink-0 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
        >
          Pick a team
        </button>
      </div>
      {showPicker && (
        <TeamPickerModal teams={teams} onPick={handlePick} onClose={() => setShowPicker(false)} saving={saving} />
      )}
    </>
  );
}

function TeamPickerModal({
  teams,
  onPick,
  onClose,
  saving,
}: {
  teams: Team[];
  onPick: (id: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : teams;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-gray-900 mb-3">Who wins the World Cup?</h3>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team..."
          className="w-full mb-3 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.map((team) => (
            <button
              key={team.id}
              onClick={() => onPick(team.id)}
              disabled={saving}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-purple-50 transition-colors text-left"
            >
              <span className="text-xl">{team.flagEmoji}</span>
              <span className="font-medium">{team.name}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
