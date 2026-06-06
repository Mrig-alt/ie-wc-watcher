"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Question = {
  key: string;
  label: string;
  placeholder: string;
};

const questions: Question[] = [
  {
    key: "what_lacking",
    label: "1. What is the biggest thing lacking in the app right now?",
    placeholder: "Tell us what feature is missing, what feels broken, or how we can improve the layout...",
  },
  {
    key: "predictions_feedback",
    label: "2. How can we make predictions or bets more exciting?",
    placeholder: "Should we add different stakes, multipliers, double-or-nothing, or custom challenge rules?",
  },
  {
    key: "venues_accuracy",
    label: "3. Are the live matches and watch map details accurate for your local venues?",
    placeholder: "Let us know if your favorite pubs or watching venues are listed and if timings match...",
  },
  {
    key: "future_features",
    label: "4. What other features or sports would you want to see added?",
    placeholder: "Would you want Premier League, F1, NBA, or a different tournament model after the WC?",
  },
];

export default function SurveyWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  
  // Load initial answers if any exists (optional optimization, keep it simple for now)
  useEffect(() => {
    if (session?.user?.id && isOpen) {
      fetch("/api/survey")
        .then((res) => res.json())
        .then((data) => {
          if (data.predictions) {
            // API matches logic
          }
        })
        .catch(() => {});
    }
  }, [session, isOpen]);

  if (!session?.user) return null; // Only show for logged in users (guests and regular students)

  const handleSaveQuestion = async (key: string) => {
    const text = answers[key]?.trim();
    if (!text) return;

    setSavingStatus((prev) => ({ ...prev, [key]: "saving" }));

    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionKey: key, responseText: text }),
      });

      if (res.ok) {
        setSavingStatus((prev) => ({ ...prev, [key]: "saved" }));
      } else {
        setSavingStatus((prev) => ({ ...prev, [key]: "error" }));
      }
    } catch {
      setSavingStatus((prev) => ({ ...prev, [key]: "error" }));
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-3 text-sm font-semibold shadow-lg hover:from-emerald-700 hover:to-green-700 hover:scale-105 active:scale-95 transition-all duration-200 ease-out border border-green-500/20"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
          </span>
          💬 Wanna help a brother out?
        </button>
      )}

      {/* Floating Panel / Drawer */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end justify-center md:items-center md:justify-end md:p-6">
          <div className="w-full max-h-[85vh] md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                  <span>💬 Help Us Improve</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Wanna help a brother out? Earn tokens for your feedback.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                Tired of this?
              </button>
            </div>

            {/* Scrollable Questions list */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1 max-h-[60vh]">
              {session.user.isGuest && (
                <div className="rounded-lg bg-yellow-50/60 border border-yellow-200/50 p-3 text-xs text-yellow-800 leading-relaxed">
                  ⚠️ <strong>Guest Note:</strong> You can submit feedback, but you will only receive the tokens after upgrading your account with your class PIN.
                </div>
              )}

              {questions.map((q) => {
                const status = savingStatus[q.key] || "idle";
                const responseText = answers[q.key] || "";
                
                return (
                  <div key={q.key} className="space-y-2 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <label className="block text-xs font-semibold text-gray-900 leading-relaxed">
                      {q.label}
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => {
                        setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }));
                        setSavingStatus((prev) => ({ ...prev, [q.key]: "idle" }));
                      }}
                      placeholder={q.placeholder}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="text-[10px] font-medium min-h-[16px]">
                        {status === "saving" && <span className="text-gray-500 animate-pulse">Saving...</span>}
                        {status === "saved" && (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Saved! (+3 tokens pending review)
                          </span>
                        )}
                        {status === "error" && <span className="text-red-500">Failed to save. Try again.</span>}
                      </div>

                      <Button
                        size="sm"
                        variant={status === "saved" ? "outline" : "default"}
                        disabled={status === "saving" || !responseText.trim()}
                        onClick={() => handleSaveQuestion(q.key)}
                        className="h-7 text-[11px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
                      >
                        {status === "saved" ? "Update Answer" : "Save Answer"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Tokens are awarded upon admin approval.</span>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md px-4 py-2 rounded-xl text-xs"
              >
                Close & Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
