"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Pings /api/presence on mount so lastSeenAt stays fresh
export default function PresenceTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    // Guard on user.id — session.user alone can be a truthy empty object before id is populated
    if (!session?.user?.id) return;

    const ping = () => {
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    };

    // Initial ping on mount/auth
    ping();

    // Re-ping every 3 minutes to keep lastSeenAt fresh
    const interval = setInterval(ping, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return null;
}
