"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import PlacesAutocompleteInput from "../matches/PlacesAutocompleteInput";

type Match = {
  id: string;
  team1Name: string;
  team2Name: string;
  team1Flag: string;
  team2Flag: string;
  matchDatetime: string;
};

type Venue = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  mapsUrl: string | null;
  popularity?: number;
};

function formatMatchTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    + " · "
    + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function UpdateWatchPlanSheet({
  matches,
  venues,
  existingPlans,
}: {
  matches: Match[];
  venues: Venue[];
  existingPlans: { matchId: string; locationName: string | null; venueId: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"match" | "venue">("match");
  const [selMatch, setSelMatch] = useState<Match | null>(null);
  const [selVenueId, setSelVenueId] = useState<string | null>(null);
  const [freeVenue, setFreeVenue] = useState("");
  const [freeUrl, setFreeUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const existingForMatch = selMatch ? existingPlans.find((p) => p.matchId === selMatch.id) : null;

  const handleSave = async () => {
    if (!selMatch) return;
    const locationName = selVenueId
      ? (venues.find((v) => v.id === selVenueId)?.name ?? freeVenue)
      : freeVenue.trim();
    if (!locationName) { setError("Pick or enter a venue"); return; }

    setSaving(true); setError("");
    try {
      const res = await fetch("/api/watch-together", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selMatch.id,
          venueId: selVenueId || null,
          locationName,
          locationUrl: freeUrl.trim() || null,
        }),
      });
      if (!res.ok) { setError("Failed to save — try again"); return; }
      setOpen(false);
      router.refresh();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    if (!selMatch) return;
    setSaving(true);
    await fetch(`/api/watch-together?matchId=${selMatch.id}`, { method: "DELETE" });
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setStep("match"); setSelMatch(null); setSelVenueId(null); setFreeVenue(""); setFreeUrl(""); }}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors font-medium"
      >
        + Update where you’re watching
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {step === "match" ? "Which match?" : `📍 Where are you watching?`}
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {step === "match" && (
                <>
                  <p className="text-xs text-gray-400">Pick a match to update your watch plan</p>
                  {matches.filter(m => new Date(m.matchDatetime) > new Date()).map((m) => {
                    const existing = existingPlans.find((p) => p.matchId === m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setSelMatch(m); setStep("venue"); setSelVenueId(existing?.venueId ?? null); setFreeVenue(existing?.locationName ?? ""); }}
                        className="w-full text-left rounded-xl border border-gray-100 px-4 py-3 hover:border-green-200 hover:bg-green-50 transition-colors"
                      >
                        <div className="text-sm font-semibold text-gray-900">
                          {m.team1Flag} {m.team1Name} <span className="text-gray-400">vs</span> {m.team2Flag} {m.team2Name}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-gray-400">{formatMatchTime(m.matchDatetime)}</span>
                          {existing && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {existing.locationName ?? "Plan set"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {step === "venue" && selMatch && (
                <>
                  <p className="text-sm text-gray-600 font-medium">
                    {selMatch.team1Flag} {selMatch.team1Name} vs {selMatch.team2Flag} {selMatch.team2Name}
                  </p>

                  {/* Known venues */}
                  {venues.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Popular venues</p>
                      <div className="space-y-1.5">
                        {venues.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => { setSelVenueId(v.id); setFreeVenue(v.name); }}
                            className={cn(
                              "w-full text-left rounded-xl border px-3 py-2.5 transition-colors",
                              selVenueId === v.id
                                ? "border-green-300 bg-green-50"
                                : "border-gray-100 hover:border-green-200 hover:bg-green-50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium text-gray-900">{v.name}</span>
                                {v.area && <span className="text-xs text-gray-400 ml-1.5">{v.area}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {(v.popularity ?? 0) > 0 && (
                                  <span className="text-xs font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                                    {v.popularity} 🍻
                                  </span>
                                )}
                                {v.mapsUrl && (
                                  <a href={v.mapsUrl} target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-400 hover:text-green-600"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">Or enter your own</p>
                    <PlacesAutocompleteInput
                      value={selVenueId ? "" : freeVenue}
                      onChange={(val) => { setFreeVenue(val); setSelVenueId(null); }}
                      onPlaceSelect={(name, url) => {
                        setFreeVenue(name);
                        setSelVenueId(null);
                        if (url) setFreeUrl(url);
                      }}
                      placeholder="Venue name"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                    />
                    <input
                      type="url"
                      placeholder="Google Maps link (optional)"
                      value={freeUrl}
                      onChange={(e) => setFreeUrl(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving…" : existingForMatch ? "Update plan" : "Set plan"}
                    </button>
                    {existingForMatch && (
                      <button
                        onClick={handleRemove}
                        disabled={saving}
                        className="px-4 py-2.5 text-sm text-red-500 hover:text-red-700 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => setStep("match")}
                      className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
