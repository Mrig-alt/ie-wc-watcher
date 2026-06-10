"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STORAGE_KEY = "guest_view_count";
const TRIGGER_AFTER = 3;

export default function GuestConversionPrompt() {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);

  const isGuest = (session?.user as any)?.isGuest === true;

  useEffect(() => {
    if (!isGuest) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    const next = count + 1;
    localStorage.setItem(STORAGE_KEY, String(next));

    if (next >= TRIGGER_AFTER) {
      // Only show once per session
      const shownThisSession = sessionStorage.getItem("guest_prompt_shown");
      if (!shownThisSession) {
        setShow(true);
        sessionStorage.setItem("guest_prompt_shown", "1");
      }
    }
  }, [isGuest]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl">
        <div className="text-center space-y-3">
          <span className="text-4xl">🏆</span>
          <h3 className="text-lg font-bold text-gray-900">Join the competition!</h3>
          <p className="text-sm text-gray-600">
            You&apos;re browsing as a guest. Verify your class PIN to get tokens, make predictions, and appear on the leaderboard.
          </p>
        </div>
        <div className="mt-5 space-y-2">
          <Link
            href="/account"
            onClick={() => setShow(false)}
            className="block w-full rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            Verify my PIN →
          </Link>
          <button
            onClick={() => setShow(false)}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
