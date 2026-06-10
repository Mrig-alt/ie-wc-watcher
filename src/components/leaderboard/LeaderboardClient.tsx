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
  const [searchLoading, setSearchLoading] = useState(false);

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
      setSearchLoading(true);
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
      setSearchLoading(false);
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

  const [userConnections, setUserConnections] = useState<any[]>([]);

  const fetchUserConnections = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        setUserConnections(data.connections || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchUserConnections();
  }, [currentUserId, fetchUserConnections]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-gray-50 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name..."
            className="pl-9 bg-white shadow-sm"
          />
        </div>

        {/* OPEN MARKET CTA */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              📈 The Open Market
            </h3>
            <p className="text-xs text-blue-800 mt-1">
              Want to climb the leaderboard faster? Trade peer-to-peer bets against other students in the open market.
            </p>
          </div>
          <a
            href="/market"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            Go to Market
          </a>
        </div>
      </div>

      {searchLoading && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="w-8 h-4 bg-gray-200 rounded" />
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="w-32 h-3.5 bg-gray-200 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded" />
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {processedRows.map((s, idx) => {
            const pendingReceivedConn = userConnections.find((c) =>
              c.requesteeId === currentUserId && c.requesterId === s.id && c.status === "pending"
            );
            const status = userConnections.find((c) =>
              c.requesterId === currentUserId && c.requesteeId === s.id && c.status === "pending"
            ) ? "pending_sent" :
            pendingReceivedConn ? "pending_received" :
            userConnections.find((c) =>
              (c.requesterId === s.id || c.requesteeId === s.id) && c.status === "accepted"
            ) ? "accepted" : "none";

            return (
              <LeaderboardRow
                key={s.id + idx}
                rank={s.rank ?? 0}
                student={{
                  id: s.id,
                  name: s.displayName,
                  tokenBalance: s.profit,
                  isHonoraryFan: s.isHonoraryFan,
                  hasBoughtIn: s.hasBoughtIn,
                  team: s.isAnonymous ? null : (s.teamName ? { name: s.teamName, flagEmoji: s.teamFlag! } : null),
                  isAnonymous: s.isAnonymous,
                }}
                isCurrentUser={s.isCurrentUser}
                currentUserId={currentUserId}
                connectionStatus={status}
                connectionId={pendingReceivedConn?.id}
                onConnectionChange={() => fetchUserConnections()}
              />
            );
          })}
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
