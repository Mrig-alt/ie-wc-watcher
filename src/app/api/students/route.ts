import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teams, connections } from "@/db/schema";
import { eq, and, or, isNull, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    
    const offset = (page - 1) * limit;

    let friendIds = new Set<string>();
    if (session?.user?.id) {
      const myConnections = await db
        .select({ requesterId: connections.requesterId, requesteeId: connections.requesteeId })
        .from(connections)
        .where(
          and(
            eq(connections.status, "accepted"),
            or(
              eq(connections.requesterId, session.user.id),
              eq(connections.requesteeId, session.user.id)
            )
          )
        );
      for (const c of myConnections) {
        if (c.requesterId !== session.user.id) friendIds.add(c.requesterId);
        if (c.requesteeId !== session.user.id) friendIds.add(c.requesteeId);
      }
    }

    let queryConditions = and(
      eq(students.flagged, false),
      eq(students.isGuest, false),
      isNull(students.deletedAt)
    );

    if (search.trim()) {
      queryConditions = and(
        queryConditions,
        ilike(students.name, `%${search}%`)
      );
    }

    const allStudents = await db
      .select({
        id: students.id,
        name: students.name,
        nationality: students.nationality,
        isHonoraryFan: students.isHonoraryFan,
        tokenBalance: students.tokenBalance,
        visibility: students.visibility,
        lastSeenAt: students.lastSeenAt,
        teamName: teams.name,
        teamFlag: teams.flagEmoji,
        teamCode: teams.countryCode,
      })
      .from(students)
      .leftJoin(teams, eq(students.teamId, teams.id))
      .where(queryConditions)
      .orderBy(students.name); // Using simple name ordering

    // Filter by visibility in JS since it's easier than complex SQL for friends check
    // If the database scales massively, this filter needs to be moved to SQL.
    // For now, this is paginated after filtering.
    const visible = allStudents.filter((s) => {
      if (s.visibility === "public") return true;
      if (!session?.user) return false;
      if (s.id === session.user.id) return true;
      if (s.visibility === "friends") return friendIds.has(s.id);
      return false; // stealth
    });

    const hasNextPage = visible.length > offset + limit;
    const paginatedVisible = visible.slice(offset, offset + limit);

    const mappedStudents = paginatedVisible.map((s) => ({
      id: s.id,
      name: s.name,
      nationality: s.nationality,
      isHonoraryFan: s.isHonoraryFan,
      tokenBalance: s.tokenBalance,
      lastSeenAt: s.lastSeenAt,
      team: s.teamName ? { name: s.teamName, flagEmoji: s.teamFlag!, countryCode: s.teamCode! } : null,
    }));

    return NextResponse.json({
      students: mappedStudents,
      hasNextPage,
    });
  } catch (e) {
    console.error("[students api] error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
