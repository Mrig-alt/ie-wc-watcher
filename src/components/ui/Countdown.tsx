"use client";

import { useEffect, useState } from "react";

export default function Countdown() {
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
