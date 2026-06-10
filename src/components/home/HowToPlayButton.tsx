"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function HowToPlayButton() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-900 px-4 py-2 rounded-xl font-semibold transition-colors border border-blue-200 shadow-sm"
      >
        <HelpCircle className="h-4 w-4 text-blue-600" />
        <span>How to Play</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-sm">
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="font-bold text-green-600">1.</span>
              <span><strong>Predict:</strong> Guess the exact score to win 10x your stake, or just the correct winner for 2x.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-green-600">2.</span>
              <span><strong>Challenge:</strong> Bet your tokens against specific classmates, or hit the Open Market to take public bets.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-green-600">3.</span>
              <span><strong>Watch:</strong> RSVP to watch parties on the Watchmap to earn bonus tokens!</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
