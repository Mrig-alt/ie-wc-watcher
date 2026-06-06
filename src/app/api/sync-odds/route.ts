import { NextResponse } from "next/server";
import { fetchAndSyncOdds } from "@/lib/odds-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Local dev testing bypass if no CRON_SECRET is set, but required in prod
      if (process.env.NODE_ENV === "production" || authHeader) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const result = await fetchAndSyncOdds();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Odds sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
