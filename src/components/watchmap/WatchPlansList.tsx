"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";

type WatchPlan = {
  id: string;
  venueName: string;
  area: string | null;
  mapsUrl: string | null;
  hostId: string;
  hostName: string;
  rsvps: { studentId: string; name: string }[];
};

interface WatchPlansListProps {
  invites: WatchPlan[];
  currentUserId?: string;
  isCompleted: boolean;
}

export default function WatchPlansList({ invites, currentUserId, isCompleted }: WatchPlansListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRSVP = async (inviteId: string, isRsvped: boolean) => {
    if (!currentUserId) {
      router.push("/join");
      return;
    }
    
    setLoadingId(inviteId);
    setError(null);
    try {
      const res = await fetch(`/api/watch-together/rsvp${isRsvped ? `?inviteId=${inviteId}` : ""}`, {
        method: isRsvped ? "DELETE" : "POST",
        headers: isRsvped ? undefined : { "Content-Type": "application/json" },
        body: isRsvped ? undefined : JSON.stringify({ inviteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to RSVP");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  if (invites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
        No watch plans yet.
        {!isCompleted && <Link href="/watchmap" className="ml-1 text-green-600 font-medium hover:underline">Add yours &rarr;</Link>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-2">{error}</div>}
      
      {invites.map((inv) => {
        const isHost = inv.hostId === currentUserId;
        const isRsvped = inv.rsvps.some((r) => r.studentId === currentUserId);
        
        return (
          <div key={inv.id} className="rounded-xl border border-gray-100 bg-white shadow-sm px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-0.5">
                <span className="truncate">{inv.hostName}</span>
                <span className="text-gray-400 font-normal text-xs shrink-0">is hosting at</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800 truncate">{inv.venueName}</span>
                {inv.area && <span className="text-xs text-gray-400 shrink-0">· {inv.area}</span>}
                {inv.mapsUrl && (
                  <a href={inv.mapsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <ExternalLink className="h-3 w-3 text-gray-400 hover:text-green-600" />
                  </a>
                )}
              </div>
              {inv.rsvps.length > 0 && (
                <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <span className="font-medium text-gray-700">{inv.rsvps.length} going:</span>
                  <span className="truncate">{inv.rsvps.map((r) => r.name.split(" ")[0]).join(", ")}</span>
                </div>
              )}
            </div>
            
            <div className="shrink-0 flex flex-col items-end">
              {!isCompleted && (
                isHost ? (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg border border-gray-200">Your Plan</span>
                ) : (
                  <button
                    onClick={() => handleRSVP(inv.id, isRsvped)}
                    disabled={loadingId === inv.id}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
                      isRsvped 
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    } disabled:opacity-50`}
                  >
                    {loadingId === inv.id ? "..." : isRsvped ? "RSVPed \u2713" : "RSVP"}
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
      
      {!isCompleted && (
        <div className="text-center pt-2">
          <Link href="/watchmap" className="inline-block text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100 transition-colors">
            Host a Watch Party <span className="ml-1 text-green-500 font-black">+50 Tokens</span>
          </Link>
        </div>
      )}
    </div>
  );
}
