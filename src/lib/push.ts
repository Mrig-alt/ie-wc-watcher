import webpush from "web-push";
import { db } from "@/db";
import { students, groupMembers } from "@/db/schema";
import { eq, inArray, and, isNotNull } from "drizzle-orm";

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    "mailto:admin@ie-wc-watcher.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  console.warn("VAPID keys are missing. Push notifications will not work.");
}

export async function sendGroupJoinNotification(groupId: string, newUserName: string, newUserId: string) {
  try {
    // Find all users in this group who have push subscriptions, EXCLUDING the new user themselves
    const members = await db
      .select({
        id: students.id,
        pushSubscription: students.pushSubscription,
      })
      .from(groupMembers)
      .innerJoin(students, eq(groupMembers.studentId, students.id))
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          isNotNull(students.pushSubscription)
        )
      );

    const payload = JSON.stringify({
      title: "New Challenger! \uD83C\uDFC6",
      body: `${newUserName} just joined your mini-league!`,
      url: `/students/groups/${groupId}`,
    });

    const notifications = members
      .filter((m) => m.id !== newUserId && m.pushSubscription)
      .map(async (m) => {
        try {
          const sub = JSON.parse(m.pushSubscription!);
          await webpush.sendNotification(sub, payload);
        } catch (error: any) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            // Subscription has expired or is no longer valid, delete it
            await db
              .update(students)
              .set({ pushSubscription: null })
              .where(eq(students.id, m.id));
          } else {
            console.error("Error sending push to", m.id, error);
          }
        }
      });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error("Failed to broadcast group join notification", error);
  }
}

export async function sendChallengeNotification(opponentId: string, challengerName: string, stakeTokens: number) {
  try {
    const [opponent] = await db
      .select({ pushSubscription: students.pushSubscription })
      .from(students)
      .where(eq(students.id, opponentId))
      .limit(1);

    if (!opponent?.pushSubscription) return;

    const payload = JSON.stringify({
      title: "⚔️ You've been challenged!",
      body: `${challengerName} has challenged you for ${stakeTokens} tokens!`,
      url: `/`,
    });

    try {
      const sub = JSON.parse(opponent.pushSubscription);
      await webpush.sendNotification(sub, payload);
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await db.update(students).set({ pushSubscription: null }).where(eq(students.id, opponentId));
      } else {
        console.error("Error sending push to", opponentId, error);
      }
    }
  } catch (error) {
    console.error("Failed to send challenge notification", error);
  }
}
