"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";

type Venue = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  mapsUrl: string | null;
};

type WatchLocation = {
  locationName: string;
  locationUrl: string | null;
  venueId: string | null;
  people: string[];
};

export default function WatchTogetherCard({ matchId }: { matchId: string }) {
  const { data: session } = useSession();
  const [locations, setLocations] = useState<WatchLocation[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showing, setShowing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState<string | null>(null);

  const fetchLocations = async () => {
    const res = await fetch(`/api/watch-together?matchId=${matchId}`);
    const data = await res.json();
    setLocations(data.locations ?? []);
    // Guard on user.id — session.user alone can be a truthy empty object before id is populated
    if (session?.user?.id) {
      const mine = (data.locations ?? []).find((l: WatchLocation) =>
        l.people.includes(session.user.name)
      );
      setMyLocation(mine?.locationName ?? null);
    }
  };

  const fetchVenues = async () => {
    const res = await fetch("/api/venues");
    const data = await res.json();
    setVenues(data.venues ?? []);
  };

  useEffect(() => { fetchLocations(); fetchVenues(); }, [matchId]);

  const filteredVenues = search.trim()
    ? venues.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        (v.area ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : venues;

  const byArea = filteredVenues.reduce<Record<string, Venue[]>>((acc, v) => {
    const area = v.area ?? "Other";
    if (!acc[area]) acc[area] = [];
    acc[area].push(v);
    return acc;
  }, {});

  const handlePost = async () => {
    if (!selectedVenue && !customName.trim()) return;
    setLoading(true);
    await fetch("/api/watch-together", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        venueId: selectedVenue?.id ?? null,
        locationName: selectedVenue ? selectedVenue.name : customName.trim(),
        locationUrl: selectedVenue ? selectedVenue.mapsUrl : customUrl.trim() || null,
      }),
    });
    setShowing(false);
    setSelectedVenue(null);
    setCustomName("");
    setCustomUrl("");
    setIsCustom(false);
    setSearch("");
    await fetchLocations();
    setLoading(false);
  };

  const handleRemove = async () => {
    await fetch(`/api/watch-together?matchId=${matchId}`, { method: "DELETE" });
    setMyLocation(null);
    fetchLocations();
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-green-600" />
          Watching together
        </h3>
        {session?.user?.id && !myLocation && !showing && (
          <Button size="sm" variant="outline" onClick={() => setShowing(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add location
          </Button>
        )}
        {session?.user?.id && myLocation && (
          <button onClick={handleRemove} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X className="h-3 w-3" /> Remove mine
          </button>
        )}
      </div>

      {/* Venue picker */}
      {showing && (
        <div className="space-y-3 rounded-lg bg-gray-50 p-3">
          {!isCustom ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedVenue(null); }}
                  placeholder="Search bars & pubs\u2026"
                  className="h-8 text-sm pl-8"
                />
              </div>

              {selectedVenue && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 truncate">{selectedVenue.name}</p>
                    {selectedVenue.address && <p className="text-xs text-green-600 truncate">{selectedVenue.address}</p>}
                  </div>
                  <button onClick={() => setSelectedVenue(null)} className="text-green-400 hover:text-green-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {!selectedVenue && (
                <div className="max-h-52 overflow-y-auto space-y-2 -mx-1 px-1">
                  {Object.entries(byArea).map(([area, areaVenues]) => (
                    <div key={area}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">{area}</p>
                      <div className="space-y-1">
                        {areaVenues.map(v => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVenue(v)}
                            className="w-full text-left rounded-lg px-2.5 py-1.5 text-sm hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100"
                          >
                            <span className="font-medium text-gray-800">{v.name}</span>
                            {v.address && <span className="text-xs text-gray-400 ml-2">{v.address}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setIsCustom(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Not in the list? Add custom location
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setIsCustom(false)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                \u2190 Back to list
              </button>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Bar name or location"
                className="h-8 text-sm"
              />
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Google Maps link (optional)"
                className="h-8 text-sm"
              />
            </>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={(!selectedVenue && !customName.trim()) || loading}
              onClick={handlePost}
            >
              {loading ? "Saving..." : "I'm watching here \u2713"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowing(false); setSelectedVenue(null); setSearch(""); setIsCustom(false); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Who's watching where */}
      {locations.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Nobody&apos;s posted a watch location yet</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div key={loc.locationName} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {loc.locationUrl ? (
                    <a href={loc.locationUrl} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-sm text-green-700 hover:underline truncate">
                      {loc.locationName}
                    </a>
                  ) : (
                    <span className="font-medium text-sm text-gray-800">{loc.locationName}</span>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">{loc.people.length} going</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{loc.people.join(", ")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
