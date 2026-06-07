import { db } from "./src/db";
import { matches, bets, students } from "./src/db/schema";
import { eq, or } from "drizzle-orm";

async function main() {
  const allStudents = await db.select().from(students);
  const me = allStudents.find(s => s.name?.toLowerCase().includes("mrig") || s.name?.toLowerCase().includes("raya"));
  if (!me) {
    console.log("Mrig not found");
    return process.exit(1);
  }

  const myBets = await db.select().from(bets).where(or(eq(bets.student1Id, me.id), eq(bets.student2Id, me.id)));
  
  for (const b of myBets) {
    const [match] = await db.select().from(matches).where(eq(matches.id, b.matchId));
    console.log(`\nBet ID: ${b.id}`);
    console.log(`Match: ${match.team1Placeholder} vs ${match.team2Placeholder}`);
    console.log(`Actual Score: ${match.team1Score}-${match.team2Score}`);
    console.log(`S1: ${b.student1Id} | S2: ${b.student2Id}`);
    console.log(`Status: ${b.status} | Settled: ${b.settled} | Winner: ${b.winnerId}`);
    console.log(`Challenger Side: ${b.challengerTeamSide}`);
  }
  
  process.exit(0);
}
main().catch(console.error);
