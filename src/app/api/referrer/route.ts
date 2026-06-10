import { NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [student] = await db
    .select({ name: students.name, visibility: students.visibility })
    .from(students)
    .where(eq(students.id, id))
    .limit(1);

  if (!student || student.visibility === "stealth") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ name: student.name.split(" ")[0] });
}
