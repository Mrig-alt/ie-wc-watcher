import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq, or, and, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    const allMatches = await db
      .select({
        team1Id: matches.team1Id,
        team2Id: matches.team2Id,
        team1Score: matches.team1Score,
        team2Score: matches.team2Score,
        groupName: matches.groupName,
        status: matches.status,
      })
      .from(matches)
      .where(eq(matches.stage, "group"));

    const allTeams = await db.select().from(teams);
    const teamMap = new Map(allTeams.map((t) => [t.id, t]));

    // Initialize standings
    const standings: Record<string, Record<string, any>> = {};

    allMatches.forEach((m) => {
      if (!m.groupName) return;
      if (!standings[m.groupName]) standings[m.groupName] = {};

      const t1 = m.team1Id;
      const t2 = m.team2Id;

      if (t1 && !standings[m.groupName][t1]) {
        standings[m.groupName][t1] = { teamId: t1, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
      }
      if (t2 && !standings[m.groupName][t2]) {
        standings[m.groupName][t2] = { teamId: t2, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
      }

      if (m.status === "completed" && m.team1Score !== null && m.team2Score !== null) {
        if (t1) {
          const s = standings[m.groupName][t1];
          s.mp++;
          s.gf += m.team1Score;
          s.ga += m.team2Score;
          s.gd = s.gf - s.ga;
          if (m.team1Score > m.team2Score) { s.w++; s.pts += 3; }
          else if (m.team1Score === m.team2Score) { s.d++; s.pts += 1; }
          else { s.l++; }
        }
        if (t2) {
          const s = standings[m.groupName][t2];
          s.mp++;
          s.gf += m.team2Score;
          s.ga += m.team1Score;
          s.gd = s.gf - s.ga;
          if (m.team2Score > m.team1Score) { s.w++; s.pts += 3; }
          else if (m.team2Score === m.team1Score) { s.d++; s.pts += 1; }
          else { s.l++; }
        }
      }
    });

    const formattedStandings: Record<string, any[]> = {};
    for (const group of Object.keys(standings).sort()) {
      const teamsInGroup = Object.values(standings[group]);
      teamsInGroup.forEach((s) => {
        const t = teamMap.get(s.teamId);
        s.teamName = t?.name || "Unknown";
        s.flagEmoji = t?.flagEmoji || "🏳️";
      });
      // Sort by Points, then GD, then GF
      teamsInGroup.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });
      formattedStandings[group] = teamsInGroup;
    }

    return NextResponse.json({ standings: formattedStandings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
