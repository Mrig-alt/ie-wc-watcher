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

export async function sendBetSettledNotification(studentId: string, result: "won" | "half_win" | "lost" | "half_loss" | "draw", tokens: number) {
  try {
    const [student] = await db
      .select({ pushSubscription: students.pushSubscription })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student?.pushSubscription) return;

    let title = "Challenge Settled!";
    let body = "";
    if (result === "won") {
      title = "✅ You won your challenge!";
      body = `You've earned ${tokens} tokens.`;
    } else if (result === "half_win") {
      title = "✅ Closest Prediction Win!";
      body = `You were closest! You earned ${tokens} tokens.`;
    } else if (result === "draw") {
      title = "🤝 Challenge Drawn";
      body = `Your ${tokens} tokens have been refunded.`;
    } else if (result === "half_loss") {
      title = "❌ Closest Prediction Loss";
      body = `Your opponent was closer. You lost ${tokens} tokens.`;
    } else {
      title = "❌ You lost your challenge";
      body = `You lost ${tokens} tokens. Better luck next time!`;
    }

    const payload = JSON.stringify({
      title,
      body,
      url: `/account`,
    });

    try {
      const sub = JSON.parse(student.pushSubscription);
      await webpush.sendNotification(sub, payload);
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await db.update(students).set({ pushSubscription: null }).where(eq(students.id, studentId));
      } else {
        console.error("Error sending push to", studentId, error);
      }
    }
  } catch (error) {
    console.error("Failed to send bet settled notification", error);
  }
}

export async function sendPredictionSettledNotification(studentId: string, earned: number, staked: number) {
  try {
    const [student] = await db
      .select({ pushSubscription: students.pushSubscription })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student?.pushSubscription) return;

    let title = "";
    let body = "";
    
    if (earned > 0) {
      title = "✅ Prediction Won!";
      const netProfit = earned - staked;
      body = `Your prediction hit! You earned ${netProfit} tokens.`;
    } else {
      title = "❌ Prediction Lost";
      body = `Your prediction missed. You lost ${staked} tokens.`;
    }

    const payload = JSON.stringify({
      title,
      body,
      url: `/account`,
    });

    try {
      const sub = JSON.parse(student.pushSubscription);
      await webpush.sendNotification(sub, payload);
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await db.update(students).set({ pushSubscription: null }).where(eq(students.id, studentId));
      } else {
        console.error("Error sending push to", studentId, error);
      }
    }
  } catch (error) {
    console.error("Failed to send prediction settled notification", error);
  }
}
