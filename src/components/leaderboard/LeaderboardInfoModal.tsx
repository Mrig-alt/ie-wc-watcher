"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function LeaderboardInfoModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-gray-400 hover:text-amber-600 transition-colors" aria-label="How points work">
          <Info size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How Net Profit Works 🏆</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            To prevent "pay-to-win" mechanics, the leaderboard ranks players purely on their <strong>Net Profit</strong>, rather than total tokens.
          </p>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <code className="text-xs font-mono text-gray-800">
              Net Profit = Total Tokens - System Awards
            </code>
          </div>
          <p>
            <strong>System Awards</strong> include:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The 100 starting tokens</li>
            <li>Weekly token stipends</li>
            <li>Survey completion rewards</li>
            <li>Manual token refills / purchases</li>
          </ul>
          <p>
            This ensures that someone who buys 1,000 tokens but loses them all will have a <em>negative</em> profit, while someone who starts with 100 and predicts well will climb the ranks fairly!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
