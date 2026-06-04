"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Flame, ExternalLink, ChevronDown, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import UpdateWatchPlanSheet from "./UpdateWatchPlanSheet";
import LiveReportsWidget from "./LiveReportsWidget";

function formatMatchTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    + " · "
    + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

type HottestMatch = {
  matchId: string; matchDatetime: string; stage: string; groupName: string | null;
  status: string; team1Name: string; team2Name: string; team1Flag: string; team2Flag: string;
  totalPeople: number;
  venueBreakdown: { name: string; url: string | null; mapsUrl: string | null; count: number; people: string[] }[];
};

type TopBar = {
  venueId: string | null; name: string; area: string | null; mapsUrl: string | null;
  totalPeople: number;
  byMatch: { matchId: string; team1Name: string; team2Name: string; team1Flag: string; team2Flag: string; matchDatetime: string; people: string[] }[];
};

type MatchForSheet = { id: string; team1Name: string; team2Name: string; team1Flag: string; team2Flag: string; matchDatetime: string };
type VenueForSheet = { id: string; name: string; area: string | null; mapsUrl: string | null };
type MyPlan = { matchId: string; locationName: string | null; venueId: string | null };

export default function WatchMapClient({
  hottestMatches, topBars, currentUserId,
  matchesForSheet, venuesForSheet, myPlans,
}: {
  hottestMatches: HottestMatch[];
  topBars: TopBar[];
  currentUserId: string | null;
  matchesForSheet: MatchForSheet[];
  venuesForSheet: VenueForSheet[];
  myPlans: MyPlan[];
}) {
  const [tab, setTab] = useState<"matches" | "bars">("matches");
  const [expandedBar, setExpandedBar] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Where to Watch 📍</h1>
        <p className="text-sm text-gray-500 mt-1">See where classmates are heading for each match</p>
      </div>

      {currentUserId && (
        <UpdateWatchPlanSheet matches={matchesForSheet} venues={venuesForSheet} existingPlans={myPlans} />
      )}

      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        <button onClick={() => setTab("matches")} className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all", tab === "matches" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>🔥 Hottest Matches</button>
        <button onClick={() => setTab("bars")} className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all", tab === "bars" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>🍺 Top Bars</button>
      </div>

      {tab === "matches" && (
        <div className="space-y-3">
          {hottestMatches.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Flame className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No watch plans yet — be the first!</p>
            </div>
          )}
          {hottestMatches.map((m, i) => (
            <div key={m.matchId} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Header — clicking expands venues; title links to match detail */}
              <div className="flex items-center justify-between px-4 py-3">
                <Link href={`/matches/${m.matchId}`} className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                  <span className="shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-sm font-bold text-gray-400">#{i + 1}</span>}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {m.team1Flag} {m.team1Name} <span className="text-gray-400">vs</span> {m.team2Flag} {m.team2Name}
                    </div>
                    <div className="text-xs text-gray-400">{formatMatchTime(m.matchDatetime)}</div>
                  </div>
                </Link>
                <button onClick={() => setExpandedMatch(expandedMatch === m.matchId ? null : m.matchId)}
                  className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                    <Users className="h-4 w-4" />{m.totalPeople}
                  </span>
                  {expandedMatch === m.matchId ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
              {expandedMatch !== m.matchId && m.venueBreakdown[0] && (
                <div className="px-4 pb-3 -mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="h-3 w-3 text-green-500" />
                  Top spot: <span className="font-medium text-gray-700">{m.venueBreakdown[0].name}</span> ({m.venueBreakdown[0].count} going)
                </div>
              )}
              {expandedMatch === m.matchId && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-2">
                  {m.venueBreakdown.map((v) => (
                    <div key={v.name} className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-800">{v.name}</span>
                          {(v.mapsUrl || v.url) && (
                            <a href={v.mapsUrl ?? v.url ?? ""} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 text-gray-400 hover:text-green-600" />
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 ml-5">{v.people.join(", ")}</div>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{v.count} going</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "bars" && (
        <div className="space-y-3">
          {topBars.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No venues registered yet</p>
            </div>
          )}
          {topBars.map((bar, i) => (
            <div key={bar.name} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <button className="w-full text-left px-4 py-3" onClick={() => setExpandedBar(expandedBar === bar.name ? null : bar.name)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-sm font-bold text-gray-400">#{i + 1}</span>}</span>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                        {bar.name}
                        {bar.mapsUrl && (
                          <a href={bar.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3 text-gray-400 hover:text-green-600" />
                          </a>
                        )}
                      </div>
                      {bar.area && <div className="text-xs text-gray-400">{bar.area}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm font-bold text-green-600"><Users className="h-4 w-4" />{bar.totalPeople}</span>
                    {expandedBar === bar.name ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </button>
              {expandedBar === bar.name && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-3">
                  {bar.byMatch.map((bm) => (
                    <div key={bm.matchId}>
                      {/* Each match in a bar links to the match detail */}
                      <Link href={`/matches/${bm.matchId}`} className="text-sm font-medium text-gray-800 hover:text-green-600 transition-colors">
                        {bm.team1Flag} {bm.team1Name} <span className="text-gray-400">vs</span> {bm.team2Flag} {bm.team2Name}
                      </Link>
                      <div className="text-xs text-gray-400 mb-1">{formatMatchTime(bm.matchDatetime)}</div>
                      <div className="flex flex-wrap gap-1">
                        {bm.people.map((p) => (
                          <span key={p} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{p}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <LiveReportsWidget
          currentUserId={currentUserId}
          knownVenues={venuesForSheet.map((v) => ({ id: v.id, name: v.name, area: v.area }))}
        />
      </div>
    </div>
  );
}
