import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PresenceDot from "./PresenceDot";
import { getInitials } from "@/lib/utils";

interface StudentCardProps {
  student: {
    id: string;
    name: string;
    nationality: string | null;
    isHonoraryFan: boolean;
    tokenBalance: number;
    lastSeenAt: Date | null;
    team: {
      name: string;
      flagEmoji: string;
      countryCode: string;
    } | null;
  };
}

export default function StudentCard({ student }: StudentCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
              {student.team ? (
                <span className="text-xl">{student.team.flagEmoji}</span>
              ) : (
                getInitials(student.name)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-gray-900 truncate">{student.name}</p>
                <PresenceDot lastSeenAt={student.lastSeenAt} />
              </div>
              <p className="text-xs text-gray-500 truncate">
                {student.nationality ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {student.team && (
              <span className="text-xs font-medium text-gray-700">{student.team.name}</span>
            )}
            {student.isHonoraryFan && (
              <Badge variant="friendly">🤝 Honorary</Badge>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>🪙 {student.tokenBalance} tokens</span>
        </div>
      </CardContent>
    </Card>
  );
}
