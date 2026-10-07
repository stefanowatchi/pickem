// The leagues the app covers. `key` is The Odds API's name for the league.
// Adding a league here is all it takes for it to appear as a tab.
export const LEAGUES = [
  { slug: "nfl", key: "americanfootball_nfl", label: "NFL", daysAhead: 8 },
  { slug: "nba", key: "basketball_nba", label: "NBA", daysAhead: 4 },
  { slug: "mlb", key: "baseball_mlb", label: "MLB", daysAhead: 4 },
  { slug: "nhl", key: "icehockey_nhl", label: "NHL", daysAhead: 4 },
] as const;

export type League = (typeof LEAGUES)[number];

export function leagueFromSlug(slug: string | string[] | undefined): League {
  return LEAGUES.find((league) => league.slug === slug) ?? LEAGUES[0];
}
