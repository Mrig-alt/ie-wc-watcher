"use client";

import { useState, useEffect } from "react";

interface PresenceDotProps {
  lastSeenAt: Date | string | null;
}

export default function PresenceDot({ lastSeenAt }: PresenceDotProps) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!lastSeenAt) return;
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    setIsOnline(diff < 2 * 60 * 1000);
  }, [lastSeenAt]);

  if (!isOnline) return null;

  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"
      title="Online now"
    />
  );
}
