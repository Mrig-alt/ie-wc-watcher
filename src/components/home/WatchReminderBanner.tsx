import Link from "next/link";
import { MapPin } from "lucide-react";

interface Props {
  match: {
    matchId: string;
    matchDatetime: string;
    team1Name: string;
    team1Flag: string;
    team2Name: string;
    team2Flag: string;
  };
}

export default function WatchReminderBanner({ match }: Props) {
  const time = new Date(match.matchDatetime).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex gap-3 items-start">
        <div className="mt-0.5 rounded-full bg-indigo-100 p-2 text-indigo-600 shrink-0">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900 text-sm">
            {match.team1Flag} {match.team1Name} play tomorrow at {time}!
          </p>
          <p className="text-xs text-indigo-700 mt-0.5">
            vs {match.team2Flag} {match.team2Name} — have you decided where you&apos;re watching?
          </p>
        </div>
      </div>
      <Link
        href={`/watchmap?match=${match.matchId}`}
        className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 transition-colors"
      >
        📍 Pin my bar
      </Link>
    </div>
  );
}
