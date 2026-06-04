"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, LogIn, Copy, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = { studentId: string; name: string; joinedAt: string };
type Group = {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  members: Member[];
};

export default function FriendsPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Create group
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join group
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  // Copy state per group
  const [copied, setCopied] = useState<string | null>(null);

  const fetchGroups = async () => {
    const res = await fetch("/api/groups");
    const data = await res.json();
    setGroups(data.groups ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async () => {
    setCreateLoading(true);
    setCreateError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError("Failed to create group"); }
    else { setNewName(""); setCreating(false); fetchGroups(); }
    setCreateLoading(false);
  };

  const handleJoin = async () => {
    setJoinLoading(true);
    setJoinError("");
    setJoinSuccess("");
    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
    });
    const data = await res.json();
    if (!res.ok) { setJoinError(data.error ?? "Invalid code"); }
    else {
      setJoinSuccess(`Joined "${data.group.name}"!`);
      setJoinCode("");
      setJoining(false);
      fetchGroups();
    }
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
    const text = `Join my "${group.name}" group on IE World Cup 2026!\nUse invite code: ${group.inviteCode}\nhttps://wc-syeo.onrender.com/friends`;
    if (navigator.share) {
      navigator.share({ title: "IE World Cup Group", text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(group.inviteCode + "share");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (!session) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Users className="mx-auto h-10 w-10 mb-3" />
        <p className="font-medium">Sign in to manage your friend groups</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Friend Groups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a group, share the code, see each other&apos;s moves</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setJoining(!joining); setCreating(false); }}>
            <LogIn className="h-4 w-4 mr-1" /> Join
          </Button>
          <Button size="sm" onClick={() => { setCreating(!creating); setJoining(false); }}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>
      </div>

      {/* Create group form */}
      {creating && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-3">
          <h2 className="font-semibold text-green-900">Create a group</h2>
          <div className="grid gap-1.5">
            <Label>Group name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Section B Squad"
            />
          </div>
          {createError && <p className="text-sm text-red-500">{createError}</p>}
          <Button className="w-full" disabled={!newName.trim() || createLoading} onClick={handleCreate}>
            {createLoading ? "Creating..." : "Create Group"}
          </Button>
        </div>
      )}

      {/* Join group form */}
      {joining && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <h2 className="font-semibold text-blue-900">Join a group</h2>
          <div className="grid gap-1.5">
            <Label>Invite code</Label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3X9Z"
              className="font-mono tracking-widest"
              maxLength={8}
            />
          </div>
          {joinError && <p className="text-sm text-red-500">{joinError}</p>}
          {joinSuccess && <p className="text-sm text-green-600">{joinSuccess}</p>}
          <Button className="w-full" disabled={!joinCode.trim() || joinLoading} onClick={handleJoin}>
            {joinLoading ? "Joining..." : "Join Group"}
          </Button>
        </div>
      )}

      {/* Groups list */}
      {loading ? (
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
                <button
                  onClick={() => handleLeave(group.id)}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  {group.isOwner ? "Delete" : "Leave"}
                </button>
              </div>

              {/* Invite code */}
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-500">Invite code</span>
                <span className="font-mono font-bold text-gray-900 tracking-widest flex-1">{group.inviteCode}</span>
                <button onClick={() => copyCode(group.inviteCode)} className="text-gray-400 hover:text-gray-700">
                  {copied === group.inviteCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => shareCode(group)}>
                  {copied === group.inviteCode + "share" ? "Copied!" : "Share"}
                </Button>
              </div>

              {/* Members */}
              <div className="flex flex-wrap gap-1.5">
                {group.members.map((m) => (
                  <span
                    key={m.studentId}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.studentId === session.user.id
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m.name}{m.studentId === session.user.id ? " (you)" : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
