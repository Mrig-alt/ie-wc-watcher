"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import MatchCard from "./MatchCard";

type MatchCardProps = Parameters<typeof MatchCard>[0];

/**
 * Thin client wrapper around MatchCard.
 * Fetches its own live teamId from /api/students/me independently
 * so opponent logic is never stale from the JWT.
 */
export default function MatchCardClient(props: Omit<MatchCardProps, "currentUserId" | "currentUserTeamId" | "currentUserBalance">) {
  const { data: session } = useSession();
  const [liveTeamId, setLiveTeamId] = useState<string | null>(
    session?.user?.teamId ?? null
  );
  const [liveBalance, setLiveBalance] = useState<number>(
    session?.user?.tokenBalance ?? 0
  );

  useEffect(() => {
    if (!session?.user?.id) { setLiveTeamId(null); return; }
    fetch("/api/students/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { 
        if (d?.teamId !== undefined) setLiveTeamId(d.teamId); 
        if (d?.tokenBalance !== undefined) setLiveBalance(d.tokenBalance);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  return (
    <MatchCard
      {...props}
      currentUserId={session?.user?.id ?? null}
      currentUserTeamId={liveTeamId}
      currentUserBalance={liveBalance}
      currentUserIsGuest={session?.user?.isGuest}
    />
  );
}
