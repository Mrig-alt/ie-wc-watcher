"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

export default function PushSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
  }, []);

  const handleSubscribe = async () => {
    if (!isSupported) return;
    setLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setLoading(false);
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

      setIsSubscribed(true);
    } catch (err) {
      console.error("Error subscribing to push", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setIsSubscribed(false);
    } catch (err) {
      console.error("Error unsubscribing from push", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 font-semibold text-gray-900">
        <Bell className="h-5 w-5 text-green-600" />
        Notifications
      </div>
      <p className="text-sm text-gray-500">
        Get alerted when someone joins your mini-league, your bet is settled, or a match you predicted is about to kick off!
      </p>

      {isIOS && (
        <p className="text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded">
          iOS tip: You must add this app to your Home Screen (via the Share menu) to enable notifications.
        </p>
      )}

      {isSubscribed ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-md">
            <Bell className="h-4 w-4" /> Notifications Enabled
          </div>
          <Button
            onClick={handleUnsubscribe}
            disabled={loading}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <BellOff className="h-4 w-4 mr-1" />
            {loading ? "Disabling..." : "Turn off"}
          </Button>
        </div>
      ) : (
        <Button onClick={handleSubscribe} disabled={loading} size="sm">
          {loading ? "Enabling..." : "Enable Notifications"}
        </Button>
      )}
    </div>
  );
}
