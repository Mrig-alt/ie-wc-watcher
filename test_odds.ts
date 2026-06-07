async function main() {
  const apiKey = process.env.ODDS_API_KEY;
  const fallbackUrl = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
  const res = await fetch(fallbackUrl);
  const data = await res.json();
  console.log("The Odds API returned matches:", data.map((d: any) => `${d.home_team} vs ${d.away_team}`));
}

main().catch(console.error);
