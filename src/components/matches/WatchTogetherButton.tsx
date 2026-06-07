"use client";

import { useState, useEffect } from "react";
import { MapPin, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PlacesAutocompleteInput from "./PlacesAutocompleteInput";

type Venue = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  mapsUrl: string | null;
};

interface WatchTogetherButtonProps {
  matchId: string;
  existingInvite?: { locationName: string; locationUrl?: string | null } | null;
}

export default function WatchTogetherButton({ matchId, existingInvite }: WatchTogetherButtonProps) {
  const [open, setOpen] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [search, setSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState(existingInvite?.locationName ?? "");
  const [customUrl, setCustomUrl] = useState(existingInvite?.locationUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(!!existingInvite);
  const [savedName, setSavedName] = useState(existingInvite?.locationName ?? "");

  useEffect(() => {
    if (open && venues.length === 0) {
      fetch("/api/venues").then(r => r.json()).then(d => setVenues(d.venues ?? []));
    }
  }, [open]);

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

  const handleSave = async () => {
    const name = selectedVenue ? selectedVenue.name : customName.trim();
    const url = selectedVenue ? selectedVenue.mapsUrl : customUrl.trim() || null;
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/watch-together", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, venueId: selectedVenue?.id ?? null, locationName: name, locationUrl: url }),
      });
      if (res.ok) {
        setSaved(true);
        setSavedName(name);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await fetch(`/api/watch-together?matchId=${matchId}`, { method: "DELETE" });
      setSaved(false);
      setSavedName("");
      setSelectedVenue(null);
    } finally {
      setLoading(false);
    }
  };

  if (saved && savedName) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5">
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate">Watching at {savedName}</span>
        <button onClick={handleRemove} disabled={loading} className="ml-auto shrink-0 text-blue-400 hover:text-blue-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <MapPin className="h-4 w-4" />
        Watch together?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📍 Where are you watching?</DialogTitle>
            <DialogDescription>Pick a venue so classmates can join you.</DialogDescription>
          </DialogHeader>

          {!isCustom ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedVenue(null); }}
                  placeholder="Search bars & pubs…"
                  className="pl-9"
                />
              </div>

              {selectedVenue && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-800 truncate">{selectedVenue.name}</p>
                    {selectedVenue.address && <p className="text-xs text-green-600 truncate">{selectedVenue.address}</p>}
                  </div>
                  <button onClick={() => setSelectedVenue(null)}><X className="h-4 w-4 text-green-400" /></button>
                </div>
              )}

              {!selectedVenue && (
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {Object.entries(byArea).map(([area, areaVenues]) => (
                    <div key={area}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{area}</p>
                      <div className="space-y-1">
                        {areaVenues.map(v => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVenue(v)}
                            className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                          >
                            <span className="font-medium">{v.name}</span>
                            {v.address && <span className="text-xs text-gray-400 ml-2">{v.address}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setIsCustom(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                Not in the list? Add custom location
              </button>

              <Button className="w-full" disabled={!selectedVenue || loading} onClick={handleSave}>
                {loading ? "Saving..." : "I'm watching here ✓"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setIsCustom(false)} className="text-sm text-gray-400 hover:text-gray-600">← Back to list</button>
              <PlacesAutocompleteInput 
                value={customName} 
                onChange={setCustomName} 
                onPlaceSelect={(name, url) => {
                  setCustomName(name);
                  if (url) setCustomUrl(url);
                }}
                placeholder="Bar or location name" 
              />
              <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="Google Maps link (optional)" />
              <Button className="w-full" disabled={!customName.trim() || loading} onClick={handleSave}>
                {loading ? "Saving..." : "Save location"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
