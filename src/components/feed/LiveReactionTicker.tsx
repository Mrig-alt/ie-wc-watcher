"use client";

import { useEffect, useRef, useState } from "react";

type LiveEvent =
  | { type: "reaction"; studentName: string; emoji: string; matchId: string; at: string }
  | { type: "vibe"; studentName: string; vibe: string; matchId: string; at: string };

const VIBE_EMOJI: Record<string, string> = {
  intense: "😤",
  boring: "😴",
  heartbreaking: "💔",
};

const MAX_EVENTS = 30;

export default function LiveReactionTicker() {
  const [events, setEvents] = useState<(LiveEvent & { id: number })[]>([]);
  const [connected, setConnected] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    const es = new EventSource("/api/reactions/stream");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as LiveEvent;
        setEvents((prev) => [
          { ...payload, id: idRef.current++ },
          ...prev.slice(0, MAX_EVENTS - 1),
        ]);
      } catch { /* ignore malformed */ }
    };

    return () => es.close();
  }, []);

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">⚡ Live Reactions</h2>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${
          connected ? "text-green-600" : "text-gray-400"
        }`}>
          <span className={`inline-block h-2 w-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-gray-300"
          }`} />
          {connected ? "Live" : "Connecting..."}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">👀</p>
          <p className="text-sm">Waiting for reactions...</p>
          <p className="text-xs mt-1">Reactions appear here in real time during matches</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm animate-fade-in"
            >
              <span className="text-xl">
                {ev.type === "reaction" ? ev.emoji : VIBE_EMOJI[ev.vibe] ?? "🎭"}
              </span>
              <span className="flex-1 text-gray-700">
                <span className="font-medium">{ev.studentName}</span>
                {ev.type === "vibe"
                  ? ` thinks this match is ${ev.vibe}`
                  : " reacted"}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(ev.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
