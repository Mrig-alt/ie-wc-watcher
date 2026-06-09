"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import useSWR from "swr";
import { Trophy, Coins, UserPlus } from "lucide-react";

export default function Header() {
  const { data: session } = useSession();
  const fetcher = (url: string) => fetch(url).then((res) => res.ok ? res.json() : null);
  const { data: profile, mutate } = useSWR(
    session?.user?.id ? "/api/students/me" : null,
    fetcher,
    { refreshInterval: 0 } // no automatic polling, we rely on mutate
  );

  useEffect(() => {
    window.addEventListener("token-refresh", () => mutate());
    return () => window.removeEventListener("token-refresh", () => mutate());
  }, [mutate]);

  const liveTokens = profile?.tokenBalance ?? session?.user?.tokenBalance ?? null;

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
              <Link
                href="/account"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>{liveTokens ?? "\u2014"}</span>
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

