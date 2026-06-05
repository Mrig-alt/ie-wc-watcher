"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { Input } from "@/components/ui/input";

type PendingChallenge = {
  id: string;
  stakeTokens: number;
  challengerName: string;
  matchLabel: string;
  matchDatetime: string;
  groupName: string | null;
  student1Score1: number | null;
  student1Score2: number | null;
};

interface Props {
  challenges: PendingChallenge[];
}

export default function PendingChallengesWidget({ challenges }: Props) {
  const router = useRouter();
  const [actioning, setActioning] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [acceptingScoreId, setAcceptingScoreId] = useState<string | null>(null);
  const [pred1, setPred1] = useState<number>(0);
  const [pred2, setPred2] = useState<number>(0);

  if (challenges.length === 0) return null;

  const visible = challenges.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  const handle = async (id: string, action: "accept" | "decline", s2_1?: number, s2_2?: number) => {
    setActioning(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/bets/${id}`, {
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
        setErrors((prev) => ({ ...prev, [id]: data.error ?? "Failed" }));
      } else {
        setDismissed((prev) => new Set([...prev, id]));
        setAcceptingScoreId(null);
        router.refresh();
      }
    } finally {
      setActioning(null);
    }
  };

  return (
    <section className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Swords className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-semibold text-orange-900">
          {visible.length} pending challenge{visible.length !== 1 ? "s" : ""}
        </h2>
      </div>

      <div className="space-y-2">
        {visible.map((c) => (
          <div key={c.id} className="rounded-lg bg-white border border-orange-100 p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-gray-900">
                  <span className="text-orange-600">{c.challengerName}</span> challenged you
                </p>
                <p className="text-xs text-gray-500">
                  {c.matchLabel} ·{" "}
                  {new Date(c.matchDatetime).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {c.groupName && (
                  <p className="text-xs text-gray-400">Group: {c.groupName}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800 shrink-0">🪙 {c.stakeTokens}</span>
            </div>

            {c.student1Score1 !== null && c.student1Score2 !== null && (
              <p className="text-xs text-orange-700 bg-orange-100/50 rounded px-2 py-1 inline-block">
                Challenger predicts: <span className="font-semibold">{c.student1Score1} - {c.student1Score2}</span>
              </p>
            )}

            {acceptingScoreId === c.id && (
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

            {errors[c.id] && <p className="text-xs text-red-500">{errors[c.id]}</p>}

            <div className="flex gap-2 justify-end">
              <button
                disabled={actioning === c.id}
                onClick={() => {
                  setAcceptingScoreId(null);
                  handle(c.id, "decline");
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-3 py-1 bg-white"
              >
                Decline
              </button>
              {c.student1Score1 !== null && acceptingScoreId !== c.id ? (
                <button
                  disabled={actioning === c.id}
                  onClick={() => {
                    setAcceptingScoreId(c.id);
                    setPred1(0);
                    setPred2(0);
                  }}
                  className="text-xs font-medium text-green-700 hover:text-green-900 border border-green-300 bg-green-50 rounded px-3 py-1"
                >
                  Accept...
                </button>
              ) : (
                <button
                  disabled={actioning === c.id}
                  onClick={() => {
                    if (acceptingScoreId === c.id) {
                      handle(c.id, "accept", pred1, pred2);
                    } else {
                      handle(c.id, "accept");
                    }
                  }}
                  className="text-xs font-medium text-green-700 hover:text-green-900 border border-green-300 bg-green-50 rounded px-3 py-1 bg-white"
                >
                  {actioning === c.id ? "..." : "Accept ✓"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
