import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { surveyResponses, students, tokenLedger, groupMembers } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { responseId, action } = await req.json();
    if (!responseId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const [response] = await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.id, responseId))
      .limit(1);

    if (!response) {
      return NextResponse.json({ error: "Survey response not found" }, { status: 404 });
    }

    if (response.status !== "pending") {
      return NextResponse.json({ error: "Response is already moderated" }, { status: 400 });
    }

    if (action === "reject") {
      const [updated] = await db
        .update(surveyResponses)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(surveyResponses.id, responseId))
        .returning();
      return NextResponse.json({ success: true, response: updated });
    }

    // Approve: award 3 tokens and record in ledger
    const updated = await db.transaction(async (tx) => {
      // 1. Update response status
      const [res] = await tx
        .update(surveyResponses)
        .set({ status: "approved", tokensAwarded: 3, updatedAt: new Date() })
        .where(eq(surveyResponses.id, responseId))
        .returning();

      // 2. Increment student's global balance
      await tx
        .update(students)
        .set({ tokenBalance: sql`${students.tokenBalance} + 3` })
        .where(eq(students.id, response.studentId));

      // 3. Log transaction in token ledger
      await tx.insert(tokenLedger).values({
        studentId: response.studentId,
        amount: 3,
        reason: "survey_reward",
        matchId: null,
      });

      // 4. Update student's private group balances
      const memberships = await tx
        .select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.studentId, response.studentId));

      if (memberships.length > 0) {
        const groupIds = memberships.map((m) => m.groupId);
        await tx
          .update(groupMembers)
          .set({ tokenBalance: sql`${groupMembers.tokenBalance} + 3` })
          .where(and(inArray(groupMembers.groupId, groupIds), eq(groupMembers.studentId, response.studentId)));
      }

      return res;
    });

    return NextResponse.json({ success: true, response: updated });
  } catch (error) {
    console.error("Survey moderation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
