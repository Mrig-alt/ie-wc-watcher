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
        <div className="mt-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-sm space-y-4">

          {/* Actions */}
          <div className="space-y-2">
            <p className="font-bold text-gray-800">What you can do</p>
            <ul className="space-y-1.5 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 shrink-0">1.</span>
                <span><strong>Predict the score</strong> — guess exact scoreline to win up to 10× your stake, or correct winner for 2×.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 shrink-0">2.</span>
                <span><strong>Pick a goalscorer</strong> — predict which player scores. Rarer positions pay more.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 shrink-0">3.</span>
                <span><strong>Predict the XI</strong> — pick the 11 starters before kickoff. 20 tokens per correct player.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 shrink-0">4.</span>
                <span><strong>Challenge classmates</strong> — bet tokens against a friend or post to the Open Market for anyone to accept.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 shrink-0">5.</span>
                <span><strong>Pin your bar</strong> on the Watchmap to earn +50 tokens and let classmates find you.</span>
              </li>
            </ul>
          </div>

          {/* Points table */}
          <div>
            <p className="font-bold text-gray-800 mb-2">Token rewards</p>
            <div className="rounded-lg border border-gray-100 overflow-hidden text-xs">
              <div className="grid grid-cols-2 bg-gray-50 font-semibold text-gray-500 px-3 py-1.5">
                <span>Action</span>
                <span className="text-right">Tokens</span>
              </div>
              {[
                ["Correct exact score", "50–150 (stake × 10)"],
                ["Correct winner only", "stake × 2"],
                ["Goalscorer — Forward", "+50"],
                ["Goalscorer — Midfielder", "+100"],
                ["Goalscorer — Defender", "+175"],
                ["Goalscorer — Goalkeeper", "+250 🎉"],
                ["XI prediction — per correct starter", "+20"],
                ["XI prediction — perfect XI bonus", "+100"],
                ["Pin your watch venue", "+50"],
                ["Refer a classmate", "+100"],
              ].map(([action, reward]) => (
                <div key={action} className="grid grid-cols-2 px-3 py-1.5 border-t border-gray-100">
                  <span className="text-gray-600">{action}</span>
                  <span className="text-right font-semibold text-green-700">{reward}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Open market note */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <strong>Open Market bets</strong> — tap the ⚔️ button on any match card, set a stake, and post it publicly. Anyone can accept. Find incoming challenges in the <strong>Pending Challenges</strong> button at the top of this page.
          </div>

        </div>
      )}
    </div>
  );
}
