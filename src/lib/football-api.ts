const BASE = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

type ApiMatch = {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "CANCELLED";
  stage: string;
  group: string | null;
  homeTeam: { name: string; tla: string | null };
  awayTeam: { name: string; tla: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
  venue: string | null;
  competition?: {
    id: number;
    name: string;
    type: string;
  };
};

type ApiResponse = { matches: ApiMatch[] };

export async function fetchWCMatches(): Promise<ApiMatch[]> {
  const res = await fetch(`${BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": API_KEY },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("football-data.org error", res.status, await res.text());
    return [];
  }

  const data: ApiResponse = await res.json();
  return data.matches ?? [];
}

export async function fetchGlobalMatches(): Promise<ApiMatch[]> {
  // Free tier /matches returns today's and upcoming matches
  const res = await fetch(`${BASE}/matches`, {
    headers: { "X-Auth-Token": API_KEY },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("football-data.org global error", res.status, await res.text());
    return [];
  }

  const data: ApiResponse = await res.json();
  
  // Filter for national level only (or competitions that we consider international)
  // Sometimes type is 'CUP' or 'INTERNATIONAL' or 'CLUB'
  // Or just filter out common club names if type isn't reliable. We'll check if type === 'INTERNATIONAL' or name contains 'Friendlies'
  return (data.matches ?? []).filter((m) => {
    // Keep it if we explicitly know it's international, or it's not explicitly 'CLUB'
    const type = m.competition?.type?.toUpperCase();
    return type !== "CLUB"; // Simplified: Exclude explicit club matches. Some APIs might omit type, so default keep.
  });
}

export function mapApiStatus(
  status: ApiMatch["status"]
): "upcoming" | "live" | "completed" {
  if (status === "FINISHED") return "completed";
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  return "upcoming";
}

export { type ApiMatch };
