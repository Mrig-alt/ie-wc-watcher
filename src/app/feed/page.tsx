import { db } from "@/db";
import { teams, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import EliminationCard from "@/components/feed/EliminationCard";
import LiveReactionTicker from "@/components/feed/LiveReactionTicker";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  try {
    const eliminatedTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        flagEmoji: teams.flagEmoji,
        countryCode: teams.countryCode,
        eliminatedStage: teams.eliminatedStage,
      })
      .from(teams)
      .where(eq(teams.isEliminated, true));

    const allStudents = await db
      .select({ id: students.id, name: students.name, teamId: students.teamId })
      .from(students)
      .where(eq(students.flagged, false));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
          <p className="text-sm text-gray-500 mt-1">Live reactions from your classmates + eliminations</p>
        </div>

        {/* Live reactions ticker — client component, connects via SSE */}
        <LiveReactionTicker />

        {/* Elimination feed */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Eliminations</h2>
          {eliminatedTeams.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">⚽</p>
              <p className="font-medium">No eliminations yet</p>
              <p className="text-sm mt-1">Check back once the tournament starts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eliminatedTeams.map((team) => {
                const supporters = allStudents.filter((s) => s.teamId === team.id);
                return (
                  <EliminationCard
                    key={team.id}
                    team={team}
                    students={supporters}
                    eliminatedInStage={team.eliminatedStage ?? "group"}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  } catch (e) {
    // FIX: log full error server-side only — never expose stack/message in HTML
    console.error("[feed] render error", e);
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600 m-4">
        Something went wrong loading the feed. Please refresh or try again shortly.
      </div>
    );
  }
}
