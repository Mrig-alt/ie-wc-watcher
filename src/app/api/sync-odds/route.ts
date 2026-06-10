import { NextResponse } from "next/server";
import { fetchAndSyncOdds } from "@/lib/odds-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await fetchAndSyncOdds();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Odds sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
