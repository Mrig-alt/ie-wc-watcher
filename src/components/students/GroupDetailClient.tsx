"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Copy, Check, Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Member = {
  studentId: string;
  name: string;
  tokenBalance: number;
  joinedAt: string;
};

type GroupBet = {
  id: string;
  status: string;
  stakeTokens: number;
  settled: boolean;
  student1Id: string;
  student2Id: string;
  challengerTeamSide: number | null;
  student1Score1: number | null;
  student1Score2: number | null;
  student2Score1: number | null;
  student2Score2: number | null;
  student1Name: string;
  student2Name: string;
  matchId: string;
  matchDatetime: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Placeholder: string | null;
  team2Placeholder: string | null;
  team1Odds: number | null;
  team2Odds: number | null;
};

type TeamInfo = { id: string; name: string; flagEmoji: string };

interface Props {
  groupId: string;
  groupName: string;
  inviteCode: string;
  isOwner: boolean;
  members: Member[];
  bets: GroupBet[];
  teams: TeamInfo[];
  currentUserId: string;
}

export default function GroupDetailClient({
  groupId,
  groupName,
  inviteCode,
  isOwner,
  members,
  bets,
  teams,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [actioningBet, setActioningBet] = useState<string | null>(null);
  const [betErrors, setBetErrors] = useState<Record<string, string>>({});
  const [leaving, startLeaving] = useTransition();
  const [acceptingScoreId, setAcceptingScoreId] = useState<string | null>(null);
  const [pred1, setPred1] = useState<number>(0);
  const [pred2, setPred2] = useState<number>(0);

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareGroup = () => {
    const text = `Join my "${groupName}" group on IE World Cup 2026!\nInvite code: ${inviteCode}\n${window.location.origin}/join?pin=${inviteCode}`;
    if (navigator.share) navigator.share({ title: "IE World Cup Group", text });
    else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBetAction = async (betId: string, action: "accept" | "decline", s2_1?: number, s2_2?: number) => {
    setActioningBet(betId);
    setBetErrors((prev) => ({ ...prev, [betId]: "" }));
    try {
      const res = await fetch(`/api/bets/${betId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          student2Score1: s2_1 !== undefined ? s2_1 : null,
          student2Score2: s2_2 !== undefined ? s2_2 : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setBetErrors((prev) => ({ ...prev, [betId]: data.error ?? "Failed" }));
      } else {
        setAcceptingScoreId(null);
        router.refresh();
      }
    } finally {
      setActioningBet(null);
    }
  };

  const handleLeave = () => {
    startLeaving(async () => {
      await fetch(`/api/groups/${groupId}/leave`, { method: "DELETE" });
      router.push("/students");
    });
  };

  const matchLabel = (bet: GroupBet) => {
    const t1 = bet.team1Id ? teamMap.get(bet.team1Id) : null;
    const t2 = bet.team2Id ? teamMap.get(bet.team2Id) : null;
    const o1 = bet.team1Odds ? ` (${bet.team1Odds.toFixed(2)}x)` : "";
    const o2 = bet.team2Odds ? ` (${bet.team2Odds.toFixed(2)}x)` : "";
    const n1 = t1 ? `${t1.flagEmoji} ${t1.name}${o1}` : (bet.team1Placeholder ?? "TBD");
    const n2 = t2 ? `${t2.flagEmoji} ${t2.name}${o2}` : (bet.team2Placeholder ?? "TBD");
    return `${n1} vs ${n2}`;
  };

  const betDate = (bet: GroupBet) =>
    new Date(bet.matchDatetime).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/students" className="mt-1 text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{groupName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Invite code */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-500">Invite code</span>
        <span className="font-mono font-bold text-gray-900 tracking-widest flex-1">{inviteCode}</span>
        <button onClick={copyCode} className="text-gray-400 hover:text-gray-700 transition-colors">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={shareGroup}>
          Share
        </Button>
      </div>

      {/* Standings */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">Standings</h2>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {members.map((m, i) => (
            <div
              key={m.studentId}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${
                m.studentId === currentUserId ? "bg-green-50" : ""
              }`}
            >
              <span
                className={`text-sm font-bold w-5 text-center ${
                  i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-400"
                }`}
              >
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </span>
              <span
                className={`flex-1 text-sm font-medium ${
                  m.studentId === currentUserId ? "text-green-800" : "text-gray-800"
                }`}
              >
                {m.name}
                {m.studentId === currentUserId ? " (you)" : ""}
              </span>
              <span className="text-sm font-semibold text-gray-900">🪙 {m.tokenBalance}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Active Bets */}
      {bets.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">⚔️ Active Challenges</h2>
          <div className="space-y-3">
            {bets.map((bet) => {
              const isPending = bet.status === "pending";
              const isOpponent = bet.student2Id === currentUserId && isPending;
              const isChallenger = bet.student1Id === currentUserId;
              const isScoreChallenge = bet.student1Score1 !== null;

              return (
                <div key={bet.id} className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {bet.student1Name} vs {bet.student2Name}
                      </p>
                      <p className="text-xs text-gray-500">{matchLabel(bet)} · {betDate(bet)}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        isPending ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                      }`}
                    >
                      {isPending ? "⏳ Pending" : "✅ Accepted"}
                    </span>
                  </div>

                  {/* Prediction info display */}
                  {isScoreChallenge && (
                    <div className="text-xs space-y-1 bg-gray-50/50 border border-gray-100 rounded-lg p-2 font-medium">
                      <p className="text-gray-600">
                        {bet.student1Name}: <span className="font-semibold text-gray-800">{bet.student1Score1} - {bet.student1Score2}</span>
                      </p>
                      {!isPending && bet.student2Score1 !== null && (
                        <p className="text-gray-600">
                          {bet.student2Name}: <span className="font-semibold text-gray-800">{bet.student2Score1} - {bet.student2Score2}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Acceptor prediction inputs */}
                  {isOpponent && isScoreChallenge && acceptingScoreId === bet.id && (
                    <div className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg bg-gray-50/50">
                      <span className="text-xs text-gray-500 font-medium shrink-0">Your prediction:</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={pred1}
                        onChange={(e) => setPred1(parseInt(e.target.value) || 0)}
                        className="h-8 w-16 text-center bg-white"
                      />
                      <span className="text-xs text-gray-400 font-bold">:</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={pred2}
                        onChange={(e) => setPred2(parseInt(e.target.value) || 0)}
                        className="h-8 w-16 text-center bg-white"
                      />
                    </div>
                  )}

                  {betErrors[bet.id] && <p className="text-xs text-red-500 text-right">{betErrors[bet.id]}</p>}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stake: 🪙 {bet.stakeTokens}</span>
                    {isChallenger && isPending && (
                      <button
                        disabled={actioningBet === bet.id}
                        onClick={async () => {
                          setActioningBet(bet.id);
                          await fetch(`/api/bets/${bet.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "cancel" }),
                          });
                          setActioningBet(null);
                          router.refresh();
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    {isOpponent && (
                      <div className="flex gap-2">
                        <button
                          disabled={actioningBet === bet.id}
                          onClick={() => {
                            setAcceptingScoreId(null);
                            handleBetAction(bet.id, "decline");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 rounded px-2 py-1 bg-white"
                        >
                          Decline
                        </button>
                        {isScoreChallenge && acceptingScoreId !== bet.id ? (
                          <button
                            disabled={actioningBet === bet.id}
                            onClick={() => {
                              setAcceptingScoreId(bet.id);
                              setPred1(0);
                              setPred2(0);
                            }}
                            className="text-xs text-green-600 hover:text-green-800 font-medium border border-green-300 rounded px-2 py-1 bg-green-50"
                          >
                            Accept...
                          </button>
                        ) : (
                          <button
                            disabled={actioningBet === bet.id}
                            onClick={() => {
                              if (acceptingScoreId === bet.id) {
                                handleBetAction(bet.id, "accept", pred1, pred2);
                              } else {
                                handleBetAction(bet.id, "accept");
                              }
                            }}
                            className="text-xs text-green-600 hover:text-green-800 font-medium border border-green-300 rounded px-2 py-1 bg-green-50"
                          >
                            {actioningBet === bet.id ? "..." : "Accept"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Leave / Delete */}
      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {leaving ? "Leaving..." : isOwner ? "Delete group" : "Leave group"}
        </button>
      </div>
    </div>
  );
}
