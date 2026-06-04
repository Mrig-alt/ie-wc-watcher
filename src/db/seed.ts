import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { teams, matches } from "./schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema: { teams, matches } });

// ─── Teams ────────────────────────────────────────────────────────────────────

const TEAMS = [
  // Group A
  { name: "Mexico", countryCode: "MEX", flagEmoji: "🇲🇽", group: "A", confederation: "CONCACAF" },
  { name: "South Korea", countryCode: "KOR", flagEmoji: "🇰🇷", group: "A", confederation: "AFC" },
  { name: "South Africa", countryCode: "RSA", flagEmoji: "🇿🇦", group: "A", confederation: "CAF" },
  { name: "Czech Republic", countryCode: "CZE", flagEmoji: "🇨🇿", group: "A", confederation: "UEFA" },
  // Group B
  { name: "Canada", countryCode: "CAN", flagEmoji: "🇨🇦", group: "B", confederation: "CONCACAF" },
  { name: "Switzerland", countryCode: "SUI", flagEmoji: "🇨🇭", group: "B", confederation: "UEFA" },
  { name: "Qatar", countryCode: "QAT", flagEmoji: "🇶🇦", group: "B", confederation: "AFC" },
  { name: "Bosnia and Herzegovina", countryCode: "BIH", flagEmoji: "🇧🇦", group: "B", confederation: "UEFA" },
  // Group C
  { name: "Brazil", countryCode: "BRA", flagEmoji: "🇧🇷", group: "C", confederation: "CONMEBOL" },
  { name: "Morocco", countryCode: "MAR", flagEmoji: "🇲🇦", group: "C", confederation: "CAF" },
  { name: "Haiti", countryCode: "HAI", flagEmoji: "🇭🇹", group: "C", confederation: "CONCACAF" },
  { name: "Scotland", countryCode: "SCO", flagEmoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C", confederation: "UEFA" },
  // Group D
  { name: "United States", countryCode: "USA", flagEmoji: "🇺🇸", group: "D", confederation: "CONCACAF" },
  { name: "Paraguay", countryCode: "PAR", flagEmoji: "🇵🇾", group: "D", confederation: "CONMEBOL" },
  { name: "Australia", countryCode: "AUS", flagEmoji: "🇦🇺", group: "D", confederation: "AFC" },
  { name: "Türkiye", countryCode: "TUR", flagEmoji: "🇹🇷", group: "D", confederation: "UEFA" },
  // Group E
  { name: "Germany", countryCode: "GER", flagEmoji: "🇩🇪", group: "E", confederation: "UEFA" },
  { name: "Curaçao", countryCode: "CUW", flagEmoji: "🇨🇼", group: "E", confederation: "CONCACAF" },
  { name: "Côte d'Ivoire", countryCode: "CIV", flagEmoji: "🇨🇮", group: "E", confederation: "CAF" },
  { name: "Ecuador", countryCode: "ECU", flagEmoji: "🇪🇨", group: "E", confederation: "CONMEBOL" },
  // Group F
  { name: "Netherlands", countryCode: "NED", flagEmoji: "🇳🇱", group: "F", confederation: "UEFA" },
  { name: "Japan", countryCode: "JPN", flagEmoji: "🇯🇵", group: "F", confederation: "AFC" },
  { name: "Tunisia", countryCode: "TUN", flagEmoji: "🇹🇳", group: "F", confederation: "CAF" },
  { name: "Sweden", countryCode: "SWE", flagEmoji: "🇸🇪", group: "F", confederation: "UEFA" },
  // Group G
  { name: "Belgium", countryCode: "BEL", flagEmoji: "🇧🇪", group: "G", confederation: "UEFA" },
  { name: "Egypt", countryCode: "EGY", flagEmoji: "🇪🇬", group: "G", confederation: "CAF" },
  { name: "Iran", countryCode: "IRN", flagEmoji: "🇮🇷", group: "G", confederation: "AFC" },
  { name: "New Zealand", countryCode: "NZL", flagEmoji: "🇳🇿", group: "G", confederation: "OFC" },
  // Group H
  { name: "Spain", countryCode: "ESP", flagEmoji: "🇪🇸", group: "H", confederation: "UEFA" },
  { name: "Cabo Verde", countryCode: "CPV", flagEmoji: "🇨🇻", group: "H", confederation: "CAF" },
  { name: "Saudi Arabia", countryCode: "KSA", flagEmoji: "🇸🇦", group: "H", confederation: "AFC" },
  { name: "Uruguay", countryCode: "URU", flagEmoji: "🇺🇾", group: "H", confederation: "CONMEBOL" },
  // Group I
  { name: "France", countryCode: "FRA", flagEmoji: "🇫🇷", group: "I", confederation: "UEFA" },
  { name: "Senegal", countryCode: "SEN", flagEmoji: "🇸🇳", group: "I", confederation: "CAF" },
  { name: "Iraq", countryCode: "IRQ", flagEmoji: "🇮🇶", group: "I", confederation: "AFC" },
  { name: "Norway", countryCode: "NOR", flagEmoji: "🇳🇴", group: "I", confederation: "UEFA" },
  // Group J
  { name: "Argentina", countryCode: "ARG", flagEmoji: "🇦🇷", group: "J", confederation: "CONMEBOL" },
  { name: "Algeria", countryCode: "ALG", flagEmoji: "🇩🇿", group: "J", confederation: "CAF" },
  { name: "Austria", countryCode: "AUT", flagEmoji: "🇦🇹", group: "J", confederation: "UEFA" },
  { name: "Jordan", countryCode: "JOR", flagEmoji: "🇯🇴", group: "J", confederation: "AFC" },
  // Group K
  { name: "Portugal", countryCode: "POR", flagEmoji: "🇵🇹", group: "K", confederation: "UEFA" },
  { name: "Uzbekistan", countryCode: "UZB", flagEmoji: "🇺🇿", group: "K", confederation: "AFC" },
  { name: "Colombia", countryCode: "COL", flagEmoji: "🇨🇴", group: "K", confederation: "CONMEBOL" },
  { name: "DR Congo", countryCode: "COD", flagEmoji: "🇨🇩", group: "K", confederation: "CAF" },
  // Group L
  { name: "England", countryCode: "ENG", flagEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L", confederation: "UEFA" },
  { name: "Croatia", countryCode: "CRO", flagEmoji: "🇭🇷", group: "L", confederation: "UEFA" },
  { name: "Ghana", countryCode: "GHA", flagEmoji: "🇬🇭", group: "L", confederation: "CAF" },
  { name: "Panama", countryCode: "PAN", flagEmoji: "🇵🇦", group: "L", confederation: "CONCACAF" },
] as const;

// Non-WC teams that appear in friendlies — for tracking only, not in the team picker
const FRIENDLY_ONLY_TEAMS = [
  { name: "Iceland", countryCode: "ISL", flagEmoji: "🇮🇸", group: null, confederation: "UEFA" },
  { name: "Finland", countryCode: "FIN", flagEmoji: "🇫🇮", group: null, confederation: "UEFA" },
  { name: "Serbia", countryCode: "SRB", flagEmoji: "🇷🇸", group: null, confederation: "UEFA" },
  { name: "Wales", countryCode: "WAL", flagEmoji: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", group: null, confederation: "UEFA" },
  { name: "Northern Ireland", countryCode: "NIR", flagEmoji: "🇬🇧", group: null, confederation: "UEFA" },
  { name: "Kosovo", countryCode: "KOS", flagEmoji: "🇽🇰", group: null, confederation: "UEFA" },
  { name: "Chile", countryCode: "CHI", flagEmoji: "🇨🇱", group: null, confederation: "CONMEBOL" },
  { name: "Peru", countryCode: "PER", flagEmoji: "🇵🇪", group: null, confederation: "CONMEBOL" },
  { name: "Honduras", countryCode: "HON", flagEmoji: "🇭🇳", group: null, confederation: "CONCACAF" },
  { name: "Costa Rica", countryCode: "CRC", flagEmoji: "🇨🇷", group: null, confederation: "CONCACAF" },
  { name: "Trinidad & Tobago", countryCode: "TTO", flagEmoji: "🇹🇹", group: null, confederation: "CONCACAF" },
  { name: "Nigeria", countryCode: "NGA", flagEmoji: "🇳🇬", group: null, confederation: "CAF" },
];

type MatchSeed = {
  team1Code: string;
  team2Code: string;
  datetime: string;
  venue: string;
  city: string;
  stage: "friendly" | "group" | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "third_place" | "final";
  groupName?: string;
};

// ─── Pre-Tournament Friendlies (May 30 – June 10) ────────────────────────────
// Times in UTC. EDT = UTC-4 in June.

const FRIENDLIES: MatchSeed[] = [
  // May 30
  { team1Code: "MEX", team2Code: "AUS", datetime: "2026-05-30T23:00:00Z", venue: "Estadio Azteca", city: "Mexico City", stage: "friendly" },
  // May 31
  { team1Code: "ECU", team2Code: "KSA", datetime: "2026-05-31T02:00:00Z", venue: "TBD", city: "TBD", stage: "friendly" },
  { team1Code: "KOR", team2Code: "TTO", datetime: "2026-05-31T03:00:00Z", venue: "TBD", city: "Seoul", stage: "friendly" },
  { team1Code: "JPN", team2Code: "ISL", datetime: "2026-05-31T12:25:00Z", venue: "TBD", city: "Japan", stage: "friendly" },
  { team1Code: "SUI", team2Code: "JOR", datetime: "2026-05-31T15:00:00Z", venue: "TBD", city: "Switzerland", stage: "friendly" },
  { team1Code: "CZE", team2Code: "KOS", datetime: "2026-05-31T16:00:00Z", venue: "TBD", city: "Czech Republic", stage: "friendly" },
  { team1Code: "CPV", team2Code: "SRB", datetime: "2026-05-31T17:00:00Z", venue: "TBD", city: "Cape Verde", stage: "friendly" },
  { team1Code: "GER", team2Code: "FIN", datetime: "2026-05-31T18:45:00Z", venue: "TBD", city: "Germany", stage: "friendly" },
  { team1Code: "USA", team2Code: "SEN", datetime: "2026-05-31T21:30:00Z", venue: "Bank of America Stadium", city: "Charlotte", stage: "friendly" },
  { team1Code: "BRA", team2Code: "PAN", datetime: "2026-05-31T23:30:00Z", venue: "TBD", city: "Brazil", stage: "friendly" },
  // June 1
  { team1Code: "AUT", team2Code: "TUN", datetime: "2026-06-01T18:45:00Z", venue: "TBD", city: "Austria", stage: "friendly" },
  // June 2
  { team1Code: "BEL", team2Code: "CRO", datetime: "2026-06-02T18:45:00Z", venue: "TBD", city: "Belgium", stage: "friendly" },
  { team1Code: "WAL", team2Code: "GHA", datetime: "2026-06-02T18:45:00Z", venue: "TBD", city: "Cardiff", stage: "friendly" },
  // June 3
  { team1Code: "NED", team2Code: "ALG", datetime: "2026-06-03T18:45:00Z", venue: "TBD", city: "Netherlands", stage: "friendly" },
  // June 4
  { team1Code: "FRA", team2Code: "CIV", datetime: "2026-06-04T18:45:00Z", venue: "TBD", city: "France", stage: "friendly" },
  { team1Code: "ESP", team2Code: "IRQ", datetime: "2026-06-04T20:00:00Z", venue: "TBD", city: "Spain", stage: "friendly" },
  { team1Code: "MEX", team2Code: "SRB", datetime: "2026-06-04T01:00:00Z", venue: "TBD", city: "Mexico", stage: "friendly" },
  // June 6
  { team1Code: "GER", team2Code: "USA", datetime: "2026-06-06T23:00:00Z", venue: "Soldier Field", city: "Chicago", stage: "friendly" },
  { team1Code: "ENG", team2Code: "NZL", datetime: "2026-06-06T22:00:00Z", venue: "Hard Rock Stadium", city: "Miami", stage: "friendly" },
  { team1Code: "ARG", team2Code: "HON", datetime: "2026-06-06T22:00:00Z", venue: "TBD", city: "USA", stage: "friendly" },
  { team1Code: "BRA", team2Code: "EGY", datetime: "2026-06-06T22:00:00Z", venue: "TBD", city: "USA", stage: "friendly" },
  { team1Code: "POR", team2Code: "CHI", datetime: "2026-06-06T22:00:00Z", venue: "TBD", city: "USA", stage: "friendly" },
  // June 8
  { team1Code: "FRA", team2Code: "NIR", datetime: "2026-06-08T18:45:00Z", venue: "TBD", city: "France", stage: "friendly" },
  { team1Code: "ESP", team2Code: "PER", datetime: "2026-06-08T20:00:00Z", venue: "TBD", city: "Spain", stage: "friendly" },
  // June 9
  { team1Code: "ARG", team2Code: "ISL", datetime: "2026-06-09T22:00:00Z", venue: "TBD", city: "USA", stage: "friendly" },
  // June 10
  { team1Code: "ENG", team2Code: "CRC", datetime: "2026-06-10T22:00:00Z", venue: "Hard Rock Stadium", city: "Miami", stage: "friendly" },
  { team1Code: "POR", team2Code: "NGA", datetime: "2026-06-10T22:00:00Z", venue: "TBD", city: "USA", stage: "friendly" },
];

// ─── Group Stage (June 11–27) ─────────────────────────────────────────────────
// All times UTC. EDT = UTC-4. CDT (Mexico) = UTC-5.

const GROUP_STAGE: MatchSeed[] = [
  // Group A
  { team1Code: "MEX", team2Code: "RSA", datetime: "2026-06-11T19:00:00Z", venue: "Estadio Azteca", city: "Mexico City", stage: "group", groupName: "A" },
  { team1Code: "KOR", team2Code: "CZE", datetime: "2026-06-12T02:00:00Z", venue: "Estadio Akron", city: "Guadalajara", stage: "group", groupName: "A" },
  { team1Code: "CZE", team2Code: "RSA", datetime: "2026-06-18T16:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", stage: "group", groupName: "A" },
  { team1Code: "MEX", team2Code: "KOR", datetime: "2026-06-19T01:00:00Z", venue: "Estadio Akron", city: "Guadalajara", stage: "group", groupName: "A" },
  { team1Code: "CZE", team2Code: "MEX", datetime: "2026-06-25T01:00:00Z", venue: "Estadio Azteca", city: "Mexico City", stage: "group", groupName: "A" },
  { team1Code: "RSA", team2Code: "KOR", datetime: "2026-06-25T01:00:00Z", venue: "Estadio BBVA", city: "Monterrey", stage: "group", groupName: "A" },
  // Group B
  { team1Code: "CAN", team2Code: "BIH", datetime: "2026-06-12T19:00:00Z", venue: "BMO Field", city: "Toronto", stage: "group", groupName: "B" },
  { team1Code: "QAT", team2Code: "SUI", datetime: "2026-06-12T22:00:00Z", venue: "Levi's Stadium", city: "Santa Clara", stage: "group", groupName: "B" },
  { team1Code: "SUI", team2Code: "BIH", datetime: "2026-06-18T19:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", stage: "group", groupName: "B" },
  { team1Code: "CAN", team2Code: "QAT", datetime: "2026-06-18T22:00:00Z", venue: "BC Place", city: "Vancouver", stage: "group", groupName: "B" },
  { team1Code: "SUI", team2Code: "CAN", datetime: "2026-06-24T19:00:00Z", venue: "BC Place", city: "Vancouver", stage: "group", groupName: "B" },
  { team1Code: "BIH", team2Code: "QAT", datetime: "2026-06-24T19:00:00Z", venue: "Lumen Field", city: "Seattle", stage: "group", groupName: "B" },
  // Group C
  { team1Code: "BRA", team2Code: "MAR", datetime: "2026-06-13T22:00:00Z", venue: "MetLife Stadium", city: "East Rutherford", stage: "group", groupName: "C" },
  { team1Code: "HAI", team2Code: "SCO", datetime: "2026-06-14T01:00:00Z", venue: "Gillette Stadium", city: "Foxborough", stage: "group", groupName: "C" },
  { team1Code: "SCO", team2Code: "MAR", datetime: "2026-06-19T22:00:00Z", venue: "Gillette Stadium", city: "Foxborough", stage: "group", groupName: "C" },
  { team1Code: "BRA", team2Code: "HAI", datetime: "2026-06-20T01:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", stage: "group", groupName: "C" },
  { team1Code: "SCO", team2Code: "BRA", datetime: "2026-06-24T22:00:00Z", venue: "Hard Rock Stadium", city: "Miami", stage: "group", groupName: "C" },
  { team1Code: "MAR", team2Code: "HAI", datetime: "2026-06-24T22:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", stage: "group", groupName: "C" },
  // Group D
  { team1Code: "USA", team2Code: "PAR", datetime: "2026-06-13T01:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", stage: "group", groupName: "D" },
  { team1Code: "AUS", team2Code: "TUR", datetime: "2026-06-13T04:00:00Z", venue: "BC Place", city: "Vancouver", stage: "group", groupName: "D" },
  { team1Code: "USA", team2Code: "AUS", datetime: "2026-06-19T19:00:00Z", venue: "Lumen Field", city: "Seattle", stage: "group", groupName: "D" },
  { team1Code: "TUR", team2Code: "PAR", datetime: "2026-06-20T03:00:00Z", venue: "Levi's Stadium", city: "Santa Clara", stage: "group", groupName: "D" },
  { team1Code: "TUR", team2Code: "USA", datetime: "2026-06-26T02:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", stage: "group", groupName: "D" },
  { team1Code: "PAR", team2Code: "AUS", datetime: "2026-06-26T02:00:00Z", venue: "Levi's Stadium", city: "Santa Clara", stage: "group", groupName: "D" },
  // Group E
  { team1Code: "GER", team2Code: "CUW", datetime: "2026-06-14T17:00:00Z", venue: "NRG Stadium", city: "Houston", stage: "group", groupName: "E" },
  { team1Code: "CIV", team2Code: "ECU", datetime: "2026-06-14T23:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", stage: "group", groupName: "E" },
  { team1Code: "GER", team2Code: "CIV", datetime: "2026-06-20T20:00:00Z", venue: "BMO Field", city: "Toronto", stage: "group", groupName: "E" },
  { team1Code: "ECU", team2Code: "CUW", datetime: "2026-06-21T00:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", stage: "group", groupName: "E" },
  { team1Code: "ECU", team2Code: "GER", datetime: "2026-06-25T20:00:00Z", venue: "MetLife Stadium", city: "East Rutherford", stage: "group", groupName: "E" },
  { team1Code: "CUW", team2Code: "CIV", datetime: "2026-06-25T20:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", stage: "group", groupName: "E" },
  // Group F
  { team1Code: "NED", team2Code: "JPN", datetime: "2026-06-14T20:00:00Z", venue: "AT&T Stadium", city: "Arlington", stage: "group", groupName: "F" },
  { team1Code: "SWE", team2Code: "TUN", datetime: "2026-06-15T02:00:00Z", venue: "Estadio Akron", city: "Guadalajara", stage: "group", groupName: "F" },
  { team1Code: "NED", team2Code: "SWE", datetime: "2026-06-20T17:00:00Z", venue: "NRG Stadium", city: "Houston", stage: "group", groupName: "F" },
  { team1Code: "TUN", team2Code: "JPN", datetime: "2026-06-21T04:00:00Z", venue: "Estadio Akron", city: "Guadalajara", stage: "group", groupName: "F" },
  { team1Code: "JPN", team2Code: "SWE", datetime: "2026-06-25T23:00:00Z", venue: "AT&T Stadium", city: "Arlington", stage: "group", groupName: "F" },
  { team1Code: "TUN", team2Code: "NED", datetime: "2026-06-25T23:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", stage: "group", groupName: "F" },
  // Group G
  { team1Code: "BEL", team2Code: "EGY", datetime: "2026-06-15T22:00:00Z", venue: "Lumen Field", city: "Seattle", stage: "group", groupName: "G" },
  { team1Code: "IRN", team2Code: "NZL", datetime: "2026-06-16T04:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", stage: "group", groupName: "G" },
  { team1Code: "BEL", team2Code: "IRN", datetime: "2026-06-21T19:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", stage: "group", groupName: "G" },
  { team1Code: "NZL", team2Code: "EGY", datetime: "2026-06-22T01:00:00Z", venue: "BC Place", city: "Vancouver", stage: "group", groupName: "G" },
  { team1Code: "EGY", team2Code: "IRN", datetime: "2026-06-27T03:00:00Z", venue: "Lumen Field", city: "Seattle", stage: "group", groupName: "G" },
  { team1Code: "NZL", team2Code: "BEL", datetime: "2026-06-27T03:00:00Z", venue: "BC Place", city: "Vancouver", stage: "group", groupName: "G" },
  // Group H
  { team1Code: "ESP", team2Code: "CPV", datetime: "2026-06-15T16:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", stage: "group", groupName: "H" },
  { team1Code: "KSA", team2Code: "URU", datetime: "2026-06-15T22:00:00Z", venue: "Hard Rock Stadium", city: "Miami", stage: "group", groupName: "H" },
  { team1Code: "ESP", team2Code: "KSA", datetime: "2026-06-21T16:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", stage: "group", groupName: "H" },
  { team1Code: "URU", team2Code: "CPV", datetime: "2026-06-21T22:00:00Z", venue: "Hard Rock Stadium", city: "Miami", stage: "group", groupName: "H" },
  { team1Code: "CPV", team2Code: "KSA", datetime: "2026-06-27T00:00:00Z", venue: "NRG Stadium", city: "Houston", stage: "group", groupName: "H" },
  { team1Code: "URU", team2Code: "ESP", datetime: "2026-06-27T00:00:00Z", venue: "Estadio Akron", city: "Guadalajara", stage: "group", groupName: "H" },
  // Group I
  { team1Code: "FRA", team2Code: "SEN", datetime: "2026-06-16T19:00:00Z", venue: "MetLife Stadium", city: "East Rutherford", stage: "group", groupName: "I" },
  { team1Code: "IRQ", team2Code: "NOR", datetime: "2026-06-16T22:00:00Z", venue: "Gillette Stadium", city: "Foxborough", stage: "group", groupName: "I" },
  { team1Code: "FRA", team2Code: "IRQ", datetime: "2026-06-22T21:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", stage: "group", groupName: "I" },
  { team1Code: "NOR", team2Code: "SEN", datetime: "2026-06-23T00:00:00Z", venue: "MetLife Stadium", city: "East Rutherford", stage: "group", groupName: "I" },
  { team1Code: "NOR", team2Code: "FRA", datetime: "2026-06-26T19:00:00Z", venue: "Gillette Stadium", city: "Foxborough", stage: "group", groupName: "I" },
  { team1Code: "SEN", team2Code: "IRQ", datetime: "2026-06-26T19:00:00Z", venue: "BMO Field", city: "Toronto", stage: "group", groupName: "I" },
  // Group J
  { team1Code: "ARG", team2Code: "ALG", datetime: "2026-06-17T01:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", stage: "group", groupName: "J" },
  { team1Code: "AUT", team2Code: "JOR", datetime: "2026-06-17T04:00:00Z", venue: "Levi's Stadium", city: "Santa Clara", stage: "group", groupName: "J" },
  { team1Code: "ARG", team2Code: "AUT", datetime: "2026-06-22T17:00:00Z", venue: "AT&T Stadium", city: "Arlington", stage: "group", groupName: "J" },
  { team1Code: "JOR", team2Code: "ALG", datetime: "2026-06-23T03:00:00Z", venue: "Levi's Stadium", city: "Santa Clara", stage: "group", groupName: "J" },
  { team1Code: "JOR", team2Code: "ARG", datetime: "2026-06-28T02:00:00Z", venue: "AT&T Stadium", city: "Arlington", stage: "group", groupName: "J" },
  { team1Code: "ALG", team2Code: "AUT", datetime: "2026-06-28T02:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", stage: "group", groupName: "J" },
  // Group K
  { team1Code: "POR", team2Code: "COD", datetime: "2026-06-17T17:00:00Z", venue: "NRG Stadium", city: "Houston", stage: "group", groupName: "K" },
  { team1Code: "UZB", team2Code: "COL", datetime: "2026-06-18T02:00:00Z", venue: "Estadio Azteca", city: "Mexico City", stage: "group", groupName: "K" },
  { team1Code: "POR", team2Code: "UZB", datetime: "2026-06-23T17:00:00Z", venue: "NRG Stadium", city: "Houston", stage: "group", groupName: "K" },
  { team1Code: "COL", team2Code: "COD", datetime: "2026-06-24T02:00:00Z", venue: "Estadio Akron", city: "Guadalajara", stage: "group", groupName: "K" },
  { team1Code: "COL", team2Code: "POR", datetime: "2026-06-27T23:30:00Z", venue: "Hard Rock Stadium", city: "Miami", stage: "group", groupName: "K" },
  { team1Code: "COD", team2Code: "UZB", datetime: "2026-06-27T23:30:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", stage: "group", groupName: "K" },
  // Group L
  { team1Code: "ENG", team2Code: "CRO", datetime: "2026-06-17T20:00:00Z", venue: "AT&T Stadium", city: "Arlington", stage: "group", groupName: "L" },
  { team1Code: "GHA", team2Code: "PAN", datetime: "2026-06-17T23:00:00Z", venue: "BMO Field", city: "Toronto", stage: "group", groupName: "L" },
  { team1Code: "ENG", team2Code: "GHA", datetime: "2026-06-23T20:00:00Z", venue: "Gillette Stadium", city: "Foxborough", stage: "group", groupName: "L" },
  { team1Code: "PAN", team2Code: "CRO", datetime: "2026-06-23T23:00:00Z", venue: "BMO Field", city: "Toronto", stage: "group", groupName: "L" },
  { team1Code: "ENG", team2Code: "PAN", datetime: "2026-06-27T21:00:00Z", venue: "MetLife Stadium", city: "East Rutherford", stage: "group", groupName: "L" },
  { team1Code: "CRO", team2Code: "GHA", datetime: "2026-06-27T21:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", stage: "group", groupName: "L" },
];

async function seed() {
  console.log("🌱 Seeding teams...");

  const insertedTeams: Record<string, string> = {};
  const allTeams = [...TEAMS, ...FRIENDLY_ONLY_TEAMS];

  for (const team of allTeams) {
    const [existing] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.countryCode, team.countryCode))
      .limit(1);

    if (existing) {
      insertedTeams[team.countryCode] = existing.id;
      console.log(`  ↳ ${team.flagEmoji} ${team.name} already exists`);
    } else {
      const [inserted] = await db
        .insert(teams)
        .values({
          name: team.name,
          countryCode: team.countryCode,
          flagEmoji: team.flagEmoji,
          group: team.group,
          confederation: team.confederation,
        })
        .returning({ id: teams.id });
      insertedTeams[team.countryCode] = inserted.id;
      console.log(`  ✓ ${team.flagEmoji} ${team.name}`);
    }
  }

  console.log(`\n✅ Teams: ${Object.keys(insertedTeams).length} ready`);
  console.log("\n🌱 Seeding matches...");

  const allMatches = [...FRIENDLIES, ...GROUP_STAGE];
  let seeded = 0;
  let skipped = 0;

  for (const m of allMatches) {
    const team1Id = insertedTeams[m.team1Code];
    const team2Id = insertedTeams[m.team2Code];

    if (!team1Id || !team2Id) {
      console.log(`  ⚠ Skipping ${m.team1Code} vs ${m.team2Code} — team not in DB`);
      skipped++;
      continue;
    }

    await db
      .insert(matches)
      .values({
        team1Id,
        team2Id,
        matchDatetime: new Date(m.datetime),
        venue: m.venue,
        city: m.city,
        stage: m.stage,
        groupName: m.groupName ?? null,
        status: "upcoming",
      })
      .onConflictDoNothing();

    seeded++;
  }

  console.log(`✅ Matches: ${seeded} inserted, ${skipped} skipped`);
  console.log("\n🏆 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
