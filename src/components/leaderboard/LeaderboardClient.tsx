"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import { Button } from "@/components/ui/button";

interface RowData {
  id: string;
  name: string | null;
  profit: number;
  isHonoraryFan: boolean;
  teamName: string | null;
  teamFlag: string | null;
  hasBoughtIn: boolean;
  isCurrentUser: boolean;
  isAnonymous: boolean;
  rank: number | null;
}

interface LeaderboardClientProps {
  initialRows: RowData[];
  hasNextPage: boolean;
  currentUserId?: string | null;
}

export default function LeaderboardClient({ initialRows, hasNextPage: initialHasNextPage, currentUserId }: LeaderboardClientProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<RowData[]>(initialRows);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // When search changes, reset and fetch page 1
    if (debouncedSearch === "") {
      setRows(initialRows);
      setPage(1);
      setHasNextPage(initialHasNextPage);
      return;
    }

    const fetchSearch = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?search=${encodeURIComponent(debouncedSearch)}&page=1`);
        const data = await res.json();
        if (data.rows) {
          setRows(data.rows);
          setHasNextPage(data.hasNextPage);
          setPage(1);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    fetchSearch();
  }, [debouncedSearch, initialRows, initialHasNextPage]);

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/leaderboard?search=${encodeURIComponent(debouncedSearch)}&page=${nextPage}`);
      const data = await res.json();
      if (data.rows) {
        setRows((prev) => [...prev, ...data.rows]);
        setHasNextPage(data.hasNextPage);
        setPage(nextPage);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Map to apply display names first, so we can sequentially number anonymous users
  let anonymousCounter = 1;
  const processedRows = rows.map((s) => {
    const displayName = s.isAnonymous ? `Anonymous ${anonymousCounter++} 🕵️` : s.name;
    
    return {
      ...s,
      displayName: displayName || "Anonymous 🕵️", // fallback just in case
    };
  });

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
          {processedRows.map((s, idx) => (
            <LeaderboardRow
              key={s.id + idx}
              rank={s.rank ?? 0}
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

      {processedRows.length === 0 && !loading && (
        <p className="text-center text-sm text-gray-400 py-12">No students match your search.</p>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
