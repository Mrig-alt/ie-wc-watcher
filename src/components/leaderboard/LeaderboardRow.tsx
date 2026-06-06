interface LeaderboardRowProps {
  rank: number;
  student: {
    name: string;
    tokenBalance: number;
    team: { flagEmoji: string; name: string } | null;
    isHonoraryFan: boolean;
    hasBoughtIn?: boolean;
  };
  isCurrentUser?: boolean;
}

const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardRow({ rank, student, isCurrentUser }: LeaderboardRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
        isCurrentUser ? "bg-green-50 ring-1 ring-green-200" : "bg-white hover:bg-gray-50"
      }`}
    >
      <span className="w-8 text-center text-sm font-bold text-gray-500">
        {medals[rank] ?? rank}
      </span>
      <span className="text-xl">{student.team?.flagEmoji ?? "🏳️"}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {student.name}
          {isCurrentUser && <span className="ml-1.5 text-xs text-green-600">(you)</span>}
          {student.isHonoraryFan && <span className="ml-1.5 text-xs text-blue-500">🤝</span>}
          {student.hasBoughtIn && (
            <span
              className="ml-1.5 inline-flex items-center rounded-full bg-yellow-50 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20"
              title="This user has refilled their tokens and is playing for fun (diluted)"
            >
              Refilled 🧪
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400">{student.team?.name ?? "No team"}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-gray-900">🪙 {student.tokenBalance}</p>
      </div>
    </div>
  );
}
