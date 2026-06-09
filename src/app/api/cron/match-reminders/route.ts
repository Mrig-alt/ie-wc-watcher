import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions, students, teams } from "@/db/schema";
import { eq, and, gt, lte, inArray } from "drizzle-orm";
import webpush from "web-push";

export const dynamic = "force-dynamic";

if (!webpush.generateVAPIDKeys) {
  // Safe guard if global isn't initialized
}
try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
} catch (e) {
  console.warn("webpush already configured or missing keys");
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET env var not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const now = new Date();
    // Look for matches starting within the next 45 minutes
    const futureWindow = new Date(now.getTime() + 45 * 60000);

    // 1. Find upcoming matches
    const upcomingMatches = await db
      .select({
        id: matches.id,
        team1Id: matches.team1Id,
        team2Id: matches.team2Id,
        team1Placeholder: matches.team1Placeholder,
        team2Placeholder: matches.team2Placeholder,
      })
      .from(matches)
      .where(
        and(
          gt(matches.matchDatetime, now),
          lte(matches.matchDatetime, futureWindow)
        )
      );

    if (upcomingMatches.length === 0) {
      return NextResponse.json({ success: true, message: "No upcoming matches in the window." });
    }

    const allTeams = await db.select().from(teams);
    const teamMap = new Map(allTeams.map((t) => [t.id, t]));
    const matchIds = upcomingMatches.map(m => m.id);

    // 2. Fetch all unsent predictions for these matches
    const pendingPredictions = await db
      .select({
        predictionId: predictions.id,
        matchId: predictions.matchId,
        predictedScore1: predictions.predictedScore1,
        predictedScore2: predictions.predictedScore2,
        pushSubscription: students.pushSubscription,
      })
      .from(predictions)
      .innerJoin(students, eq(students.id, predictions.studentId))
      .where(
        and(
          inArray(predictions.matchId, matchIds),
          eq(predictions.reminderSent, false),
          eq(students.pushEnabled, true)
        )
      );

    if (pendingPredictions.length === 0) {
      return NextResponse.json({ success: true, message: "No unsent predictions require reminders." });
    }

    let notificationsSent = 0;
    
    // 3. Process in batches to avoid overwhelming the network and memory
    const BATCH_SIZE = 50;
    const batches = chunkArray(pendingPredictions, BATCH_SIZE);

    for (const batch of batches) {
      const pushPromises = batch.map(async (pred) => {
        if (!pred.pushSubscription) return null;

        const match = upcomingMatches.find(m => m.id === pred.matchId)!;
        const t1 = match.team1Id ? teamMap.get(match.team1Id) : null;
        const t2 = match.team2Id ? teamMap.get(match.team2Id) : null;
        const team1Name = t1 ? `${t1.flagEmoji} ${t1.name}` : match.team1Placeholder ?? "TBD";
        const team2Name = t2 ? `${t2.flagEmoji} ${t2.name}` : match.team2Placeholder ?? "TBD";
        const matchTitle = `${team1Name} vs ${team2Name}`;

        try {
          const subscription = JSON.parse(pred.pushSubscription);
          const payload = JSON.stringify({
            title: "Match starting soon! ⚽",
            body: `${matchTitle} kicks off in less than 45 minutes. You predicted ${pred.predictedScore1}-${pred.predictedScore2}. Good luck!`,
            url: `/matches/${match.id}`,
          });

          await webpush.sendNotification(subscription, payload);
          return pred.predictionId;
        } catch (err: any) {
          console.error(`Failed to send push for prediction ${pred.predictionId}:`, err.message);
          return null; // Return null so we don't mark it as sent if it failed temporarily
        }
      });

      // Wait for the entire batch to settle
      const results = await Promise.allSettled(pushPromises);
      const successfulPredictionIds = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled" && r.value !== null)
        .map(r => r.value);

      // 4. Update the reminderSent flag immediately for successful notifications
      if (successfulPredictionIds.length > 0) {
        await db
          .update(predictions)
          .set({ reminderSent: true })
          .where(inArray(predictions.id, successfulPredictionIds));
        
        notificationsSent += successfulPredictionIds.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent: notificationsSent, 
      pendingRemaining: pendingPredictions.length - notificationsSent 
    });
  } catch (error: any) {
    console.error("Match reminder cron error:", error);
    return NextResponse.json({ error: "Failed to process match reminders" }, { status: 500 });
  }
}
