import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, students, bets, teams } from "@/db/schema";
import { and, gt, lte, eq, inArray, sql } from "drizzle-orm";
import webpush from "web-push";

export const dynamic = "force-dynamic";

try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
} catch {
  // already configured
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ success: true, notified: 0, betsExpired: 0, skipped: "VAPID keys not configured" });
  }

  const now = new Date();
  const window = new Date(now.getTime() + 35 * 60_000);

  // Find matches starting within 35 min that haven't been notified yet
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
        lte(matches.matchDatetime, window),
        eq(matches.startNotificationSent, false)
      )
    );

  // Expire pending bets for matches that have already started
  const startedMatchIds = (
    await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.status, "upcoming"), lte(matches.matchDatetime, now)))
  ).map((m) => m.id);

  let betsExpired = 0;
  if (startedMatchIds.length > 0) {
    // Find pending bets for started matches to refund the challenger (student1)
    const pendingBets = await db
      .select({ id: bets.id, student1Id: bets.student1Id, stakeTokens: bets.stakeTokens })
      .from(bets)
      .where(and(inArray(bets.matchId, startedMatchIds), eq(bets.status, "pending")));

    if (pendingBets.length > 0) {
      // Refund each challenger
      for (const bet of pendingBets) {
        await db
          .update(students)
          .set({ tokenBalance: sql`${students.tokenBalance} + ${bet.stakeTokens}`, escrowTokens: sql`${students.escrowTokens} - ${bet.stakeTokens}` })
          .where(eq(students.id, bet.student1Id));
      }
      const betIds = pendingBets.map((b) => b.id);
      await db.update(bets).set({ status: "expired" }).where(inArray(bets.id, betIds));
      betsExpired = pendingBets.length;
    }
  }

  if (upcomingMatches.length === 0) {
    return NextResponse.json({ success: true, notified: 0, betsExpired });
  }

  // Fetch push subscribers and teams in parallel
  const [subscribers, allTeamRows] = await Promise.all([
    db
      .select({ id: students.id, pushSubscription: students.pushSubscription })
      .from(students)
      .where(and(eq(students.pushEnabled, true), eq(students.isGuest, false))),
    db.select({ id: teams.id, name: teams.name, flagEmoji: teams.flagEmoji }).from(teams),
  ]);
  const teamMap = new Map(allTeamRows.map((t) => [t.id, t]));

  if (subscribers.length === 0) {
    await db.update(matches).set({ startNotificationSent: true }).where(inArray(matches.id, upcomingMatches.map((m) => m.id)));
    return NextResponse.json({ success: true, notified: 0, betsExpired });
  }

  let notified = 0;

  for (const match of upcomingMatches) {
    const t1 = match.team1Id ? teamMap.get(match.team1Id) : null;
    const t2 = match.team2Id ? teamMap.get(match.team2Id) : null;
    const team1Name = t1 ? `${t1.flagEmoji} ${t1.name}` : (match.team1Placeholder ?? "Team 1");
    const team2Name = t2 ? `${t2.flagEmoji} ${t2.name}` : (match.team2Placeholder ?? "Team 2");
    const matchLabel = `${team1Name} vs ${team2Name}`;

    const payload = JSON.stringify({
      title: "⚽ Kick-off in 30 min!",
      body: `${matchLabel} is about to start — have you predicted the score?`,
      url: "/schedule",
    });

    await Promise.allSettled(
      subscribers.map(async (sub) => {
        if (!sub.pushSubscription) return;
        try {
          await webpush.sendNotification(JSON.parse(sub.pushSubscription), payload);
          notified++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await db.update(students).set({ pushSubscription: null }).where(eq(students.id, sub.id));
          }
        }
      })
    );
  }

  await db
    .update(matches)
    .set({ startNotificationSent: true })
    .where(inArray(matches.id, upcomingMatches.map((m) => m.id)));

  return NextResponse.json({ success: true, notified, betsExpired });
}
