"use client";

import { useState } from "react";
import { UserPlus, UserCheck, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  targetUserId: string;
  initialStatus: "none" | "pending_sent" | "pending_received" | "accepted";
  onStatusChange?: (newStatus: "none" | "pending_sent" | "pending_received" | "accepted") => void;
}

export default function ConnectionButton({ targetUserId, initialStatus, onStatusChange }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (status === "none") {
        // Send request
        const res = await fetch("/api/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requesteeId: targetUserId }),
        });
        if (res.ok) {
          const data = await res.json();
          const newStatus = data.connection.status === "accepted" ? "accepted" : "pending_sent";
          setStatus(newStatus);
          onStatusChange?.(newStatus);
        }
      }
    } catch (e) {
      console.error("Connection action error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (status === "accepted") {
    return (
      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-green-600 bg-green-50 pointer-events-none gap-1.5">
        <UserCheck className="h-3 w-3" /> Friends
      </Button>
    );
  }

  if (status === "pending_sent") {
    return (
      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-gray-500 bg-gray-50 pointer-events-none gap-1.5">
        <Clock className="h-3 w-3" /> Requested
      </Button>
    );
  }

  if (status === "pending_received") {
    return (
      <Button variant="outline" size="sm" className="h-7 text-xs px-2 border-amber-200 text-amber-700 bg-amber-50 pointer-events-none gap-1.5">
        <Clock className="h-3 w-3" /> Review
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleAction}
      disabled={loading}
      className="h-7 text-xs px-2 gap-1.5"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
      Add Friend
    </Button>
  );
}
