import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // FIX: session-authenticated export endpoint — no ?key= in URL
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.id || !adminEmail || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: students.id, name: students.name, email: students.email,
      nationality: students.nationality, tokenBalance: students.tokenBalance,
      visibility: students.visibility, flagged: students.flagged,
      createdAt: students.createdAt, teamName: teams.name,
    })
    .from(students)
    .leftJoin(teams, eq(students.teamId, teams.id))
    .orderBy(desc(students.createdAt));

  const sanitize = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
  const header = ["id", "name", "email", "nationality", "team", "tokenBalance", "visibility", "flagged", "createdAt"].join(",");
  const csvRows = rows.map((r) =>
    [
      r.id,
      `"${sanitize((r.name ?? "").replace(/"/g, '""'))}"`,
      `"${sanitize((r.email ?? "").replace(/"/g, '""'))}"`,
      `"${sanitize((r.nationality ?? "").replace(/"/g, '""'))}"`,
      `"${sanitize((r.teamName ?? "").replace(/"/g, '""'))}"`,
      r.tokenBalance,
      r.visibility,
      r.flagged,
      r.createdAt,
    ].join(",")
  );

  const csv = [header, ...csvRows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
