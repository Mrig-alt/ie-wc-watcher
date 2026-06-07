"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";

interface RowData {
  id: string;
  name: string;
  tokenBalance: number;
  escrowTokens: number;
  isHonoraryFan: boolean;
  visibility: string;
  leaderboardVisibility: boolean;
  teamName: string | null;
  teamFlag: string | null;
  hasBoughtIn: boolean;
  totalTokensReceived: number;
}

interface LeaderboardClientProps {
  rows: RowData[];
  currentUserId?: string | null;
}

export default function LeaderboardClient({ rows, currentUserId }: LeaderboardClientProps) {
  const [search, setSearch] = useState("");

  // Map to apply display names first, so we can search on "Anonymous 1", etc.
  let anonymousCounter = 1;
  const processedRows = rows.map((s, i) => {
    const isAnonymous = s.leaderboardVisibility === false && s.id !== currentUserId;
    const displayName = isAnonymous ? `Anonymous ${anonymousCounter++} 🕵️` : s.name;
    const isCurrentUser = s.id === currentUserId;
    
    return {
      ...s,
      rank: i + 1,
      displayName,
      isAnonymous,
      isCurrentUser,
      profit: s.tokenBalance + s.escrowTokens - s.totalTokensReceived,
    };
  });

  const filteredRows = processedRows.filter(s => 
    s.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-gray-50 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name..."
            className="pl-9 bg-white shadow-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filteredRows.map((s) => (
            <LeaderboardRow
              key={s.id}
              rank={s.rank}
              student={{
                name: s.displayName,
                tokenBalance: s.profit,
                isHonoraryFan: s.isHonoraryFan,
                hasBoughtIn: s.hasBoughtIn,
                team: s.isAnonymous ? null : (s.teamName ? { name: s.teamName, flagEmoji: s.teamFlag! } : null),
              }}
              isCurrentUser={s.isCurrentUser}
            />
          ))}
        </div>
      </div>

      {filteredRows.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-12">No students match your search.</p>
      )}
    </div>
  );
}
