"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppShareUrl } from "@/lib/utils";

interface ShareButtonProps {
  matchId: string;
  team1: { name: string; flagEmoji: string };
  team2: { name: string; flagEmoji: string };
  myTeam?: { name: string; flagEmoji: string } | null;
  prediction?: string;
}

export default function ShareButton({ matchId, team1, team2, myTeam, prediction }: ShareButtonProps) {
  const handleShare = async () => {
    // window.location is only accessed inside the click handler — never during SSR
    const matchUrl = `${window.location.origin}/matches/${matchId}`;

    const text = myTeam
      ? `${myTeam.flagEmoji} I'm rooting for ${myTeam.name} tonight! ${team1.flagEmoji} ${team1.name} vs ${team2.flagEmoji} ${team2.name}${prediction ? ` — my prediction: ${prediction}` : ""}. Will you watch? ${matchUrl}`
      : `${team1.flagEmoji} ${team1.name} vs ${team2.flagEmoji} ${team2.name} — follow the class pairings! ${matchUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ text, url: matchUrl });
        return;
      } catch {
        // fall through to WhatsApp
      }
    }
    window.open(buildWhatsAppShareUrl(text), "_blank");
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 text-gray-500">
      <Share2 className="h-4 w-4" />
      Share
    </Button>
  );
}
