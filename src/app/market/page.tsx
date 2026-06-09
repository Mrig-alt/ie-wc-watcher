import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bets, matches, students, teams } from "@/db/schema";
import { eq, and, isNull, desc, gte } from "drizzle-orm";
import MarketClient from "@/components/market/MarketClient";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/join");
  }

  const openBetsRaw = await db
    .select({
      id: bets.id,
      stakeTokens: bets.stakeTokens,
      challengerTeamSide: bets.challengerTeamSide,
      student1Score1: bets.student1Score1,
      student1Score2: bets.student1Score2,
      challengerId: bets.student1Id,
      challengerName: students.name,
      matchId: bets.matchId,
      matchDatetime: matches.matchDatetime,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
    })
    .from(bets)
    .innerJoin(students, eq(bets.student1Id, students.id))
    .innerJoin(matches, eq(bets.matchId, matches.id))
    .where(
      and(
        eq(bets.isOpenMarket, true),
        eq(bets.status, "pending"),
        isNull(bets.student2Id),
        gte(matches.matchDatetime, new Date())
      )
    )
    .orderBy(desc(bets.id));

  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const initialBets = openBetsRaw.map((bet) => {
    const t1 = bet.team1Id ? teamMap.get(bet.team1Id) : null;
    const t2 = bet.team2Id ? teamMap.get(bet.team2Id) : null;
    return {
      id: bet.id,
      stakeTokens: bet.stakeTokens,
      challengerTeamSide: bet.challengerTeamSide,
      student1Score1: bet.student1Score1,
      student1Score2: bet.student1Score2,
      challengerId: bet.challengerId,
      challengerName: bet.challengerName,
      matchId: bet.matchId,
      matchDatetime: bet.matchDatetime,
      team1: t1 ? { name: t1.name, flagEmoji: t1.flagEmoji } : null,
      team2: t2 ? { name: t2.name, flagEmoji: t2.flagEmoji } : null,
      isMine: bet.challengerId === session?.user?.id,
    };
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Open Market \uD83D\uDCC8</h1>
          <p className="text-sm text-gray-500 mt-1">Take open bets from other students or post your own.</p>
        </div>
      </div>
      
      <MarketClient 
        initialBets={initialBets} 
        currentUserId={session?.user?.id} 
        isGuest={!!session?.user?.isGuest} 
        tokenBalance={session?.user?.tokenBalance ?? 0}
      />
    </div>
  );
}
