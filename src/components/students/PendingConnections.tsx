"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

type Connection = {
  id: string;
  requesterId: string;
  requesteeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  requesterName: string | null;
};

export default function PendingConnections({ currentUserId }: { currentUserId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/connections");
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (e) {
      console.error("Failed to load connections:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const pendingIncoming = connections.filter((c) => c.status === "pending" && c.requesteeId === currentUserId);

  const handleAction = async (id: string, action: "accept" | "decline") => {
    try {
      await fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      fetchConnections();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  if (pendingIncoming.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-amber-500" /> 
        Pending Friend Requests ({pendingIncoming.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pendingIncoming.map((c) => (
          <div key={c.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                {getInitials(c.requesterName || "U")}
              </div>
              <span className="font-semibold text-sm text-gray-900 line-clamp-1">{c.requesterName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="icon" variant="outline" className="h-7 w-7 rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleAction(c.id, "decline")}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" className="h-7 w-7 rounded-full bg-green-600 hover:bg-green-700" onClick={() => handleAction(c.id, "accept")}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
