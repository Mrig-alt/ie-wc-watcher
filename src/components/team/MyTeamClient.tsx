"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trophy, Users, Calendar, ArrowLeft, Search, ShieldCheck, Settings, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import LocalTime from "@/components/ui/LocalTime";

type SelectableTeam = {
  id: string;
  name: string;
  flagEmoji: string;
  group: string | null;
  confederation: string;
};

type Supporter = {
  id: string;
  name: string;
  tokenBalance: number;
};

type FormattedMatch = {
  id: string;
  stage: string;
  status: string;
  matchDatetime: string;
  team1: { id: string; name: string; flagEmoji: string } | null;
  team2: { id: string; name: string; flagEmoji: string } | null;
  team1Score: number | null;
  team2Score: number | null;
  team1Placeholder: string | null;
  team2Placeholder: string | null;
  team1Odds?: number | null;
  team2Odds?: number | null;
};

type StandingsRow = {
  teamId: string;
  name: string;
  flagEmoji: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

interface Props {
  hasSelectedTeam: boolean;
  selectableTeams: SelectableTeam[];
  isSelectionLocked: boolean;
  currentUserId: string;
  team?: {
    id: string;
    name: string;
    flagEmoji: string;
    group: string | null;
    confederation: string;
    isEliminated: boolean;
    eliminatedStage: string | null;
  };
  supporters?: Supporter[];
  anonymousSupportersCount?: number;
  totalCohortBalance?: number;
  matches?: FormattedMatch[];
  standings?: StandingsRow[];
}

export default function MyTeamClient({
  hasSelectedTeam,
  selectableTeams,
  isSelectionLocked,
  currentUserId,
  team,
  supporters = [],
  anonymousSupportersCount = 0,
  totalCohortBalance = 0,
  matches = [],
  standings = [],
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(team?.id ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConfed, setSelectedConfed] = useState<string>("All");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeTeamId = selectedTeamId;
  const activeTeam = selectableTeams.find((t) => t.id === activeTeamId);

  // List unique confederations
  const confederations = ["All", ...new Set(selectableTeams.map((t) => t.confederation))];

  // Filter selectable teams
  const filteredTeams = selectableTeams.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesConfed = selectedConfed === "All" || t.confederation === selectedConfed;
    return matchesSearch && matchesConfed;
  });

  const handleSelectTeam = async () => {
    if (!activeTeamId) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/students/${currentUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeamId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save team choice");
      } else {
        await update({ teamId: activeTeamId });
        setIsEditing(false);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "friendly": return "Friendly";
      case "group": return "Group Stage";
      case "round_of_32": return "Round of 32";
      case "round_of_16": return "Round of 16";
      case "quarter_final": return "Quarter Final";
      case "semi_final": return "Semi Final";
      case "third_place": return "3rd Place Playoff";
      case "final": return "Final";
      default: return stage;
    }
  };

  const showPicker = !hasSelectedTeam || isEditing;

  if (showPicker) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {hasSelectedTeam && (
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Choose Your Supported Team 🏆</h1>
            <p className="text-sm text-gray-500 mt-1">
              Select the country you will support. Your predictions and bets will feed into your team cohort's power balance!
            </p>
          </div>
        </div>

        {isSelectionLocked && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2.5">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Team selection is locked.</span> The tournament has started, and team selection can no longer be updated.
            </div>
          </div>
        )}

        {!isSelectionLocked && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sticky top-0 z-10 bg-white/90 backdrop-blur-sm pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 shrink-0 scrollbar-none">
                {confederations.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedConfed(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedConfed === c
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Picker Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredTeams.map((t) => {
                const isSelected = activeTeamId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (!isSelectionLocked) setSelectedTeamId(t.id);
                    }}
                    disabled={isSelectionLocked}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all bg-white ${
                      isSelected
                        ? "border-green-500 bg-green-50/50 shadow-sm"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-4xl mb-2">{t.flagEmoji}</span>
                    <span className="text-sm font-semibold text-gray-900 line-clamp-1">{t.name}</span>
                    <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                      Group {t.group} · {t.confederation}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredTeams.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-12">No teams match your filters.</p>
            )}

            {activeTeam && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200 z-50">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activeTeam.flagEmoji}</span>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">SUPPORTING</span>
                    <span className="text-sm font-bold text-gray-900">{activeTeam.name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasSelectedTeam && (
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={handleSelectTeam}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 font-semibold"
                  >
                    {saving ? "Saving..." : "Confirm Selection"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-center text-sm text-red-500 font-medium mt-4">{error}</p>}
      </div>
    );
  }

  // User has selected a team, render Dashboard
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Banner/Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-green-800 to-green-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 text-9xl pointer-events-none">
          {team?.flagEmoji}
        </div>
        <div className="flex items-center gap-5 relative z-10">
          <span className="text-6xl md:text-7xl select-none animate-bounce mt-1">{team?.flagEmoji}</span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">{team?.name}</h1>
              <Badge className={team?.isEliminated ? "bg-red-500 text-white" : "bg-green-500 text-white"}>
                {team?.isEliminated ? `Eliminated (${getStageLabel(team.eliminatedStage ?? "")})` : "Active"}
              </Badge>
            </div>
            <p className="text-sm text-green-200 font-medium">
              Group {team?.group} · {team?.confederation} Confederation
            </p>
          </div>
        </div>

        {!isSelectionLocked && (
          <Button
            onClick={() => {
              setSelectedTeamId(team?.id ?? null);
              setIsEditing(true);
            }}
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-green-900 relative z-10 shrink-0 self-start md:self-center"
          >
            <Settings className="mr-2 h-4 w-4" />
            Change Team
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Standings */}
          {team?.group && standings.length > 0 && (
            <Card className="border-gray-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-50 pb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-lg font-bold text-gray-900">Group {team.group} Standings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] text-gray-400 font-bold uppercase border-b border-gray-100">
                        <th className="px-4 py-3 text-center w-12">Pos</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-3 py-3 text-center">P</th>
                        <th className="px-3 py-3 text-center">W</th>
                        <th className="px-3 py-3 text-center">D</th>
                        <th className="px-3 py-3 text-center">L</th>
                        <th className="px-3 py-3 text-center">GD</th>
                        <th className="px-4 py-3 text-center font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {standings.map((row, i) => {
                        const isCurrent = row.teamId === team.id;
                        return (
                          <tr
                            key={row.teamId}
                            className={`border-b border-gray-50 last:border-0 transition-colors ${
                              isCurrent ? "bg-green-50/50 hover:bg-green-50" : "hover:bg-gray-50/30"
                            }`}
                          >
                            <td className="px-4 py-3.5 text-center font-bold text-gray-500">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3.5 flex items-center gap-2 font-semibold text-gray-900">
                              <span className="text-xl">{row.flagEmoji}</span>
                              <span className={isCurrent ? "text-green-800 font-bold" : ""}>{row.name}</span>
                            </td>
                            <td className="px-3 py-3.5 text-center text-gray-600">{row.played}</td>
                            <td className="px-3 py-3.5 text-center text-gray-600">{row.won}</td>
                            <td className="px-3 py-3.5 text-center text-gray-600">{row.drawn}</td>
                            <td className="px-3 py-3.5 text-center text-gray-600">{row.lost}</td>
                            <td className={`px-3 py-3.5 text-center font-semibold ${row.gd > 0 ? "text-green-600" : row.gd < 0 ? "text-red-500" : "text-gray-500"}`}>
                              {row.gd > 0 ? `+${row.gd}` : row.gd}
                            </td>
                            <td className={`px-4 py-3.5 text-center font-bold ${isCurrent ? "text-green-800" : "text-gray-900"}`}>
                              {row.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule & Results */}
          <Card className="border-gray-100 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg font-bold text-gray-900">Matches & Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {matches.map((m) => {
                const t1 = m.team1;
                const t2 = m.team2;
                const isT1Current = t1?.id === team?.id;
                const isT2Current = t2?.id === team?.id;

                const isCompleted = m.status === "completed";
                const isLive = m.status === "live";

                return (
                  <div key={m.id} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-white">
                    <div className="space-y-1 self-start sm:self-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 rounded px-2 py-0.5">
                        {getStageLabel(m.stage)}
                      </span>
                      <span className="text-xs text-gray-400 block"><LocalTime datetime={m.matchDatetime} mode="full" /></span>
                    </div>

                    <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {m.team1Odds != null && (
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1 rounded shrink-0">
                            {m.team1Odds.toFixed(2)}x
                          </span>
                        )}
                        <span className={`text-sm font-semibold truncate ${isT1Current ? "text-green-800 font-extrabold" : "text-gray-700"}`}>
                          {t1?.name ?? m.team1Placeholder ?? "TBD"}
                        </span>
                        <span className="text-xl shrink-0">{t1?.flagEmoji ?? "🏳️"}</span>
                      </div>

                      {isCompleted ? (
                        <div className="bg-gray-100 rounded-lg px-2.5 py-1 text-sm font-bold text-gray-900 flex items-center gap-1 shrink-0">
                          <span>{m.team1Score}</span>
                          <span className="text-gray-300 font-normal">:</span>
                          <span>{m.team2Score}</span>
                        </div>
                      ) : isLive ? (
                        <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg px-2 py-1 text-xs font-bold flex items-center gap-1 shrink-0 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          LIVE
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 shrink-0">
                          VS
                        </span>
                      )}

                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xl shrink-0">{t2?.flagEmoji ?? "🏳️"}</span>
                        <span className={`text-sm font-semibold truncate ${isT2Current ? "text-green-800 font-extrabold" : "text-gray-700"}`}>
                          {t2?.name ?? m.team2Placeholder ?? "TBD"}
                        </span>
                        {m.team2Odds != null && (
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1 rounded shrink-0">
                            {m.team2Odds.toFixed(2)}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {matches.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">No matches scheduled for this team.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side Column */}
        <div className="space-y-6">
          {/* Cohort Stats */}
          <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-b border-gray-100 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-700" />
                <h3 className="text-base font-bold text-green-900">Cohort Power</h3>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-extrabold text-green-950 flex items-baseline gap-1.5">
                  <span>🪙 {totalCohortBalance}</span>
                  <span className="text-xs font-medium text-green-600">total tokens</span>
                </div>
                <p className="text-xs text-green-700/80 font-medium">
                  Contributed by {supporters.length + anonymousSupportersCount} supporter{supporters.length + anonymousSupportersCount !== 1 ? "s" : ""} in class.
                </p>
              </div>
            </div>
            <CardContent className="p-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Public Supporters</h4>
                <div className="space-y-2">
                  {supporters.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm py-1">
                      <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                        {s.name}
                        {s.id === currentUserId && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0.5 border-green-200 bg-green-50 text-green-700">
                            You
                          </Badge>
                        )}
                      </span>
                      <span className="font-bold text-gray-900">🪙 {s.tokenBalance}</span>
                    </div>
                  ))}
                  {supporters.length === 0 && anonymousSupportersCount === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">No classmates supporting this team yet.</p>
                  )}
                </div>
              </div>

              {anonymousSupportersCount > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                    🕵️ +{anonymousSupportersCount} anonymous supporter{anonymousSupportersCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Stealth / friends mode</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
