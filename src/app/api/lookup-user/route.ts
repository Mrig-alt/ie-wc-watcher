import { NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

// Public endpoint — only returns whether email exists + first name
// Does NOT expose any sensitive data
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  if (!email) return NextResponse.json({ exists: false });

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.email, email))
    .limit(1);

  return NextResponse.json({ exists: !!student });
}
