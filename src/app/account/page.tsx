"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import VisibilitySelector from "@/components/profile/VisibilitySelector";
import PushSettings from "@/components/profile/PushSettings";
import BetsHistory from "@/components/profile/BetsHistory";
import TeamGrid from "@/components/teams/TeamGrid";

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
  const [upgradeStep, setUpgradeStep] = useState<"pin" | "team" | "visibility">("pin");
  const [teams, setTeams] = useState<any[]>([]);
  const [upgradeTeamId, setUpgradeTeamId] = useState<string | null>(null);
  const [upgradeVisibility, setUpgradeVisibility] = useState<Visibility>("public");

  useEffect(() => {
    if (session?.user?.isGuest) {
      fetch("/api/register").then(r => r.json()).then(d => setTeams(d.teams || []));
    }
  }, [session?.user?.isGuest]);

  const handleVerify = async () => {
    if (!session) return;
    setVerifying(true);
    setVerificationError("");
    try {
      const res = await fetch(`/api/students/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, teamId: upgradeTeamId || undefined, visibility: upgradeVisibility }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerificationError(data.error || "Incorrect class PIN");
        setUpgradeStep("pin");
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
              You are currently browsing as a guest. Upgrade your account to unlock predicting and betting, and claim your starting tokens!
            </p>
          </div>

          {upgradeStep === "pin" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Enter Class PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setVerificationError(""); }}
                placeholder="Enter class PIN"
                className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
                onKeyDown={(e) => e.key === "Enter" && pin.trim() && setUpgradeStep("team")}
              />
              <Button onClick={() => setUpgradeStep("team")} disabled={!pin.trim()} className="w-full">
                Continue → Pick your team
              </Button>
              {verificationError && <p className="text-xs text-red-600 font-medium">{verificationError}</p>}
            </div>
          )}

          {upgradeStep === "team" && (
            <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div>
                <h3 className="font-medium text-gray-900">Pick your team</h3>
                <p className="text-xs text-gray-500">Optional — you can skip and set it later</p>
              </div>
              <TeamGrid teams={teams} selectedTeamId={upgradeTeamId} onSelect={setUpgradeTeamId} />
              <div className="flex flex-col gap-2 mt-2">
                <Button className="w-full" onClick={() => setUpgradeStep("visibility")}>
                  {upgradeTeamId ? "Continue →" : "Continue without a team →"}
                </Button>
                <button type="button" onClick={() => setUpgradeStep("pin")} className="text-xs text-gray-500 hover:text-gray-700">← Back</button>
              </div>
            </div>
          )}

          {upgradeStep === "visibility" && (
            <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-medium text-gray-900">Privacy mode</h3>
              <VisibilitySelector value={upgradeVisibility} onChange={setUpgradeVisibility} />
              
              <div className="pt-2 flex flex-col gap-2">
                <Button className="w-full" onClick={handleVerify} disabled={verifying}>
                  {verifying ? "Verifying & Upgrading..." : "Complete Upgrade"}
                </Button>
                <button type="button" disabled={verifying} onClick={() => setUpgradeStep("team")} className="text-xs text-gray-500 hover:text-gray-700">← Back</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Out of tokens state */}
      {!session.user.isGuest && session.user.tokenBalance <= 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <span>⚠️ Out of Tokens</span>
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              You've exhausted your token balance! But don't worry, you have two options to get back in the game:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>🕒</span> 
                <span><strong>Wait for Monday:</strong> Every student receives a free stipend of 10 tokens at the start of the week.</span>
              </li>
              <li className="flex gap-2">
                <span>💶</span> 
                <span><strong>Top up now:</strong> Want tokens immediately? You can buy a bundle of 50 tokens for €10. Contact Mrigank to process your payment and credit your account.</span>
              </li>
            </ul>
          </div>

          <Button
            disabled
            className="w-full bg-gray-300 text-gray-500 font-bold shadow-sm cursor-not-allowed"
          >
            Buy Tokens (Coming Soon)
          </Button>
        </div>
      )}

      {!session.user.isGuest && (
        <>
          <BetsHistory currentUserId={session.user.id} />

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
        </>
      )}

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
