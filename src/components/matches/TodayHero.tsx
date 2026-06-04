import { formatKickoff } from "@/lib/utils";

interface TodayHeroProps {
  upcomingCount: number;
  liveCount: number;
  nextMatch?: {
    matchDatetime: Date;
    team1: { name: string; flagEmoji: string } | null;
    team2: { name: string; flagEmoji: string } | null;
  } | null;
  myTeam?: { name: string; flagEmoji: string; countryCode: string } | null;
  tokenBalance?: number;
}

export default function TodayHero({ upcomingCount, liveCount, nextMatch, myTeam, tokenBalance }: TodayHeroProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-800 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">IE World Cup 2026</h1>
          <p className="mt-0.5 text-green-200 text-sm">Class cohort tracker</p>
        </div>
        {myTeam && (
          <div className="flex flex-col items-end">
            <span className="text-3xl">{myTeam.flagEmoji}</span>
            <span className="text-xs text-green-200 mt-0.5">{myTeam.name}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        {liveCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-sm font-medium">{liveCount} live</span>
          </div>
        )}
        {upcomingCount > 0 && (
          <span className="text-sm text-green-200">{upcomingCount} upcoming today</span>
        )}
        {tokenBalance !== undefined && (
          <span className="ml-auto text-sm font-medium">🪙 {tokenBalance}</span>
        )}
      </div>

      {nextMatch && liveCount === 0 && (
        <div className="mt-3 rounded-xl bg-white/10 px-4 py-2.5">
          <p className="text-xs text-green-200">Next match</p>
          <p className="font-semibold">
            {nextMatch.team1?.flagEmoji ?? "🏳️"} {nextMatch.team1?.name ?? "TBD"} vs{" "}
            {nextMatch.team2?.flagEmoji ?? "🏳️"} {nextMatch.team2?.name ?? "TBD"}
          </p>
          <p className="text-xs text-green-200 mt-0.5">{formatKickoff(nextMatch.matchDatetime)}</p>
        </div>
      )}
    </div>
  );
}
