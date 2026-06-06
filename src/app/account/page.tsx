"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import VisibilitySelector from "@/components/profile/VisibilitySelector";
import PushSettings from "@/components/profile/PushSettings";

type Visibility = "public" | "friends" | "stealth";

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [visibility, setVisibility] = useState<Visibility>(
    (session?.user?.visibility ?? "public") as Visibility
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Guest upgrade states
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  const handleVerify = async () => {
    if (!session) return;
    setVerifying(true);
    setVerificationError("");
    try {
      const res = await fetch(`/api/students/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerificationError(data.error || "Incorrect class PIN");
        return;
      }
      await update({
        isGuest: false,
        tokenBalance: data.student.tokenBalance,
      });
      setPin("");
      router.refresh();
    } catch {
      setVerificationError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Guest buy/refill tokens states
  const [buying, setBuying] = useState(false);

  const handleBuyTokens = async () => {
    if (!session) return;
    setBuying(true);
    try {
      const res = await fetch("/api/students/buy-tokens", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        await update({
          tokenBalance: data.tokenBalance,
          hasBoughtIn: data.hasBoughtIn,
        });
        router.refresh();
      } else {
        alert(data.error || "Failed to refill tokens");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBuying(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/join");
    }
  }, [status, router]);

  // Sync visibility from session once loaded
  useEffect(() => {
    if (session?.user?.visibility) {
      setVisibility(session.user.visibility as Visibility);
    }
  }, [session?.user?.visibility]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!session) return null;

  // JWT is refreshed from DB on every request via auth.ts — this is always live
  const displayTokens = session.user.tokenBalance ?? 0;

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
        <div className="flex gap-4 pt-1">
          {session.user.teamId && (
            <a href="/my-team" className="text-xs text-green-600 hover:underline">View my team →</a>
          )}
          <a href="/leaderboard" className="text-xs text-green-600 hover:underline">See leaderboard →</a>
        </div>
      </div>

      {session.user.isGuest && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <span>🔒 Upgrade Account</span>
              <span className="text-[10px] font-medium text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full">Guest</span>
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              You are currently browsing as a guest. Enter your class PIN below to verify your account, unlock predicting and betting, and get your starting 100+ tokens!
            </p>
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setVerificationError(""); }}
              placeholder="Enter class PIN"
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
              onKeyDown={(e) => e.key === "Enter" && pin.trim() && !verifying && handleVerify()}
            />
            <Button size="sm" onClick={handleVerify} disabled={verifying || !pin.trim()}>
              {verifying ? "Verifying..." : "Verify"}
            </Button>
          </div>
          {verificationError && (
            <p className="text-xs text-red-600 font-medium">{verificationError}</p>
          )}
        </div>
      )}

      {!session.user.isGuest && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <span>🪙 Refill Tokens</span>
              <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Buy-In</span>
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Out of tokens or want to play high-stakes? Get an instant refill of <strong className="text-amber-700">+100 tokens</strong> to challenge classmates.
            </p>
          </div>

          <div className="rounded-lg bg-amber-50/80 border border-amber-100 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-amber-900">⚠️ Leaderboard Dilution Tag</p>
            <p className="text-amber-750 leading-relaxed">
              To preserve competitive integrity, your account will be permanently tagged with a <strong className="text-amber-950">"Refilled 🧪"</strong> badge on the leaderboard. You will not be considered a "legit" first-place winner.
            </p>
          </div>

          <Button
            onClick={handleBuyTokens}
            disabled={buying}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-sm transition-all"
          >
            {buying ? "Refilling..." : "Refill Balance (+100 🪙)"}
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Privacy mode</h2>
        <VisibilitySelector
          value={visibility}
          onChange={(v) => { setVisibility(v); setSaved(false); }}
        />
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
        </Button>
      </div>

      <PushSettings />

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
