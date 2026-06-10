import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, students, watchInvites, teams } from "@/db/schema";
import { and, gt, lte, eq, inArray, notInArray } from "drizzle-orm";
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
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  // Find matches starting in 18–30 hours with watch_reminder_sent = false
  const in18h = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const in30h = new Date(now.getTime() + 30 * 60 * 60 * 1000);

  const tomorrowMatches = await db
    .select({
      id: matches.id,
      matchDatetime: matches.matchDatetime,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
      team1Placeholder: matches.team1Placeholder,
      team2Placeholder: matches.team2Placeholder,
    })
    .from(matches)
    .where(and(
      gt(matches.matchDatetime, in18h),
      lte(matches.matchDatetime, in30h),
      eq(matches.status, "upcoming"),
      eq(matches.watchReminderSent, false)
    ));

  if (tomorrowMatches.length === 0) {
    return NextResponse.json({ success: true, notified: 0 });
  }

  const allTeamRows = await db
    .select({ id: teams.id, name: teams.name, flagEmoji: teams.flagEmoji })
    .from(teams);
  const teamMap = new Map(allTeamRows.map((t) => [t.id, t]));

  let notified = 0;

  for (const match of tomorrowMatches) {
    const t1 = match.team1Id ? teamMap.get(match.team1Id) : null;
    const t2 = match.team2Id ? teamMap.get(match.team2Id) : null;
    const teamIds = [match.team1Id, match.team2Id].filter(Boolean) as string[];

    // Find supporters of both teams who have push enabled and haven't posted a watch invite
    const [supporters, alreadyPosted] = await Promise.all([
      teamIds.length > 0
        ? db.select({ id: students.id, pushSubscription: students.pushSubscription, teamId: students.teamId })
            .from(students)
            .where(and(
              eq(students.pushEnabled, true),
              eq(students.isGuest, false),
              inArray(students.teamId, teamIds)
            ))
        : Promise.resolve([]),
      db.select({ inviterId: watchInvites.inviterId })
        .from(watchInvites)
        .where(eq(watchInvites.matchId, match.id)),
    ]);

    const postedIds = new Set(alreadyPosted.map((p) => p.inviterId));
    const targets = supporters.filter((s) => !postedIds.has(s.id) && s.pushSubscription);

    if (targets.length === 0) {
      await db.update(matches).set({ watchReminderSent: true }).where(eq(matches.id, match.id));
      continue;
    }

    const kickoffTime = new Date(match.matchDatetime).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    });

    await Promise.allSettled(
      targets.map(async (sub) => {
        const myTeam = sub.teamId === match.team1Id ? t1 : t2;
        const opponent = sub.teamId === match.team1Id ? t2 : t1;
        const myTeamName = myTeam ? `${myTeam.flagEmoji} ${myTeam.name}` : (match.team1Placeholder ?? "Your team");
        const oppName = opponent ? `${opponent.flagEmoji} ${opponent.name}` : (match.team2Placeholder ?? "the opponent");

        const payload = JSON.stringify({
          title: `📍 ${myTeamName} play tomorrow at ${kickoffTime}!`,
          body: `vs ${oppName} — where are you watching? Pin your bar → +50 tokens 🪙`,
          url: `/watchmap?match=${match.id}`,
        });

        try {
          await webpush.sendNotification(JSON.parse(sub.pushSubscription!), payload);
          notified++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await db.update(students).set({ pushSubscription: null }).where(eq(students.id, sub.id));
          }
        }
      })
    );

    await db.update(matches).set({ watchReminderSent: true }).where(eq(matches.id, match.id));
  }

  return NextResponse.json({ success: true, notified });
}
