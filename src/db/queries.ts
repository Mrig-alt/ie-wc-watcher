import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { teams, students, matches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const getCachedTeams = unstable_cache(
  async () => {
    return await db.select().from(teams);
  },
  ["all-teams"],
  { revalidate: 3600, tags: ["teams"] }
);

export const getCachedMatches = unstable_cache(
  async () => {
    return await db.select().from(matches);
  },
  ["all-matches"],
  { revalidate: 60, tags: ["matches"] }
);

export const getCachedActiveStudents = unstable_cache(
  async () => {
    return await db
      .select({
        id: students.id,
        name: students.name,
        teamId: students.teamId,
        visibility: students.visibility,
        lastSeenAt: students.lastSeenAt,
      })
      .from(students)
      .where(and(eq(students.flagged, false), eq(students.isGuest, false)));
  },
  ["active-students"],
  { revalidate: 60, tags: ["students"] }
);

export const getCachedTeamSupportersMap = unstable_cache(
  async () => {
    const active = await db
      .select({
        id: students.id,
        name: students.name,
        teamId: students.teamId,
        visibility: students.visibility,
        lastSeenAt: students.lastSeenAt,
      })
      .from(students)
      .where(and(eq(students.flagged, false), eq(students.isGuest, false)));

    const map: Record<string, typeof active> = {};
    for (const s of active) {
      if (s.teamId && s.visibility !== "stealth") {
        if (!map[s.teamId]) map[s.teamId] = [];
        map[s.teamId].push(s);
      }
    }
    return map;
  },
  ["team-supporters-map"],
  { revalidate: 60, tags: ["students"] }
);
