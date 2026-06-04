"use client";

import { useState, useTransition } from "react";

type Student = {
  id: string;
  name: string;
  email: string;
  nationality: string | null;
  visibility: string;
  tokenBalance: number;
  isHonoraryFan: boolean;
  flagged: boolean;
  createdAt: Date;
  teamName: string | null;
  teamFlag: string | null;
};

export default function AdminTable({ students }: { students: Student[] }) {
  const [rows, setRows] = useState(students);
  const [pending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const moderate = (id: string, action: "flag" | "unflag") => {
    setActionId(id);
    startTransition(async () => {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        const { student } = await res.json();
        setRows((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, flagged: student.flagged } : s))
        );
      }
      setActionId(null);
    });
  };

  const deleteStudent = (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setActionId(id);
    startTransition(async () => {
      const res = await fetch("/api/admin/moderate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRows((prev) => prev.filter((s) => s.id !== id));
      }
      setActionId(null);
    });
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Team</th>
            <th className="px-3 py-2 text-left">Mode</th>
            <th className="px-3 py-2 text-right">Tokens</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Joined</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((s) => (
            <tr key={s.id} className={s.flagged ? "bg-red-50" : ""}>
              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{s.email}</td>
              <td className="px-3 py-2 whitespace-nowrap">{s.teamFlag} {s.teamName ?? "—"}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  s.visibility === "public" ? "bg-green-100 text-green-700" :
                  s.visibility === "friends" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{s.visibility}</span>
              </td>
              <td className="px-3 py-2 text-right">{s.tokenBalance}</td>
              <td className="px-3 py-2">
                {s.flagged
                  ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">flagged</span>
                  : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">active</span>
                }
              </td>
              <td className="px-3 py-2 text-gray-400 whitespace-nowrap text-xs">
                {new Date(s.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2 whitespace-nowrap flex gap-1.5 items-center">
                {s.flagged ? (
                  <button
                    disabled={pending && actionId === s.id}
                    onClick={() => moderate(s.id, "unflag")}
                    className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                  >
                    {pending && actionId === s.id ? "⏳" : "Unflag"}
                  </button>
                ) : (
                  <button
                    disabled={pending && actionId === s.id}
                    onClick={() => moderate(s.id, "flag")}
                    className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                  >
                    {pending && actionId === s.id ? "⏳" : "Flag"}
                  </button>
                )}
                <button
                  disabled={pending && actionId === s.id}
                  onClick={() => deleteStudent(s.id, s.name)}
                  className="rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  {pending && actionId === s.id ? "⏳" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
