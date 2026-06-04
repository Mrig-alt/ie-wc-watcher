import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  try {
    const session = await auth();

    const rows = await db
      .select({
        id: students.id,
        name: students.name,
        tokenBalance: students.tokenBalance,
        isHonoraryFan: students.isHonoraryFan,
        visibility: students.visibility,
        teamName: teams.name,
        teamFlag: teams.flagEmoji,
      })
      .from(students)
      .leftJoin(teams, eq(students.teamId, teams.id))
      .where(eq(students.flagged, false))
      .orderBy(desc(students.tokenBalance));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Leaderboard 🏆</h1>
          <p className="text-sm text-gray-500 mt-1">
            Earn tokens from match bets (+20 per win) and predictions (+5 correct, +15 exact)
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {rows.map((s, i) => (
              <LeaderboardRow
                key={s.id}
                rank={i + 1}
                student={{
                  name: s.visibility === "stealth" && s.id !== session?.user.id ? "Anonymous 🕵️" : s.name,
                  tokenBalance: s.tokenBalance,
                  isHonoraryFan: s.isHonoraryFan,
                  team: s.teamName ? { name: s.teamName, flagEmoji: s.teamFlag! } : null,
                }}
                isCurrentUser={s.id === session?.user.id}
              />
            ))}
          </div>
        </div>

        {rows.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">No students yet.</p>
        )}
      </div>
    );
  } catch (e) {
    // FIX: log full error server-side only — never expose stack/message in HTML
    console.error("[leaderboard] render error", e);
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600 m-4">
        Something went wrong loading the leaderboard. Please refresh or try again shortly.
      </div>
    );
  }
}
