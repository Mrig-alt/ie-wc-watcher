"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import VisibilitySelector from "@/components/profile/VisibilitySelector";

type Visibility = "public" | "friends" | "stealth";

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [liveTokens, setLiveTokens] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(
    (session?.user?.visibility ?? "public") as Visibility
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Redirect unauthenticated users without calling router.push in render
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/join");
    }
  }, [status, router]);

  // Fetch live tokenBalance + visibility directly from DB on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/students/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.tokenBalance != null) setLiveTokens(d.tokenBalance);
        if (d?.visibility) setVisibility(d.visibility as Visibility);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  const displayTokens = liveTokens ?? session.user.tokenBalance ?? 0;

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (res.ok) {
        await update({ visibility });
        setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{session.user.name}</p>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-yellow-600">🪙 {displayTokens}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <a href="/leaderboard" className="text-xs text-green-600 hover:underline">See leaderboard →</a>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Privacy mode</h2>
        <VisibilitySelector
          value={visibility}
          onChange={(v) => { setVisibility(v); setSaved(false); }}
        />
        <Button onClick={handleSave} loading={loading} className="w-full">
          {saved ? "✓ Saved" : "Save changes"}
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900">Your data</h2>
        <p className="text-sm text-gray-500">Download all your data as JSON (GDPR export).</p>
        <a
          href="/account/export"
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Download my data
        </a>
      </div>

      <Button
        variant="outline"
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => signOut({ redirectTo: "/join" })}
      >
        Sign out
      </Button>
    </div>
  );
}
