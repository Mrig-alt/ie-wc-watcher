import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { surveyResponses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const surveyInputSchema = z.object({
  questionKey: z.string().min(2).max(50),
  responseText: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = surveyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { questionKey, responseText } = parsed.data;

  try {
    const [inserted] = await db
      .insert(surveyResponses)
      .values({
        studentId: session.user.id,
        questionKey,
        responseText,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: [surveyResponses.studentId, surveyResponses.questionKey],
        set: { responseText, status: "pending", updatedAt: new Date() },
      })
      .returning();

    return NextResponse.json({ success: true, response: inserted }, { status: 200 });
  } catch (error) {
    console.error("Survey submission error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
