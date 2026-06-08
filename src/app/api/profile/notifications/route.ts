import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const notificationSchema = z.object({
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = notificationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await db
      .update(students)
      .set({
        pushEnabled: result.data.pushEnabled,
        emailEnabled: result.data.emailEnabled,
        notificationsOnboarded: true,
      })
      .where(eq(students.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update notification preferences", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
