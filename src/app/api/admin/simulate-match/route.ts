import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { settleBetsForMatch, settlePredictionsForMatch } from "@/lib/tokens";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session || !adminEmail || session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { matchId, team1Score, team2Score } = await req.json();

    if (!matchId || typeof team1Score !== "number" || typeof team2Score !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 1. Update Match Status
    await db
      .update(matches)
      .set({
        status: "completed",
        team1Score,
        team2Score,
      })
      .where(eq(matches.id, matchId));

    // 2. Settle Bets and Predictions
    await settleBetsForMatch(matchId);
    await settlePredictionsForMatch(matchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Simulation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
