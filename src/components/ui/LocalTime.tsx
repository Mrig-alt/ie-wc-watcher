"use client";

import { useEffect, useState } from "react";
import { formatKickoff, formatKickoffFull } from "@/lib/utils";

export default function LocalTime({ datetime, full = false }: { datetime: string | Date; full?: boolean }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const dt = new Date(datetime);

  if (!mounted) {
    // Return a placeholder or server-rendered time (will cause hydration mismatch if not suppressed)
    // To avoid mismatch, we can render the UTC time but it's better to just suppress hydration warning
    return <span suppressHydrationWarning>{full ? formatKickoffFull(dt) : formatKickoff(dt)}</span>;
  }

  return <span>{full ? formatKickoffFull(dt) : formatKickoff(dt)}</span>;
}
