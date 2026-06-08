"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ScoringLogicModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="How scoring works">
          <HelpCircle size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How Points & Betting Work 🎲</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-gray-700 max-h-[70vh] overflow-y-auto pr-2">
          <p>
            When you predict matches or challenge your classmates to 1v1 bets, your token rewards are dynamically calculated based on <strong>real-world odds</strong> (pulled live from Polymarket).
          </p>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 border-b pb-1">1. Match Predictions</h3>
            <p>If you predict the <strong>Exact Score</strong> correctly:</p>
            <ul className="list-disc pl-5 space-y-1 mb-2">
              <li>You win back your stake multiplied by the team's odds!</li>
              <li><em>Example:</em> You wager 10 tokens on Spain to win 2-1 at 2.5x odds. You win exactly 25 tokens (+15 profit).</li>
            </ul>
            
            <p>If you only predict the <strong>Correct Outcome</strong> (e.g. you predicted Spain wins, but they won 3-0):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You win exactly <strong>half</strong> of the exact score payout.</li>
              <li><em>Example:</em> You wager 10 tokens on Spain at 2.5x odds. Half of 25 is 12.5 (rounded to 13). You win 13 tokens (+3 profit).</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 border-b pb-1">2. 1v1 Challenges</h3>
            <p>When you challenge another student, the winner takes the entire payout calculated by the odds. If you both predict exactly right, your stakes are refunded. If you both predict wrong, whoever was closer to the exact score wins half the pot.</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 border-b pb-1">3. Friendly Matches</h3>
            <p>Because Polymarket only provides odds for official World Cup matches, we use a <strong>Flat Payout</strong> for Friendly matches:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Exact Score:</strong> Your stake + 15 tokens.</li>
              <li><strong>Correct Outcome:</strong> Your stake + 5 tokens.</li>
            </ul>
            <p className="text-xs text-gray-500 mt-1 italic">
              Example: Wagering 10 tokens on a Friendly match and guessing the exact score perfectly pays out 25 tokens (10 stake + 15 reward).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
