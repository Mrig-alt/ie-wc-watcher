"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Trophy, Coins, UserPlus } from "lucide-react";

export default function Header() {
  const { data: session } = useSession();
  const [liveTokens, setLiveTokens] = useState<number | null>(
    session?.user?.tokenBalance ?? null
  );

  // Sync from session immediately whenever session changes
  useEffect(() => {
    if (session?.user?.tokenBalance != null) {
      setLiveTokens(session.user.tokenBalance);
    }
  }, [session?.user?.id, session?.user?.tokenBalance]);

  const fetchTokens = useCallback(() => {
    if (!session?.user?.id) {
      setLiveTokens(null);
      return;
    }
    fetch("/api/students/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tokenBalance != null) setLiveTokens(d.tokenBalance);
      })
      .catch(() => {});
  }, [session?.user?.id]);

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
        <Countdown />

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
              <Link
                href="/account"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>{liveTokens ?? session.user.tokenBalance ?? "\u2014"}</span>
              </Link>
              <Link
                href="/account"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 truncate max-w-[100px]"
              >
                {session.user.name?.split(" ")[0]}
              </Link>
            </>
          ) : (
            <Link
              href="/join"
              className="flex items-center gap-1.5 rounded-lg bg-green-600 p-2 text-white hover:bg-green-700 transition-colors sm:px-3 sm:py-1.5"
              title="Join Class"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">Join</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number } | null>(null);

  useEffect(() => {
    // Target: Kickoff of first group match (June 11, 2026, 19:00:00 UTC)
    const target = new Date("2026-06-11T19:00:00Z").getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0 });
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ d, h, m });
    };

    update();
    const interval = setInterval(update, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;
  if (timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ml-4 animate-pulse">
      ⏳ {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m to kickoff
    </div>
  );
}
