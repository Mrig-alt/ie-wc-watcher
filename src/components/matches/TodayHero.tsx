import Link from "next/link";
import { formatKickoff } from "@/lib/utils";
import { useEffect, useState } from "react";

import LocalTime from "@/components/ui/LocalTime";

interface TodayHeroProps {
  upcomingCount: number;
  liveCount: number;
  nextMatch?: {
    matchDatetime: Date;
    team1: { name: string; flagEmoji: string } | null;
    team2: { name: string; flagEmoji: string } | null;
  } | null;
  myTeam?: { name: string; flagEmoji: string; countryCode: string } | null;
  tokenBalance?: number;
  isLoggedIn?: boolean;
}

export default function TodayHero({ upcomingCount, liveCount, nextMatch, myTeam, tokenBalance, isLoggedIn }: TodayHeroProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-800 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">IE World Cup 2026</h1>
          <p className="mt-0.5 text-green-200 text-sm mb-3">Class cohort tracker</p>
          <Countdown />
        </div>
        {isLoggedIn && (
          myTeam ? (
            <Link
              href="/my-team"
              className="flex flex-col items-end group"
              title={`My team: ${myTeam.name}`}
            >
              <span className="text-3xl transition-transform group-hover:scale-110 select-none">{myTeam.flagEmoji}</span>
              <span className="text-xs text-green-200 mt-0.5 group-hover:text-white transition-colors">{myTeam.name}</span>
            </Link>
          ) : (
            <Link
              href="/my-team"
              className="flex flex-col items-end group"
              title="Select your supported team"
            >
              <span className="text-3xl transition-transform group-hover:scale-110 select-none">🏳️</span>
              <span className="text-xs text-green-200 mt-0.5 group-hover:text-white transition-colors">Select Team</span>
            </Link>
          )
        )}
      </div>


      <div className="mt-4 flex items-center gap-4">
        {liveCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-sm font-medium">{liveCount} live</span>
          </div>
        )}
        {upcomingCount > 0 && (
          <span className="text-sm text-green-200">{upcomingCount} upcoming today</span>
        )}
        {tokenBalance !== undefined && (
          <span className="ml-auto text-sm font-medium">🪙 {tokenBalance}</span>
        )}
      </div>

      {nextMatch && liveCount === 0 && (
        <div className="mt-3 rounded-xl bg-white/10 px-4 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-green-200 font-semibold mb-1">Next match</p>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{nextMatch.team1?.flagEmoji} {nextMatch.team1?.name} vs {nextMatch.team2?.flagEmoji} {nextMatch.team2?.name}</span>
            <span className="text-sm font-medium"><LocalTime datetime={nextMatch.matchDatetime} /></span>
          </div>
        </div>
      )}
    </div>
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
    <div className="flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white animate-pulse">
      ⏳ {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m to kickoff
    </div>
  );
}
