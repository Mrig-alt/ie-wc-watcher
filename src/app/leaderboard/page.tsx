import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams, connections } from "@/db/schema";
import { eq, desc, and, or, isNull, sql } from "drizzle-orm";
import LeaderboardClient from "@/components/leaderboard/LeaderboardClient";
import LeaderboardInfoModal from "@/components/leaderboard/LeaderboardInfoModal";
import ScoringLogicModal from "@/components/leaderboard/ScoringLogicModal";
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
        escrowTokens: students.escrowTokens,
        isHonoraryFan: students.isHonoraryFan,
        visibility: students.visibility,
        leaderboardVisibility: students.leaderboardVisibility,
        teamName: teams.name,
        teamFlag: teams.flagEmoji,
        hasBoughtIn: students.hasBoughtIn,
        totalTokensReceived: students.totalTokensReceived,
      })
      .from(students)
      .leftJoin(teams, eq(students.teamId, teams.id))
      .where(and(eq(students.flagged, false), eq(students.isGuest, false), isNull(students.deletedAt)))
      .orderBy(desc(sql`${students.tokenBalance} + ${students.escrowTokens} - ${students.totalTokensReceived}`))
      .limit(51);

    const hasNextPage = rows.length > 50;
    const paginatedRows = hasNextPage ? rows.slice(0, 50) : rows;

    const initialRows = paginatedRows.map((s, i) => {
      let isVisible = true;
      if (s.id === session?.user?.id) {
        isVisible = true;
      } else if (s.visibility === "stealth") {
        isVisible = false;
      } else if (s.visibility === "friends") {
        isVisible = friendIds.has(s.id);
      } else if (s.leaderboardVisibility === false) {
        isVisible = false;
      }
      
      return {
        id: s.id,
        name: isVisible ? s.name : null,
        profit: s.tokenBalance + s.escrowTokens - s.totalTokensReceived,
        isHonoraryFan: s.isHonoraryFan,
        teamName: isVisible ? s.teamName : null,
        teamFlag: isVisible ? s.teamFlag : null,
        hasBoughtIn: s.hasBoughtIn,
        isCurrentUser: s.id === session?.user?.id,
        isAnonymous: !isVisible,
        rank: i + 1,
      };
    });

    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Net Profit Leaderboard 🏆</h1>
            <LeaderboardInfoModal />
            <ScoringLogicModal />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Ranked by profit: (Total Tokens) - (Total Bought/Given). 
          </p>
        </div>

        {session?.user && !session.user.isGuest && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 text-xs text-amber-800 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="font-semibold text-amber-900">🪙 Low on tokens or playing high-stakes?</p>
              <p className="text-amber-700 mt-0.5">
                You can refill your balance with +100 tokens. (Note: Doing so will permanently tag you as "Refilled 🧪" on the leaderboard to preserve competitive integrity).
              </p>
            </div>
            <a
              href="/account"
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              Refill tokens
            </a>
          </div>
        )}

        <LeaderboardClient initialRows={initialRows} hasNextPage={hasNextPage} currentUserId={session?.user?.id} />
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
