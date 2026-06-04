"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Pings /api/presence on mount so lastSeenAt stays fresh
export default function PresenceTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/presence", { method: "POST" }).catch(() => {});
  }, [session]);

  return null;
}
