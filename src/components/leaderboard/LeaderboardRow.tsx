import ConnectionButton from "@/components/students/ConnectionButton";

interface LeaderboardRowProps {
  rank: number;
  student: {
    id: string;
    name: string;
    tokenBalance: number;
    team: { flagEmoji: string; name: string } | null;
    isHonoraryFan: boolean;
    hasBoughtIn?: boolean;
    isAnonymous?: boolean;
  };
  isCurrentUser?: boolean;
  currentUserId?: string | null;
  connectionStatus?: "none" | "pending_sent" | "pending_received" | "accepted";
  onConnectionChange?: () => void;
}

const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardRow({ 
  rank, 
  student, 
  isCurrentUser,
  currentUserId,
  connectionStatus = "none",
  onConnectionChange
}: LeaderboardRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
        isCurrentUser ? "bg-green-50 ring-1 ring-green-200" : "bg-white hover:bg-gray-50"
      }`}
    >
      <span className="w-8 text-center text-sm font-bold text-gray-500 shrink-0">
        {medals[rank] ?? rank}
      </span>
      <span className="text-xl shrink-0">{student.team?.flagEmoji ?? "🏳️"}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 flex items-center flex-wrap gap-1.5">
          <span>{student.name}</span>
          {isCurrentUser && <span className="text-xs text-green-600">(you)</span>}
          {student.isHonoraryFan && <span className="text-xs text-blue-500">🤝</span>}
          {student.hasBoughtIn && (
            <span
              className="inline-flex items-center rounded-full bg-yellow-50 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20"
              title="This user has refilled their tokens and is playing for fun (diluted)"
            >
              Refilled 🧪
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400">{student.team?.name ?? "No team"}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">🪙 {student.tokenBalance}</p>
        </div>
        {currentUserId && !isCurrentUser && !student.isAnonymous && (
          <div className="hidden sm:block shrink-0">
            <ConnectionButton
              targetUserId={student.id}
              initialStatus={connectionStatus}
              onStatusChange={(status) => {
                if (status === "accepted") onConnectionChange?.();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
