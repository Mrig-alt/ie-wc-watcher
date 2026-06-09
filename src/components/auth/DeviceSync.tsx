"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export default function DeviceSync() {
  const { data: session } = useSession();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!session?.user || hasSynced.current) return;

    // If deviceId is strictly null (meaning the backend checked and it's missing), trigger sync
    if (session.user.deviceId === null) {
      hasSynced.current = true;
      fetch("/api/sync-device", { method: "POST" }).catch((err) => {
        console.error("Failed to sync device ID:", err);
      });
    }
  }, [session]);

  return null; // Invisible component
}
