import Link from "next/link";
import { redirect } from "next/navigation";
import { PickButtons } from "@/app/pick-buttons";
import { dayFormat, timeFormat, type Outcome } from "@/lib/format";
import { LEAGUES, leagueFromSlug, type League } from "@/lib/leagues";
import { syncOddsIfStale } from "@/lib/odds";
import { syncPendingScores } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

type Game = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_price: number | null;
  away_price: number | null;
  home_score: number | null;
  away_score: number | null;
  completed: boolean;
};

type ScoredPick = {
  game_id: string;
  picked_team: string;
  outcome: Outcome;
  points: number;
};

async function loadGamesAndPicks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  league: League,
) {
  const now = Date.now();
  const from = new Date(now - 12 * 60 * 60 * 1000).toISOString();

  const [{ data: allGames, error }, { data: picks }] = await Promise.all([
    supabase
      .from("games")
      .select(
        "id, commence_time, home_team, away_team, home_price, away_price, home_score, away_score, completed",
      )
      .eq("sport_key", league.key)
      .gte("commence_time", from)
      .order("commence_time")
      .limit(300)
      .returns<Game[]>(),
    supabase
      .from("scored_picks")
      .select("game_id, picked_team, outcome, points")
      .eq("user_id", userId)
      .eq("sport_key", league.key)
      .gte("commence_time", from)
      .returns<ScoredPick[]>(),
  ]);

  // Show games that started in the last 12 hours, plus the league's window of
  // upcoming days. If the season hasn't started, show its first two days instead.
  const dayMs = 24 * 60 * 60 * 1000;
  const firstUpcoming = (allGames ?? [])
    .map((game) => Date.parse(game.commence_time))
    .find((time) => time > now);
  const windowEnd = Math.max(
    now + league.daysAhead * dayMs,
    (firstUpcoming ?? 0) + 2 * dayMs,
  );
  const games = (allGames ?? []).filter(
    (game) => Date.parse(game.commence_time) <= windowEnd,
  );

  return { games, picks, error, now };
}

export default async function GamesPage({ searchParams }: PageProps<"/">) {
  const league = leagueFromSlug((await searchParams).league);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await Promise.all([syncOddsIfStale(league.key), syncPendingScores()]);

  const { games, picks, error, now } = await loadGamesAndPicks(
    supabase,
    user.id,
    league,
  );

  const pickByGame = new Map((picks ?? []).map((pick) => [pick.game_id, pick]));
  const picksShown = games.filter((game) => pickByGame.has(game.id)).length;

  const days = new Map<string, Game[]>();
  for (const game of games) {
    const day = dayFormat.format(new Date(game.commence_time));
    days.set(day, [...(days.get(day) ?? []), game]);
  }

  return (
    <main className="py-6">
      <nav aria-label="Leagues" className="flex gap-2 overflow-x-auto pb-1">
        {LEAGUES.map((item) => {
          const active = item.slug === league.slug;
          return (
            <Link
              key={item.slug}
              href={item.slug === LEAGUES[0].slug ? "/" : `/?league=${item.slug}`}
              aria-current={active ? "page" : undefined}
              className={`display rounded-md border px-5 py-2 text-lg transition-colors ${
                active
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-surface text-muted hover:border-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex items-end justify-between gap-4">
        <h2 className="display text-3xl">{league.label} slate</h2>
        <p className="label">
          <span className="font-mono text-sm text-accent">{picksShown}</span>{" "}
          {picksShown === 1 ? "pick" : "picks"} in
        </p>
      </div>
      <p className="mt-2 text-sm text-muted">
        Tap a team to pick it, tap again to drop it. Picks lock at game time and
        are scored at the closing odds, so the number you see can still move.
        Times are Eastern.
      </p>

      {error && (
        <p role="alert" className="mt-6 text-sm text-loss">
          Could not load games. Please refresh and try again.
        </p>
      )}

      {!error && days.size === 0 && (
        <p className="card mt-6 p-6 text-center text-sm text-muted">
          No {league.label} games with odds right now. Check back soon.
        </p>
      )}

      {[...days].map(([day, dayGames]) => (
        <section key={day} className="mt-8">
          <h3 className="label flex items-center gap-3">
            {day}
            <span className="h-px flex-1 bg-line" />
          </h3>
          <ul className="mt-3 space-y-3">
            {dayGames.map((game) => {
              const pick = pickByGame.get(game.id);
              const locked = Date.parse(game.commence_time) <= now;
              return (
                <li key={game.id} className="card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">
                      {timeFormat.format(new Date(game.commence_time))}
                    </span>
                    <span
                      className={`label ${
                        game.completed
                          ? ""
                          : locked
                            ? "!text-accent"
                            : pick
                              ? "!text-accent"
                              : ""
                      }`}
                    >
                      {game.completed
                        ? "Final"
                        : locked
                          ? "In progress · locked"
                          : pick
                            ? "Picked"
                            : "Open"}
                    </span>
                  </div>
                  <PickButtons
                    gameId={game.id}
                    away={{
                      team: game.away_team,
                      price: game.away_price,
                      score: game.completed ? game.away_score : null,
                    }}
                    home={{
                      team: game.home_team,
                      price: game.home_price,
                      score: game.completed ? game.home_score : null,
                    }}
                    pickedTeam={pick?.picked_team ?? null}
                    locked={locked}
                    outcome={pick?.outcome ?? null}
                    points={pick?.points ?? null}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
