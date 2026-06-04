"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Pings /api/presence on mount so lastSeenAt stays fresh
export default function PresenceTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    // Guard on user.id — session.user alone can be a truthy empty object before id is populated
    if (!session?.user?.id) return;
    fetch("/api/presence", { method: "POST" }).catch(() => {});
  }, [session?.user?.id]);

  return null;
}
