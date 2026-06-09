import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const deviceId = cookieStore.get("deviceId")?.value;

    if (!deviceId) {
      return NextResponse.json({ error: "No deviceId cookie found" }, { status: 400 });
    }

    await db
      .update(students)
      .set({ deviceId })
      .where(eq(students.id, session.user.id));

    return NextResponse.json({ success: true, deviceId });
  } catch (error) {
    console.error("Error syncing device ID:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
