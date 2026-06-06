import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams, connections } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import { PREDICTION_CORRECT_TOKENS, PREDICTION_EXACT_TOKENS } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  try {
    const session = await auth();

    let friendIds = new Set<string>();
    if (session?.user?.id) {
      const myConnections = await db
        .select({ requesterId: connections.requesterId, requesteeId: connections.requesteeId })
        .from(connections)
        .where(
          and(
            eq(connections.status, "accepted"),
            or(
              eq(connections.requesterId, session.user.id),
              eq(connections.requesteeId, session.user.id)
            )
          )
        );
      for (const c of myConnections) {
        if (c.requesterId !== session.user.id) friendIds.add(c.requesterId);
        if (c.requesteeId !== session.user.id) friendIds.add(c.requesteeId);
      }
    }

    const rows = await db
      .select({
        id: students.id,
        name: students.name,
        tokenBalance: students.tokenBalance,
        isHonoraryFan: students.isHonoraryFan,
        visibility: students.visibility,
        leaderboardVisibility: students.leaderboardVisibility,
        teamName: teams.name,
        teamFlag: teams.flagEmoji,
        hasBoughtIn: students.hasBoughtIn,
      })
      .from(students)
      .leftJoin(teams, eq(students.teamId, teams.id))
      .where(and(eq(students.flagged, false), eq(students.isGuest, false)))
      .orderBy(desc(students.tokenBalance));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Leaderboard 🏆</h1>
          <p className="text-sm text-gray-500 mt-1">
            Earn tokens: +{PREDICTION_CORRECT_TOKENS} correct winner · +{PREDICTION_EXACT_TOKENS} exact score · 2× your stake on winning a bet
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {(() => {
              let anonymousCounter = 1;
              return rows.map((s, i) => {
                const isAnonymous = s.leaderboardVisibility === false && s.id !== session?.user?.id;
                const displayName = isAnonymous ? `Anonymous ${anonymousCounter++} 🕵️` : s.name;
                return (
                  <LeaderboardRow
                    key={s.id}
                    rank={i + 1}
                    student={{
                      name: displayName,
                      tokenBalance: s.tokenBalance,
                      isHonoraryFan: s.isHonoraryFan,
                      hasBoughtIn: s.hasBoughtIn,
                      team: isAnonymous ? null : (s.teamName ? { name: s.teamName, flagEmoji: s.teamFlag! } : null),
                    }}
                    isCurrentUser={s.id === session?.user?.id}
                  />
                );
              });
            })()}
          </div>
        </div>

        {rows.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">No students yet.</p>
        )}
      </div>
    );
  } catch (e) {
    console.error("[leaderboard] render error", e);
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600 m-4">
        Something went wrong loading the leaderboard. Please refresh or try again shortly.
      </div>
    );
  }
}
