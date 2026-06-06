"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, LogIn, Copy, Check, LogOut, Swords, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PresenceDot from "@/components/students/PresenceDot";
import ChallengeModal from "@/components/students/ChallengeModal";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

type StudentProp = {
  id: string;
  name: string;
  nationality: string | null;
  isHonoraryFan: boolean;
  tokenBalance: number;
  lastSeenAt: Date | null;
  team: { name: string; flagEmoji: string; countryCode: string } | null;
};

type MatchOption = {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Placeholder: string | null;
  team2Placeholder: string | null;
  matchDatetime: Date | string;
};

type TeamInfo = { id: string; name: string; flagEmoji: string };

type Member = { studentId: string; name: string; tokenBalance: number; joinedAt: string };
type Group = { id: string; name: string; inviteCode: string; isOwner: boolean; members: Member[] };

interface Props {
  students: StudentProp[];
  upcomingMatches: MatchOption[];
  teams: TeamInfo[];
  currentUserId: string | null;
  currentUserTokenBalance: number;
}

export default function ClassmatesPageClient({
  students,
  upcomingMatches,
  teams,
  currentUserId,
  currentUserTokenBalance,
}: Props) {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"classmates" | "groups">("classmates");
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);

  const teamMap = new Map(teams.map((t) => [t.id, { name: t.name, flagEmoji: t.flagEmoji }]));

  // ── Groups state ──────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    const res = await fetch("/api/groups");
    const data = await res.json();
    setGroups(data.groups ?? []);
    setGroupsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "groups" && session?.user?.id) fetchGroups();
  }, [tab, session?.user?.id, fetchGroups]);

  const handleCreate = async () => {
    setCreateLoading(true);
    setCreateError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) setCreateError("Failed to create group");
    else { setNewName(""); setCreating(false); fetchGroups(); }
    setCreateLoading(false);
  };

  const handleJoin = async () => {
    setJoinLoading(true);
    setJoinError(""); setJoinSuccess("");
    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
    });
    const data = await res.json();
    if (!res.ok) setJoinError(data.error ?? "Invalid code");
    else { setJoinSuccess(`Joined "${data.group.name}"!`); setJoinCode(""); setJoining(false); fetchGroups(); }
    setJoinLoading(false);
  };

  const handleLeave = async (groupId: string) => {
    await fetch(`/api/groups/${groupId}/leave`, { method: "DELETE" });
    fetchGroups();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareCode = (group: Group) => {
    const text = `Join my "${group.name}" group on IE World Cup 2026!\nUse invite code: ${group.inviteCode}\n${window.location.origin}/students`;
    if (navigator.share) navigator.share({ title: "IE World Cup Group", text });
    else { navigator.clipboard.writeText(text); setCopied(group.inviteCode + "share"); setTimeout(() => setCopied(null), 2000); }
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classmates</h1>
        <p className="text-sm text-gray-500 mt-1">
          {tab === "classmates" ? `${students.length} visible` : "Your mini-leagues"}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["classmates", "groups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "classmates" ? "👥 Classmates" : "🏆 My Groups"}
          </button>
        ))}
      </div>

      {/* ── Classmates tab ─────────────────────────────────────────────────── */}
      {tab === "classmates" && (
        <>
          {students.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">No classmates visible yet. Be the first to join!</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                        {s.team ? <span className="text-xl">{s.team.flagEmoji}</span> : getInitials(s.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900 truncate">{s.name}</p>
                          <PresenceDot lastSeenAt={s.lastSeenAt} />
                        </div>
                        <p className="text-xs text-gray-500 truncate">{s.nationality ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {s.team && <span className="text-xs font-medium text-gray-700">{s.team.name}</span>}
                      {s.isHonoraryFan && <Badge variant="friendly">🤝 Honorary</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>🪙 {s.tokenBalance} tokens</span>
                    {currentUserId && s.id !== currentUserId && upcomingMatches.length > 0 && (
                      <button
                        onClick={() => { setChallengeTarget({ id: s.id, name: s.name }); setChallengeOpen(true); }}
                        className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                      >
                        <Swords className="h-3 w-3" /> Challenge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <ChallengeModal
            isOpen={challengeOpen}
            onClose={() => { setChallengeOpen(false); setChallengeTarget(null); }}
            opponent={challengeTarget}
            upcomingMatches={upcomingMatches}
            teamMap={teamMap}
            myBalance={currentUserTokenBalance}
            groupId={null}
          />
        </>
      )}

      {/* ── Groups tab ─────────────────────────────────────────────────────── */}
      {tab === "groups" && (
        <div className="space-y-4 max-w-xl">
          {!session ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="mx-auto h-10 w-10 mb-3" />
              <p className="font-medium">Sign in to manage your groups</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setJoining(!joining); setCreating(false); }}>
                  <LogIn className="h-4 w-4 mr-1" /> Join
                </Button>
                <Button size="sm" onClick={() => { setCreating(!creating); setJoining(false); }}>
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              </div>

              {creating && (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-3">
                  <h2 className="font-semibold text-green-900">Create a group</h2>
                  <div className="grid gap-1.5">
                    <Label>Group name</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Section B Squad" />
                  </div>
                  {createError && <p className="text-sm text-red-500">{createError}</p>}
                  <Button className="w-full" disabled={!newName.trim() || createLoading} onClick={handleCreate}>
                    {createLoading ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              )}

              {joining && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                  <h2 className="font-semibold text-blue-900">Join a group</h2>
                  <div className="grid gap-1.5">
                    <Label>Invite code</Label>
                    <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. AB3X9Z" className="font-mono tracking-widest" maxLength={8} />
                  </div>
                  {joinError && <p className="text-sm text-red-500">{joinError}</p>}
                  {joinSuccess && (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600 font-medium">{joinSuccess}</p>
                      {session?.user && (session.user as any).visibility !== "public" && (
                        <div className="rounded-md bg-white p-3 border border-green-200 text-sm">
                          <p className="text-gray-700 font-medium">Want to compete globally?</p>
                          <p className="text-gray-500 text-xs mt-1">You are currently hidden from the master leaderboard. You can change this in your profile settings anytime!</p>
                        </div>
                      )}
                    </div>
                  )}
                  <Button className="w-full" disabled={!joinCode.trim() || joinLoading} onClick={handleJoin}>
                    {joinLoading ? "Joining..." : "Join Group"}
                  </Button>
                </div>
              )}

              {groupsLoading ? (
                <div className="text-center py-10 text-gray-400">Loading...</div>
              ) : groups.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="mx-auto h-10 w-10 mb-3" />
                  <p className="font-medium">No groups yet</p>
                  <p className="text-sm mt-1">Create one or ask a classmate for their invite code</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group.id} className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="font-semibold text-gray-900">{group.name}</h2>
                          <p className="text-xs text-gray-400 mt-0.5">{group.members.length} member{group.members.length !== 1 ? "s" : ""}</p>
                        </div>
                        <button onClick={() => handleLeave(group.id)} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                          <LogOut className="h-3 w-3" />
                          {group.isOwner ? "Delete" : "Leave"}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-xs text-gray-500">Code</span>
                        <span className="font-mono font-bold text-gray-900 tracking-widest flex-1">{group.inviteCode}</span>
                        <button onClick={() => copyCode(group.inviteCode)} className="text-gray-400 hover:text-gray-700">
                          {copied === group.inviteCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => shareCode(group)}>
                          {copied === group.inviteCode + "share" ? "Copied!" : "Share"}
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {group.members.map((m) => (
                          <span key={m.studentId} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.studentId === session.user.id ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                            {m.name}{m.studentId === session.user.id ? " (you)" : ""}
                          </span>
                        ))}
                      </div>

                      <Link href={`/students/groups/${group.id}`} className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700">
                        <ExternalLink className="h-3 w-3" /> View leaderboard & bets
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
