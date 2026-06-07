"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import TeamGrid from "@/components/teams/TeamGrid";
import VisibilitySelector from "@/components/profile/VisibilitySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Loader2, CheckCircle2 } from "lucide-react";

type Visibility = "public" | "friends" | "stealth";
type Mode = "checking" | "returning" | "new" | "idle";

interface Team {
  id: string;
  name: string;
  flagEmoji: string;
  countryCode: string;
  group: string | null;
  confederation: string;
  takenBy?: string | null;
}

function formatError(error: unknown): string {
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const msgs = Object.entries(error)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
      .join(", ");
    return msgs || "Registration failed \u2014 please check your details";
  }
  return "Registration failed";
}

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { data: session, status } = useSession();

  // If already logged in, skip the join form entirely
  useEffect(() => {
    if (status === "authenticated") {
      const pinParam = searchParams.get("groupPin") ?? searchParams.get("pin");
      if (pinParam) {
        router.replace(`/students?pin=${pinParam}`);
      } else {
        router.replace(next);
      }
    }
  }, [status, router, next, searchParams]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [step, setStep] = useState<"identity" | "team" | "visibility" | "group">("identity");
  const [groupPin, setGroupPin] = useState(searchParams.get("groupPin") ?? searchParams.get("pin") ?? "");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<Mode>("idle");
  const [firstName, setFirstName] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [leaderboardVisibility, setLeaderboardVisibility] = useState(true);
  const [studentCount, setStudentCount] = useState<number | null>(null);

  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState("");
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    fetch("/api/register")
      .then((r) => r.json())
      .then((d) => {
        setTeams(d.teams ?? []);
        setStudentCount(d.count ?? null);
        setPinRequired(!!d.pinRequired);
      });
  }, []);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const trimmed = email.trim();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setMode("idle");
      setFirstName(null);
      return;
    }
    setMode("checking");
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lookup-user?email=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setMode(data.exists ? "returning" : "new");
        setFirstName(data.firstName ?? null);
        setIsGuest(data.isGuest ?? false);
      } catch {
        setMode("idle");
      }
    }, 600);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [email]);

  const selectedTeam = teams.find((t) => t.id === teamId);
  const isHonoraryFan = selectedTeam ? selectedTeam.group === null : false;
  const earlyBird = studentCount !== null && studentCount < 20 ? 75 : 0;
  const tokenPreview = 100 + (visibility === "public" ? 50 : 0) + earlyBird;

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      pin: isGuest ? "" : (pin || ""),
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push(next);
    } else {
      setError(isGuest ? "Sign in failed" : "Wrong PIN \u2014 ask whoever set up the app for the class PIN.");
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim().toLowerCase(),
          nationality: nationality.trim() || undefined,
          ...(pinRequired && pin && !isGuest ? { pin } : {}),
          teamId: teamId || undefined,
          isHonoraryFan,
          visibility,
          leaderboardVisibility,
          groupPin: groupPin.trim() || undefined,
          isGuest,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(formatError(data.error)); return; }
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        pin: isGuest ? "" : (pin || ""),
        redirect: false,
      });
      if (result?.ok) router.push(next);
      else setError("Registered! But auto-login failed \u2014 try signing in again.");
    } catch {
      setError("Network error \u2014 please try again");
    } finally {
      setLoading(false);
    }
  };

  // Show a spinner while session is loading or while redirecting authenticated users
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <Trophy className="mx-auto h-10 w-10 text-green-600" />
        <h1 className="mt-2 text-2xl font-bold text-gray-900">IE World Cup 2026</h1>
        {studentCount !== null && (
          <p className="mt-1 text-sm text-gray-500">\uD83C\uDF0D {studentCount} classmates already joined</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Your email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="maria@student.ie.edu"
              className="pr-8"
              autoComplete="off"
            />
            {mode === "checking" && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
            )}
            {mode === "returning" && (
              <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-green-500" />
            )}
          </div>
        </div>

        {/* RETURNING USER */}
        {mode === "returning" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 px-4 py-3">
              <p className="text-sm font-medium text-green-800">
                \uD83D\uDC4B Welcome back{firstName ? `, ${firstName}` : ""}!{pinRequired ? " Enter the class PIN to continue." : ""}
              </p>
            </div>
            {pinRequired && (
              <div className="grid gap-1.5">
                <Label htmlFor="pin-return">Class PIN</Label>
                <Input
                  id="pin-return"
                  type="password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(""); }}
                  placeholder="Enter class PIN"
                  autoComplete="off"
                  onKeyDown={(e) => e.key === "Enter" && pin.trim() && handleSignIn()}
                />
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button className="w-full" disabled={loading || (pinRequired && !pin.trim())} onClick={handleSignIn}>
              {loading ? "Signing in..." : "Sign in \u2192"}
            </Button>
          </div>
        )}

        {/* NEW USER — step 1 */}
        {mode === "new" && step === "identity" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">New here \u2014 let&apos;s get you set up \uD83C\uDF89</p>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mar\u00EDa Garc\u00EDa"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nationality">Nationality (optional)</Label>
              <Input
                id="nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Spanish"
                autoComplete="off"
              />
            </div>
            {pinRequired && (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pin-new">{isGuest ? "Class PIN (Optional)" : "Class PIN *"}</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGuest(!isGuest);
                      setPin("");
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors cursor-pointer"
                  >
                    {isGuest ? "Verify class member instead" : "Don't have a PIN? Browse as Guest"}
                  </button>
                </div>
                {!isGuest ? (
                  <Input
                    id="pin-new"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter class PIN"
                    autoComplete="off"
                  />
                ) : (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-3 text-xs text-yellow-800 space-y-1 leading-relaxed">
                    <p className="font-semibold">👉 Registering as Guest</p>
                    <p>You can browse matches and locations, but you won&apos;t be on the leaderboard or get tokens. You can upgrade with a PIN later in your account page!</p>
                  </div>
                )}
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full"
              disabled={!name.trim() || (pinRequired && !isGuest && !pin.trim())}
              onClick={() => setStep("team")}
            >
              Continue &rarr; Pick your team
            </Button>
          </div>
        )}
      </div>

      {/* NEW USER — step 2: pick team */}
      {mode === "new" && step === "team" && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Pick your team</h2>
              <p className="text-xs text-gray-400 mt-0.5">Optional \u2014 you can skip and set it later</p>
            </div>
            {selectedTeam && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                {selectedTeam.flagEmoji} {selectedTeam.name}
                {isHonoraryFan && <span className="text-xs text-blue-500 ml-1">\uD83E\uDD1D Honorary</span>}
              </span>
            )}
          </div>
          <TeamGrid teams={teams} selectedTeamId={teamId} onSelect={setTeamId} />
          <div className="flex flex-col gap-2 mt-2">
            <Button className="w-full" onClick={() => setStep("visibility")}>
              {teamId ? "Continue \u2192" : "Continue without a team \u2192"}
            </Button>
            {teamId && (
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 text-center"
                onClick={() => { setTeamId(null); }}
              >
                Clear selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* NEW USER — step 3: privacy */}
      {mode === "new" && step === "visibility" && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Privacy mode</h2>
          <VisibilitySelector value={visibility} onChange={(v) => { setVisibility(v); if (v === "public") setLeaderboardVisibility(true); }} />

          {visibility !== "public" && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Global Leaderboard</p>
              <p className="text-xs text-gray-500">
                Your location privacy is set to <span className="font-medium">{visibility === "friends" ? "Friends Only" : "Stealth"}</span>.
                Do you still want your name visible on the global token leaderboard?
              </p>
              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setLeaderboardVisibility(true)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    leaderboardVisibility
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  ✅ Show my name
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardVisibility(false)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    !leaderboardVisibility
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  🕵️ Stay anonymous
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            You&apos;ll start with <span className="font-bold text-gray-900">\uD83E\uDE99 {tokenPreview} tokens</span>
            {visibility === "public" && <span className="text-yellow-600"> (includes +50 public bonus \uD83C\uDF89)</span>}
            {earlyBird > 0 && <span className="text-green-600"> +{earlyBird} early-bird bonus \uD83C\uDF1F</span>}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" onClick={() => setStep("group")}>
            Continue →
          </Button>
          <button
            type="button"
            className="w-full text-sm text-gray-400 hover:text-gray-600"
            onClick={() => setStep("team")}
          >
            \u2190 Back
          </button>
        </div>
      )}

      {/* NEW USER — step 4: group */}
      {mode === "new" && step === "group" && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <h2 className="font-semibold text-gray-900">Join a Mini-League?</h2>
            <p className="text-sm text-gray-500">
              Did a friend invite you to a private mini-league? Enter the PIN below. 
              <br/><br/>
              <span className="font-medium">Note: You can always skip this for now and join a group later from the Classmates tab!</span>
            </p>
          </div>

          <div className="grid gap-1.5 pt-2">
            <Label htmlFor="group-pin" className="text-center">Group Invite PIN (Optional)</Label>
            <Input
              id="group-pin"
              value={groupPin}
              onChange={(e) => { setGroupPin(e.target.value.toUpperCase()); setError(""); }}
              placeholder="e.g. A1B2C3D4"
              className="text-center font-mono tracking-widest uppercase"
              maxLength={8}
            />
          </div>

          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          
          <div className="pt-2">
            <Button className="w-full" onClick={handleRegister} disabled={loading}>
              {loading ? "Joining..." : "Finish & Join the Game \uD83C\uDFC6"}
            </Button>
          </div>
          <button
            type="button"
            className="w-full text-sm text-gray-400 hover:text-gray-600"
            onClick={() => setStep("visibility")}
          >
            \u2190 Back
          </button>
        </div>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
