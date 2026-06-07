"use client";

import { useEffect, useState } from "react";
import { formatKickoff, formatKickoffFull, formatMatchDate } from "@/lib/utils";

export default function LocalTime({
  datetime,
  mode = "time"
}: {
  datetime: string | Date;
  mode?: "time" | "date" | "full";
}) {
  const [mounted, setMounted] = useState(false);
  const [tz, setTz] = useState("Europe/Madrid");
  
  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setMounted(true);
  }, []);

  const dt = new Date(datetime);

  const renderValue = () => {
    if (mode === "date") return formatMatchDate(dt, tz);
    if (mode === "full") return formatKickoffFull(dt, tz);
    return formatKickoff(dt, tz);
  };

  if (!mounted) {
    return <span suppressHydrationWarning>{renderValue()}</span>;
  }

  return <span>{renderValue()}</span>;
}
