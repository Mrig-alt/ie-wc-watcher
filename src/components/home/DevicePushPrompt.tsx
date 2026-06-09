"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DevicePushPrompt() {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show to authenticated, non-guest users
    if (!session || session.user.isGuest) return;

    // Check if push is supported by browser
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // If permission is already granted or denied, don't show the prompt
    if (Notification.permission === "default") {
      // Small delay to not be aggressive on immediate load
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, [session]);

  const enablePush = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }

      const res = await fetch("/api/push/vapid");
      const { publicKey } = await res.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      // Also ensure profile pushEnabled is true
      await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushEnabled: true }),
      });

      setShow(false);
    } catch (err) {
      console.error("Error subscribing to push", err);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex gap-3">
        <div className="mt-0.5 rounded-full bg-green-100 p-2 text-green-600 shrink-0 h-min">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-green-900">Enable match notifications</h3>
          <p className="text-xs text-green-800 mt-1">
            You don't have notifications enabled on this device! Turn them on to instantly know if you won or lost your bets.
          </p>
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto shrink-0">
        <Button variant="outline" size="sm" onClick={() => setShow(false)} disabled={loading} className="w-full sm:w-auto text-xs bg-white border-green-200 text-green-700 hover:bg-green-50">
          Not now
        </Button>
        <Button size="sm" onClick={enablePush} disabled={loading} className="w-full sm:w-auto text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable Push"}
        </Button>
      </div>
    </div>
  );
}
