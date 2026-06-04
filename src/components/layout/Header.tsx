"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Trophy, Coins } from "lucide-react";

export default function Header() {
  const { data: session } = useSession();
  const [liveTokens, setLiveTokens] = useState<number | null>(null);

  const fetchTokens = useCallback(() => {
    if (!session?.user) { setLiveTokens(null); return; }
    fetch("/api/students/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.tokenBalance != null) setLiveTokens(d.tokenBalance); })
      .catch(() => {});
  }, [session?.user]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  useEffect(() => {
    window.addEventListener("token-refresh", fetchTokens);
    return () => window.removeEventListener("token-refresh", fetchTokens);
  }, [fetchTokens]);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <Trophy className="h-5 w-5 text-green-600" />
          <span className="hidden sm:inline">IE World Cup 2026</span>
          <span className="sm:hidden">WC 2026</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <Link href="/schedule" className="hover:text-gray-900 transition-colors">Schedule</Link>
          <Link href="/watchmap" className="hover:text-gray-900 transition-colors">Where to Watch</Link>
          <Link href="/students" className="hover:text-gray-900 transition-colors">Classmates</Link>
          <Link href="/leaderboard" className="hover:text-gray-900 transition-colors">Leaderboard</Link>
          <Link href="/feed" className="hover:text-gray-900 transition-colors">Feed</Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/account" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>{liveTokens ?? "—"}</span>
              </Link>
              <Link href="/account" className="text-sm font-medium text-gray-600 hover:text-gray-900 truncate max-w-[100px]">
                {session.user.name?.split(" ")[0]}
              </Link>
            </>
          ) : (
            <Link href="/join" className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
              Join
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
