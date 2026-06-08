"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Mail, Trophy, Loader2 } from "lucide-react";

interface Props {
  email: string;
}

export default function NotificationOnboardingModal({ email }: Props) {
  const [open, setOpen] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
    }
  }, []);

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

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
      return true;
    } catch (err) {
      console.error("Error subscribing to push", err);
      return false;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let finalPushEnabled = pushEnabled;

    if (pushEnabled && pushSupported) {
      const success = await subscribeToPush();
      if (!success) finalPushEnabled = false;
    }

    try {
      await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushEnabled: finalPushEnabled,
          emailEnabled,
        }),
      });
      
      setOpen(false);
      window.dispatchEvent(new Event("token-refresh")); // trigger session reload if needed
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-blue-900">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Never miss a match or a challenge!
          </DialogTitle>
          <DialogDescription className="text-gray-600 pt-2">
            To keep the tournament active, we need a way to let you know when someone challenges you to a bet, or when it's time to lock in your predictions before a match starts. How do you prefer to stay updated?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
            <Checkbox 
              checked={emailEnabled} 
              onCheckedChange={(c) => setEmailEnabled(!!c)} 
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Email Updates
              </div>
              <p className="text-xs text-gray-500 mt-1">We'll send alerts to <span className="font-medium text-gray-700">{email}</span></p>
            </div>
          </label>

          {pushSupported && (
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
              <Checkbox 
                checked={pushEnabled} 
                onCheckedChange={(c) => setPushEnabled(!!c)} 
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-green-600" />
                  Push Notifications
                </div>
                <p className="text-xs text-gray-500 mt-1">Get alerts directly on your device (browser prompt will appear)</p>
              </div>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Preferences"}
          </Button>
          <Button variant="ghost" onClick={handleSave} disabled={loading} className="w-full text-gray-500 text-xs">
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
