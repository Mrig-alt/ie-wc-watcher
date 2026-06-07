"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Team {
  id: string;
  name: string;
  flagEmoji: string;
  countryCode: string;
  group: string | null;
  confederation: string;
  takenBy?: string | null;
}

interface TeamGridProps {
  teams: Team[];
  selectedTeamId?: string | null;
  onSelect: (teamId: string) => void;
  disabled?: boolean;
}

export default function TeamGrid({ teams, selectedTeamId, onSelect, disabled }: TeamGridProps) {
  const [search, setSearch] = useState("");

  const wcTeams = teams.filter((t) => t.group !== null);
  const friendlyTeams = teams.filter((t) => t.group === null);

  const filter = (list: Team[]) =>
    search.trim()
      ? list.filter(
          (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.countryCode.toLowerCase().includes(search.toLowerCase())
        )
      : list;

  const groups = Array.from(new Set(wcTeams.map((t) => t.group))).sort() as string[];

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-white pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="pl-9 bg-white shadow-sm"
          />
        </div>
      </div>

      {search.trim() ? (
        <TeamSection
          label="Results"
          teams={filter([...wcTeams, ...friendlyTeams])}
          selectedTeamId={selectedTeamId}
          onSelect={onSelect}
          disabled={disabled}
        />
      ) : (
        <>
          {groups.map((g) => (
            <TeamSection
              key={g}
              label={`Group ${g}`}
              teams={wcTeams.filter((t) => t.group === g)}
              selectedTeamId={selectedTeamId}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
          {friendlyTeams.length > 0 && (
            <TeamSection
              label="Adopt a Team (not in WC)"
              teams={friendlyTeams}
              selectedTeamId={selectedTeamId}
              onSelect={onSelect}
              disabled={disabled}
              honorary
            />
          )}
        </>
      )}
    </div>
  );
}

function TeamSection({
  label,
  teams,
  selectedTeamId,
  onSelect,
  disabled,
  honorary,
}: {
  label: string;
  teams: Team[];
  selectedTeamId?: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  honorary?: boolean;
}) {
  if (teams.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {teams.map((team) => {
          const taken = !!team.takenBy;
          const selected = selectedTeamId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              disabled={disabled || (taken && !selected)}
              onClick={() => onSelect(team.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                selected
                  ? "border-green-600 bg-green-50 text-green-700 ring-1 ring-green-600"
                  : taken
                  ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                  : honorary
                  ? "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-400"
                  : "border-gray-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50"
              )}
            >
              <span className="text-lg leading-none">{team.flagEmoji}</span>
              <span className="truncate leading-tight">{team.name}</span>
              {taken && !selected && (
                <span className="ml-auto text-xs text-gray-400">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
