import { NextResponse } from "next/server";
import { db } from "@/db";
import { liveReports, students, venues, matches, teams } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const liveReportSchema = z.object({
  status: z.enum(["buzzing", "getting_busy", "packed", "queue_outside", "entry_fee", "good_screens", "quiet_now", "planning"]),
  venueId: z.string().uuid().optional().nullable(),
  venueName: z.string().min(1).max(200).optional().nullable(),
  matchId: z.string().uuid().optional().nullable(),
  comment: z.string().max(300).optional().nullable(),
});

export async function GET() {
  // Return reports from the last 3 hours
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const reports = await db
    .select({
      id: liveReports.id,
      status: liveReports.status,
      comment: liveReports.comment,
      createdAt: liveReports.createdAt,
      venueId: liveReports.venueId,
      venueName: liveReports.venueName,
      matchId: liveReports.matchId,
      studentName: students.name,
      studentVisibility: students.visibility,
      studentId: liveReports.studentId,
      // venue details if linked
      linkedVenueName: venues.name,
      linkedVenueMapsUrl: venues.mapsUrl,
      linkedVenueArea: venues.area,
    })
    .from(liveReports)
    .leftJoin(students, eq(students.id, liveReports.studentId))
    .leftJoin(venues, eq(venues.id, liveReports.venueId))
    .where(gte(liveReports.createdAt, since))
    .orderBy(desc(liveReports.createdAt))
    .limit(100);

  // Normalise venue name: prefer linked venue, fallback to free text
  const normalised = reports.map((r) => ({
    id: r.id,
    status: r.status,
    comment: r.comment,
    createdAt: r.createdAt,
    venueId: r.venueId,
    venueName: r.linkedVenueName ?? r.venueName ?? "Unknown venue",
    venueArea: r.linkedVenueArea ?? null,
    venueMapsUrl: r.linkedVenueMapsUrl ?? null,
    matchId: r.matchId,
    studentName: (r.studentVisibility === "stealth" || r.studentVisibility === "friends") ? "Anonymous" : (r.studentName ?? "Someone"),
  }));

  return NextResponse.json({ reports: normalised });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = liveReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { status, venueId, venueName, matchId, comment } = parsed.data;

  // Must have at least a venue (linked or free text) unless planning
  if (status !== "planning" && !venueId && !venueName) {
    return NextResponse.json({ error: "Venue is required" }, { status: 400 });
  }

  const [report] = await db
    .insert(liveReports)
    .values({
      studentId: session.user.id,
      venueId: venueId ?? null,
      venueName: venueName ?? null,
      matchId: matchId ?? null,
      status,
      comment: comment ?? null,
    })
    .returning();

  return NextResponse.json({ report }, { status: 201 });
}
