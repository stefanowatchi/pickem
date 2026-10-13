import { notFound } from "next/navigation";
import {
  formatOdds,
  formatPoints,
  leagueLabel,
  shortDayFormat,
  type Outcome,
} from "@/lib/format";
import { syncPendingScores } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ScoredPick = {
  id: string;
  picked_team: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  odds: number | null;
  outcome: Outcome;
  points: number;
};

const RESULTS_KEPT_MS = 3 * 24 * 60 * 60 * 1000;

function outcomeLabel(pick: ScoredPick, now: number) {
  if (pick.outcome === "won") return "Won";
  if (pick.outcome === "lost") return "Lost";
  if (pick.outcome === "tie") return "Tie";
  const start = Date.parse(pick.commence_time);
  if (start > now) return "Upcoming";
  // Results are only kept for 3 days, so an older game that never got one
  // (postponed or cancelled) is void and scores nothing.
  return now - start > RESULTS_KEPT_MS ? "No result" : "In progress";
}

async function loadPicks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  playerId: string,
) {
  // Database rules decide what comes back: all of your own picks, or another
  // player's picks only for games that have started and only if you share a group.
  const { data: picks, error } = await supabase
    .from("scored_picks")
    .select(
      "id, picked_team, sport_key, commence_time, home_team, away_team, home_score, away_score, odds, outcome, points",
    )
    .eq("user_id", playerId)
    .order("commence_time", { ascending: false })
    .limit(200)
    .returns<ScoredPick[]>();
  return { picks, error, now: Date.now() };
}

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  await syncPendingScores();

  const { picks, error, now } = await loadPicks(supabase, id);

  const isMe = id === user?.id;
  const graded = (picks ?? []).filter((pick) => pick.outcome !== "pending");
  const wins = graded.filter((pick) => pick.outcome === "won").length;
  const losses = graded.filter((pick) => pick.outcome === "lost").length;
  const total = graded.reduce((sum, pick) => sum + Number(pick.points), 0);

  const stats = [
    { label: "Points", value: formatPoints(total), tone: total > 0 ? "text-win" : total < 0 ? "text-loss" : "" },
    { label: "Record", value: `${wins}-${losses}`, tone: "" },
    { label: "Per pick", value: formatPoints(graded.length ? total / graded.length : 0), tone: "" },
  ];

  return (
    <main className="py-6">
      <p className="label">{isMe ? "Your picks" : "Player"}</p>
      <h2 className="display mt-1 truncate text-4xl">{profile.display_name}</h2>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-3">
            <dt className="label">{stat.label}</dt>
            <dd className={`mt-1 font-mono text-xl font-bold tabular-nums ${stat.tone}`}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {error && (
        <p role="alert" className="mt-6 text-sm text-loss">
          Could not load picks. Please refresh and try again.
        </p>
      )}

      {!error && (picks ?? []).length === 0 && (
        <p className="card mt-6 p-6 text-center text-sm text-muted">
          {isMe
            ? "You haven't made any picks yet. Head to Games to get started."
            : "No picks to show. Picks appear here once their games start."}
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {(picks ?? []).map((pick) => {
          const final = pick.home_score !== null && pick.away_score !== null;
          const tone =
            pick.outcome === "won"
              ? "text-win"
              : pick.outcome === "lost"
                ? "text-loss"
                : "text-muted";
          return (
            <li key={pick.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="label">
                  {leagueLabel(pick.sport_key)} ·{" "}
                  {shortDayFormat.format(new Date(pick.commence_time))}
                </p>
                <p className="mt-1 truncate font-semibold">
                  {pick.picked_team}{" "}
                  <span className="font-mono text-sm font-normal text-muted">
                    {formatOdds(pick.odds)}
                  </span>
                </p>
                <p className="truncate text-xs text-muted">
                  {pick.away_team}
                  {final ? ` ${pick.away_score}` : ""} @ {pick.home_team}
                  {final ? ` ${pick.home_score}` : ""}
                </p>
              </div>
              <div className={`shrink-0 text-right ${tone}`}>
                <p className="label !text-current">{outcomeLabel(pick, now)}</p>
                <p className="font-mono text-lg font-bold tabular-nums">
                  {pick.outcome === "pending" ? "–" : formatPoints(Number(pick.points))}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
