import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, predictions, bets, matchReactions, matchVibes } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, session.user.id))
    .limit(1);

  const myPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.studentId, session.user.id));

  const myBets = await db
    .select()
    .from(bets)
    .where(or(eq(bets.student1Id, session.user.id), eq(bets.student2Id, session.user.id)));

  const myReactions = await db
    .select()
    .from(matchReactions)
    .where(eq(matchReactions.studentId, session.user.id));

  const myVibes = await db
    .select()
    .from(matchVibes)
    .where(eq(matchVibes.studentId, session.user.id));

  const data = {
    exportedAt: new Date().toISOString(),
    profile: { ...student, pushSubscription: undefined },
    predictions: myPredictions,
    bets: myBets,
    reactions: myReactions,
    vibes: myVibes,
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${Date.now()}.json"`,
    },
  });
}
