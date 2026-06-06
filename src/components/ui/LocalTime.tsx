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
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const dt = new Date(datetime);

  const renderValue = () => {
    if (mode === "date") return formatMatchDate(dt);
    if (mode === "full") return formatKickoffFull(dt);
    return formatKickoff(dt);
  };

  if (!mounted) {
    return <span suppressHydrationWarning>{renderValue()}</span>;
  }

  return <span>{renderValue()}</span>;
}
