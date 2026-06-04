import { stageLabel } from "@/lib/utils";
import type { MatchStage } from "@/db/schema";

interface EliminationCardProps {
  team: {
    name: string;
    flagEmoji: string;
    countryCode: string;
  };
  students: { name: string }[];
  eliminatedInStage: MatchStage;
}

export default function EliminationCard({ team, students, eliminatedInStage }: EliminationCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className="text-4xl">{team.flagEmoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{team.name}</p>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
            Out — {stageLabel(eliminatedInStage)}
          </span>
        </div>
        {students.length > 0 ? (
          <p className="mt-1 text-sm text-gray-500">
            {students.length === 1
              ? `${students[0].name} is out 💔`
              : `${students.slice(0, 2).map((s) => s.name).join(", ")}${students.length > 2 ? ` +${students.length - 2} more` : ""} are out 💔`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-400">No classmates supporting this team</p>
        )}
      </div>
    </div>
  );
}
