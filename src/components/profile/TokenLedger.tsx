"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type LedgerEntry = {
  id: string;
  amount: number;
  reason: string;
  matchId: string | null;
  createdAt: string;
};

const REASON_LABELS: Record<string, string> = {
  weekly_refill: "Weekly stipend",
  floor_grant: "Floor grant",
  prediction_payout: "Prediction win",
  bet_payout_win: "Bet won",
  bet_payout_half_win: "Bet win (closest score)",
  bet_payout_half_loss: "Bet loss (partial refund)",
  bet_refund_draw: "Bet draw — refund",
  bet_refund_decline: "Bet declined — refund",
  bet_refund_cancel: "Bet cancelled — refund",
  bet_refund_expired: "Bet expired — refund",
  bet_placed: "Bet placed",
  bet_accepted: "Bet accepted",
  referral_bonus: "Referral bonus",
  admin_grant: "Admin grant",
};

function label(reason: string) {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

export default function TokenLedger() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchPage = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/token-ledger?page=${p}`);
      const data = await res.json();
      if (data.entries) {
        setEntries((prev) => p === 1 ? data.entries : [...prev, ...data.entries]);
        setHasMore(data.hasMore ?? false);
        setPage(p);
        setLoaded(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !loaded) fetchPage(1);
  }, [open]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div>
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
          <p className="text-xs text-gray-500 mt-0.5">Every token in and out of your account</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {loading && entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No transactions yet.</div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm text-gray-800">{label(e.reason)}</p>
                      <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${e.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {e.amount >= 0 ? "+" : ""}{e.amount} 🪙
                    </span>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="px-6 py-4 border-t border-gray-50">
                  <button
                    onClick={() => fetchPage(page + 1)}
                    disabled={loading}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
