export type TeamStats = {
  teamId: string;
  name: string;
  flagEmoji: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export function calculateGroupStandings(
  groupName: string,
  matches: any[],
  groupTeams: any[]
): TeamStats[] {
  const standingsMap = new Map<string, TeamStats>();

  for (const team of groupTeams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      name: team.name,
      flagEmoji: team.flagEmoji,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }

  // Filter completed group matches for this group
  const completedGroupMatches = matches.filter(
    (m) =>
      m.stage === "group" &&
      m.status === "completed" &&
      m.team1Score !== null &&
      m.team2Score !== null &&
      (m.groupName === groupName || 
       (m.team1Id && standingsMap.has(m.team1Id)) || 
       (m.team2Id && standingsMap.has(m.team2Id)))
  );

  for (const m of completedGroupMatches) {
    const t1Stats = standingsMap.get(m.team1Id);
    const t2Stats = standingsMap.get(m.team2Id);

    if (t1Stats && t2Stats) {
      t1Stats.played += 1;
      t2Stats.played += 1;

      const s1 = m.team1Score;
      const s2 = m.team2Score;

      t1Stats.gf += s1;
      t1Stats.ga += s2;
      t2Stats.gf += s2;
      t2Stats.ga += s1;

      if (s1 > s2) {
        t1Stats.won += 1;
        t1Stats.points += 3;
        t2Stats.lost += 1;
      } else if (s2 > s1) {
        t2Stats.won += 1;
        t2Stats.points += 3;
        t1Stats.lost += 1;
      } else {
        t1Stats.drawn += 1;
        t1Stats.points += 1;
        t2Stats.drawn += 1;
        t2Stats.points += 1;
      }
    }
  }

  // Calculate goal differences
  const standings = Array.from(standingsMap.values()).map((s) => {
    s.gd = s.gf - s.ga;
    return s;
  });

  // Sort according to FIFA rules: Points, GD, GF, Name
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });

  return standings;
}
