"use client";

import { useState } from "react";

interface Reaction {
  id: string;
  emoji: string;
  matchMinute: number | null;
  studentName: string;
  createdAt: Date;
}

interface ReactionTimelineProps {
  matchId: string;
  reactions: Reaction[];
  isLive?: boolean;
}

const QUICK_EMOJIS = ["🤯", "😱", "❤️", "🔥", "👏", "😂", "💔", "😤"];

export default function ReactionTimeline({ matchId, reactions: initial, isLive }: ReactionTimelineProps) {
  const [reactions, setReactions] = useState(initial);
  const [minute, setMinute] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const sendReaction = async (emoji: string) => {
    setSending(emoji);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          emoji,
          matchMinute: minute ? parseInt(minute) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions((prev) => [
          { ...data.reaction, studentName: "You" },
          ...prev,
        ]);
        setMinute("");
      }
    } finally {
      setSending(null);
    }
  };

  const byMinute = reactions
    .filter((r) => r.matchMinute !== null)
    .sort((a, b) => (a.matchMinute ?? 0) - (b.matchMinute ?? 0));

  const postMatch = reactions.filter((r) => r.matchMinute === null);

  return (
    <div className="space-y-4">
      {isLive && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">Drop a reaction</p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="number"
              min={1}
              max={120}
              placeholder="Min"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="w-16 rounded border border-gray-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <span className="text-xs text-gray-400">optional</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                disabled={!!sending}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {sending === e ? "…" : e}
              </button>
            ))}
          </div>
        </div>
      )}

      {byMinute.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Match timeline</p>
          <div className="space-y-1.5">
            {byMinute.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-right text-xs font-mono text-gray-400">{r.matchMinute}&apos;</span>
                <span className="text-lg">{r.emoji}</span>
                <span className="text-gray-600">{r.studentName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {postMatch.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Post-match reactions</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              postMatch.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span key={emoji} className="flex items-center gap-1 rounded-full border border-gray-100 bg-white px-3 py-1 text-sm shadow-sm">
                <span className="text-lg">{emoji}</span>
                <span className="text-gray-500 font-medium">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
