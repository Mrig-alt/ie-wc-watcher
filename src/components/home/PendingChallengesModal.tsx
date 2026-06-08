"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PendingChallenge = {
  id: string;
  stakeTokens: number;
  opponentName: string;
  isSender: boolean;
  matchLabel: string;
  matchDatetime: string;
  groupName: string | null;
  student1Score1: number | null;
  student1Score2: number | null;
};

interface Props {
  challenges: PendingChallenge[];
}

export default function PendingChallengesModal({ challenges }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [acceptingScoreId, setAcceptingScoreId] = useState<string | null>(null);
  const [pred1, setPred1] = useState<number>(0);
  const [pred2, setPred2] = useState<number>(0);

  if (challenges.length === 0) return null;

  const visible = challenges.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  // Sort challenges: Received first (isSender === false), then Sent (isSender === true)
  const sortedChallenges = [...visible].sort((a, b) => {
    if (a.isSender === b.isSender) {
      return new Date(a.matchDatetime).getTime() - new Date(b.matchDatetime).getTime();
    }
    return a.isSender ? 1 : -1;
  });

  const handle = async (id: string, action: "accept" | "decline" | "cancel", s2_1?: number, s2_2?: number) => {
    setActioning(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/bets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "cancel" ? "decline" : action,
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

  const hasReceived = visible.some((c) => !c.isSender);
  const headingText = hasReceived ? "You've been challenged!" : "Your challenges";

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 mb-4 bg-orange-100 hover:bg-orange-200 text-orange-900 px-4 py-2 rounded-xl font-semibold transition-colors border border-orange-200 shadow-sm"
      >
        <Swords className="h-4 w-4 text-orange-600" />
        <span className="flex items-center gap-1.5">
          {headingText} 
          <span className="bg-orange-200 text-orange-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{visible.length}</span>
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-orange-50 w-full max-w-md max-h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-orange-200 bg-white">
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-orange-900">{headingText}</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {sortedChallenges.map((c) => (
                <div key={c.id} className="rounded-xl bg-white border border-orange-100 p-4 shadow-sm space-y-3 relative overflow-hidden">
                  {c.isSender === false && (
                    <div className="absolute top-0 right-0 w-12 h-12 flex items-start justify-end p-2 pointer-events-none">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {c.isSender ? (
                          <>You challenged <span className="text-orange-600">{c.opponentName}</span></>
                        ) : (
                          <><span className="text-orange-600">{c.opponentName}</span> challenged you</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {c.matchLabel}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(c.matchDatetime).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {c.groupName && (
                        <p className="text-xs font-medium text-orange-700/70 bg-orange-100/50 inline-block px-2 py-0.5 rounded-full mt-1">
                          Group: {c.groupName}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-yellow-600 shrink-0 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">🪙 {c.stakeTokens}</span>
                  </div>

                  {c.student1Score1 !== null && c.student1Score2 !== null && (
                    <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      {c.isSender ? "You predict: " : "Challenger predicts: "}
                      <span className="font-bold text-gray-900 tracking-wider ml-1">{c.student1Score1} - {c.student1Score2}</span>
                    </div>
                  )}

                  {acceptingScoreId === c.id && !c.isSender && (
                    <div className="flex items-center gap-2 p-3 border-2 border-green-100 rounded-xl bg-green-50/30">
                      <span className="text-xs text-green-700 font-bold shrink-0 uppercase tracking-wider">Your Prediction</span>
                      <div className="flex-1 flex justify-end items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={pred1}
                          onChange={(e) => setPred1(parseInt(e.target.value) || 0)}
                          className="h-9 w-14 text-center bg-white border-green-200 font-bold text-lg"
                        />
                        <span className="text-green-800 font-bold">:</span>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={pred2}
                          onChange={(e) => setPred2(parseInt(e.target.value) || 0)}
                          className="h-9 w-14 text-center bg-white border-green-200 font-bold text-lg"
                        />
                      </div>
                    </div>
                  )}

                  {errors[c.id] && <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg">{errors[c.id]}</p>}

                  <div className="flex gap-2 justify-end pt-1">
                    {c.isSender ? (
                      <span className="text-xs font-medium text-orange-600 bg-orange-100 px-3 py-1.5 rounded-lg w-full text-center flex justify-center items-center gap-1.5 border border-orange-200">
                        <span className="animate-spin-slow">⏳</span> Waiting for them to accept...
                      </span>
                    ) : (
                      <>
                        <button
                          disabled={actioning === c.id}
                          onClick={() => {
                            setAcceptingScoreId(null);
                            handle(c.id, "decline");
                          }}
                          className="text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 transition-colors bg-white flex-1"
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
                            className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 transition-colors flex-1 shadow-sm"
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
                            className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 transition-colors flex-1 shadow-sm flex justify-center items-center gap-1"
                          >
                            {actioning === c.id ? "..." : "Accept ✓"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
