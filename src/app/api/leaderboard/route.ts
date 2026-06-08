import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teams, connections } from "@/db/schema";
import { eq, desc, and, or, isNull, sql, ilike } from "drizzle-orm";
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
      // NOTE: We only search by name. If a user is stealth/friends-only and the searcher is not a friend,
      // they shouldn't be searchable by name. We handle this by filtering out in the DB, 
      // OR we just search everyone and then anonymize the name after. 
      // If we anonymize after, searching "John" might return an "Anonymous" result, revealing who it is!
      // To fix this privacy leak, we must ONLY allow searching by name if the user is PUBLIC or a friend.
      
      if (session?.user?.id) {
        const friendIdsArray = Array.from(friendIds);
        if (friendIdsArray.length > 0) {
          queryConditions = and(
            queryConditions,
            ilike(students.name, `%${search}%`),
            or(
              eq(students.visibility, "public"),
              and(eq(students.visibility, "friends"), sql`${students.id} = ANY(ARRAY[${sql.join(friendIdsArray.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[])`),
              eq(students.id, session.user.id)
            )
          );
        } else {
          queryConditions = and(
            queryConditions,
            ilike(students.name, `%${search}%`),
            or(
              eq(students.visibility, "public"),
              eq(students.id, session.user.id)
            )
          );
        }
      } else {
        queryConditions = and(
          queryConditions,
          ilike(students.name, `%${search}%`),
          eq(students.visibility, "public")
        );
      }
    }

    // We also need to get the overall rank of each student. 
    // If we filter by search, the rank should still be their GLOBAL rank, not their search rank.
    // To do this efficiently without window functions, we might just not show rank when searching, 
    // or calculate rank using window functions.
    // Drizzle doesn't perfectly support window functions natively in the query builder yet,
    // so we can use a raw SQL CTE or just fetch the filtered users without a global rank when searching.
    // Actually, we can use `row_number() OVER (...)`.

    const rows = await db
      .select({
        id: students.id,
        name: students.name,
        tokenBalance: students.tokenBalance,
        escrowTokens: students.escrowTokens,
        isHonoraryFan: students.isHonoraryFan,
        visibility: students.visibility,
        leaderboardVisibility: students.leaderboardVisibility,
        teamName: teams.name,
        teamFlag: teams.flagEmoji,
        hasBoughtIn: students.hasBoughtIn,
        totalTokensReceived: students.totalTokensReceived,
        // We'll calculate rank in JS if no search, or just omit it if searching for now, 
        // but wait, if it's paginated, page 2 needs ranks 51-100.
      })
      .from(students)
      .leftJoin(teams, eq(students.teamId, teams.id))
      .where(queryConditions)
      .orderBy(desc(sql`${students.tokenBalance} + ${students.escrowTokens} - ${students.totalTokensReceived}`))
      .limit(limit + 1) // Fetch +1 to determine if there's a next page
      .offset(offset);

    const hasNextPage = rows.length > limit;
    const paginatedRows = hasNextPage ? rows.slice(0, limit) : rows;

    const processedRows = paginatedRows.map((s, i) => {
      let isVisible = true;
      if (s.id === session?.user?.id) {
        isVisible = true;
      } else if (s.visibility === "stealth") {
        isVisible = false;
      } else if (s.visibility === "friends") {
        isVisible = friendIds.has(s.id);
      } else if (s.leaderboardVisibility === false) {
        isVisible = false;
      }
      
      return {
        id: s.id,
        name: isVisible ? s.name : null,
        profit: s.tokenBalance + s.escrowTokens - s.totalTokensReceived,
        isHonoraryFan: s.isHonoraryFan,
        teamName: isVisible ? s.teamName : null,
        teamFlag: isVisible ? s.teamFlag : null,
        hasBoughtIn: s.hasBoughtIn,
        isCurrentUser: s.id === session?.user?.id,
        isAnonymous: !isVisible,
        // Rank logic: if there is a search query, it's a filtered list so rank doesn't make sense.
        // If no search query, rank is simply offset + i + 1.
        rank: search.trim() ? null : offset + i + 1,
      };
    });

    return NextResponse.json({
      rows: processedRows,
      hasNextPage,
    });
  } catch (e) {
    console.error("[leaderboard api] error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
