"use client";

import { useState } from "react";
import MatchCardClient from "@/components/matches/MatchCardClient";

interface Props {
  matches: Array<{
    match: any;
    team1Supporters: any[];
    team2Supporters: any[];
    prediction: any;
    myWatchInvite: any;
    opponentWatchInvite: any;
    watchCount?: number;
  }>;
}

export default function HomeTabsClient({ matches }: Props) {
  const [tab, setTab] = useState<"wc" | "global">("wc");

  const wcMatches = matches.filter((m) => m.match.stage !== "global");
  const globalMatches = matches.filter((m) => m.match.stage === "global");

  const displayedMatches = tab === "wc" ? wcMatches : globalMatches;

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex gap-2 rounded-xl bg-gray-100 p-1 mb-4">
        <button
          onClick={() => setTab("wc")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === "wc" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🏆 WC 2026
        </button>
        <button
          onClick={() => setTab("global")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === "global" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🌍 Live Globally
        </button>
      </div>

      {displayedMatches.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          No matches today for this category — check the schedule for upcoming games.
        </p>
      ) : (
        <div className="space-y-3">
          {displayedMatches.map(({ match, team1Supporters, team2Supporters, prediction, myWatchInvite, opponentWatchInvite, watchCount }) => (
            <MatchCardClient
              key={match.id}
              match={match}
              team1Supporters={team1Supporters}
              team2Supporters={team2Supporters}
              prediction={prediction}
              myWatchInvite={myWatchInvite}
              opponentWatchInvite={opponentWatchInvite}
              watchCount={watchCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
