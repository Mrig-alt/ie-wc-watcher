"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, X, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import PlacesAutocompleteInput from "./PlacesAutocompleteInput";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react";

type Venue = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  mapsUrl: string | null;
  popularity?: number;
};

type WatchLocation = {
  locationName: string;
  locationUrl: string | null;
  venueId: string | null;
  people: string[];
  inviterIds: string[];
};

interface Props {
  matchId: string;
  watchCount?: number;
}

export default function WatchTogetherCard({ matchId, watchCount = 0 }: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<WatchLocation[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myLocationName, setMyLocationName] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [locData, venueData] = await Promise.all([
      fetch(`/api/watch-together?matchId=${matchId}`).then(r => r.json()).catch(() => null),
      fetch("/api/venues").then(r => r.json()).catch(() => null),
    ]);
    const locs: WatchLocation[] = locData?.locations ?? [];
    setLocations(locs);
    setVenues(venueData?.venues ?? []);
    if (session?.user?.id) {
      const mine = locs.find(l => l.inviterIds.includes(session.user.id));
      setMyLocationName(mine?.locationName ?? null);
      setSelectedVenueId(mine?.venueId ?? null);
    }
    setLoading(false);
  }, [matchId, session?.user?.id]);

  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handlePick(venueId: string, name: string, url: string | null) {
    setSaving(true);
    await fetch("/api/watch-together", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, venueId, locationName: name, locationUrl: url }),
    });
    setMyLocationName(name);
    setSelectedVenueId(venueId);
    setSaving(false);
    setOpen(false);
  }

  async function handleCustomSave() {
    if (!customName.trim()) return;
    setSaving(true);
    await fetch("/api/watch-together", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, venueId: null, locationName: customName.trim(), locationUrl: customUrl.trim() || null }),
    });
    setMyLocationName(customName.trim());
    setSelectedVenueId(null);
    setSaving(false);
    setOpen(false);
  }

  async function handleRemove() {
    await fetch(`/api/watch-together?matchId=${matchId}`, { method: "DELETE" });
    setMyLocationName(null);
    setSelectedVenueId(null);
    await load();
  }

  // Merge venue list with live location counts
  const venueWithCounts = venues.map(v => {
    const loc = locations.find(l => l.venueId === v.id || l.locationName === v.name);
    return { ...v, goingCount: loc?.people.length ?? 0, goingNames: loc?.people ?? [] };
  });

  // Sort: most people going first, then by popularity
  const sorted = [...venueWithCounts].sort((a, b) =>
    b.goingCount - a.goingCount || (b.popularity ?? 0) - (a.popularity ?? 0)
  );

  const topVenueId = sorted[0]?.goingCount > 0 ? sorted[0].id
    : sorted[0]?.popularity ? sorted[0].id : null;

  return (
    <>
      {/* Trigger — small text link */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
      >
        <MapPin className="h-3 w-3 shrink-0" />
        {myLocationName
          ? `Watching at ${myLocationName} · change`
          : watchCount > 0
          ? `${watchCount} watching · find a group`
          : "Find a group to watch with"}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[92vh] z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Watch Together</p>
                <p className="text-sm font-bold text-gray-900">
                  {locations.length > 0
                    ? `${locations.reduce((s, l) => s + l.people.length, 0)} classmates watching`
                    : "Find a bar to watch at"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-8">Loading venues…</p>
              ) : showCustom ? (
                <div className="space-y-3 py-2">
                  <button onClick={() => setShowCustom(false)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
                  <PlacesAutocompleteInput
                    value={customName}
                    onChange={setCustomName}
                    onPlaceSelect={(name, url) => { setCustomName(name); if (url) setCustomUrl(url); }}
                    placeholder="Bar or location name"
                  />
                  <Input
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="Google Maps link (optional)"
                  />
                  <button
                    onClick={handleCustomSave}
                    disabled={!customName.trim() || saving}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors"
                  >
                    {saving ? "Saving…" : "I'm watching here ✓"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Who's watching — chips row */}
                  {locations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Who's watching</p>
                      <div className="flex flex-wrap gap-1.5">
                        {locations.map(loc => (
                          <span key={loc.locationName} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                            <MapPin className="h-2.5 w-2.5 text-gray-400" />
                            <span className="font-medium">{loc.people.join(", ")}</span>
                            <span className="text-gray-400">@ {loc.locationName}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Venue cards grid */}
                  {sorted.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pick a venue</p>
                      <div className="grid grid-cols-2 gap-2">
                        {sorted.map(v => {
                          const isMyVenue = selectedVenueId === v.id;
                          const isTrending = v.id === topVenueId;
                          return (
                            <button
                              key={v.id}
                              onClick={() => handlePick(v.id, v.name, v.mapsUrl)}
                              disabled={saving}
                              className={`relative flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${
                                isMyVenue
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                  : "bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                              }`}
                            >
                              {isTrending && (
                                <span className="absolute -top-1.5 -right-1.5 text-sm">🔥</span>
                              )}
                              <span className="text-sm font-semibold leading-snug pr-3">{v.name}</span>
                              {v.address && (
                                <span className={`text-[11px] mt-0.5 leading-tight ${isMyVenue ? "text-indigo-200" : "text-gray-400"}`}>
                                  {v.address}
                                </span>
                              )}
                              {v.goingCount > 0 && (
                                <span className={`mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  isMyVenue ? "bg-indigo-500 text-indigo-100" : "bg-indigo-100 text-indigo-700"
                                }`}>
                                  {v.goingCount} going 👥
                                </span>
                              )}
                              {isMyVenue && (
                                <span className="absolute top-2 right-2">
                                  <Check className="h-3.5 w-3.5 text-white" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom location */}
                  <button
                    onClick={() => setShowCustom(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline w-full text-center pt-1"
                  >
                    Not in the list? Add custom location
                  </button>

                  {/* Remove my pin */}
                  {myLocationName && (
                    <button
                      onClick={() => { handleRemove(); setOpen(false); }}
                      className="text-xs text-red-400 hover:text-red-600 w-full text-center"
                    >
                      Remove my pin
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
