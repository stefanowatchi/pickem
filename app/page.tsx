import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { PickButtons } from "@/app/pick-buttons";
import { LEAGUES, leagueFromSlug, type League } from "@/lib/leagues";
import { syncOddsIfStale } from "@/lib/odds";
import { createClient } from "@/lib/supabase/server";

type Game = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_price: number | null;
  away_price: number | null;
  bookmaker: string | null;
};

type Pick = { game_id: string; picked_team: string; odds_at_pick: number };

const TIME_ZONE = "America/New_York";
const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

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
      .select("id, commence_time, home_team, away_team, home_price, away_price, bookmaker")
      .eq("sport_key", league.key)
      .gte("commence_time", from)
      .order("commence_time")
      .limit(300)
      .returns<Game[]>(),
    supabase
      .from("picks")
      .select("game_id, picked_team, odds_at_pick")
      .eq("user_id", userId)
      .returns<Pick[]>(),
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

  await syncOddsIfStale(league.key);

  const { games, picks, error, now } = await loadGamesAndPicks(
    supabase,
    user.id,
    league,
  );

  const pickByGame = new Map((picks ?? []).map((pick) => [pick.game_id, pick]));
  const picksShown = (games ?? []).filter((game) => pickByGame.has(game.id)).length;

  const days = new Map<string, Game[]>();
  for (const game of games ?? []) {
    const day = dayFormat.format(new Date(game.commence_time));
    days.set(day, [...(days.get(day) ?? []), game]);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="flex items-center justify-between gap-4 border-b border-foreground/10 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Pick&apos;em</h1>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="truncate text-foreground/60">{user.email}</span>
          <form action={signOut} className="shrink-0">
            <button className="whitespace-nowrap rounded-md border border-foreground/20 px-3 py-1.5 font-medium hover:border-foreground/50">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="py-6">
        <nav aria-label="Leagues" className="flex gap-2 overflow-x-auto">
          {LEAGUES.map((item) => {
            const active = item.slug === league.slug;
            return (
              <Link
                key={item.slug}
                href={item.slug === LEAGUES[0].slug ? "/" : `/?league=${item.slug}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/20 hover:border-foreground/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{league.label} games</h2>
          <p className="text-sm text-foreground/60">
            {picksShown} {picksShown === 1 ? "pick" : "picks"} made
          </p>
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          Tap a team to pick it. Tap it again to remove the pick. Picks lock
          when the game starts. Times are Eastern.
        </p>

        {error && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            Could not load games. Please refresh and try again.
          </p>
        )}

        {!error && days.size === 0 && (
          <p className="mt-6 text-sm text-foreground/60">
            No {league.label} games with odds right now. Check back soon.
          </p>
        )}

        {[...days].map(([day, dayGames]) => (
          <section key={day} className="mt-6">
            <h3 className="text-sm font-medium text-foreground/60">{day}</h3>
            <ul className="mt-2 space-y-3">
              {dayGames.map((game) => {
                const pick = pickByGame.get(game.id);
                const locked = Date.parse(game.commence_time) <= now;
                return (
                  <li
                    key={game.id}
                    className="rounded-lg border border-foreground/10 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-foreground/60">
                      <span>{timeFormat.format(new Date(game.commence_time))}</span>
                      <span>
                        {locked ? "Locked" : (game.bookmaker ?? "Odds pending")}
                      </span>
                    </div>
                    <PickButtons
                      gameId={game.id}
                      away={{ team: game.away_team, price: game.away_price }}
                      home={{ team: game.home_team, price: game.home_price }}
                      pickedTeam={pick?.picked_team ?? null}
                      oddsAtPick={pick?.odds_at_pick ?? null}
                      locked={locked}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
