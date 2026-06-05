import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

function isAdmin(email: string | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && email === adminEmail;
}

function sanitizeCsvCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

// Simple in-memory rate limiter — max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 requests per minute." },
      { status: 429 }
    );
  }

  const rows = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      nationality: students.nationality,
      visibility: students.visibility,
      tokenBalance: students.tokenBalance,
      isHonoraryFan: students.isHonoraryFan,
      flagged: students.flagged,
      createdAt: students.createdAt,
      teamName: teams.name,
      teamFlag: teams.flagEmoji,
    })
    .from(students)
    .leftJoin(teams, eq(students.teamId, teams.id))
    .orderBy(students.createdAt);

  const { searchParams } = new URL(req.url);
  if (searchParams.get("format") === "csv") {
    const header = "id,name,email,nationality,team,visibility,tokens,honorary,flagged,joined\n";
    const csv =
      header +
      rows
        .map((r) => {
          const cells = [
            r.id,
            sanitizeCsvCell((r.name ?? "").replace(/"/g, '""')),
            sanitizeCsvCell((r.email ?? "").replace(/"/g, '""')),
            sanitizeCsvCell((r.nationality ?? "").replace(/"/g, '""')),
            sanitizeCsvCell((r.teamName ?? "").replace(/"/g, '""')),
            r.visibility,
            r.tokenBalance,
            r.isHonoraryFan,
            r.flagged,
            r.createdAt.toISOString(),
          ];
          return cells.map((c, i) => (i < 5 ? `"${c}"` : c)).join(",");
        })
        .join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ students: rows });
}
