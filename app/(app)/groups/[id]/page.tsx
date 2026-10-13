import Link from "next/link";
import { notFound } from "next/navigation";
import { leaveGroup, removeMember } from "@/app/actions";
import { formatPoints, weekStart } from "@/lib/format";
import { syncPendingScores } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A player needs this many graded picks in the period to be ranked, so one
// lucky pick followed by sitting out can't top the board.
const MIN_PICKS_TO_RANK = 3;

type Standing = {
  user_id: string;
  display_name: string;
  graded: number;
  wins: number;
  losses: number;
  in_progress: number;
  points: number;
};

async function loadStandings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  period: "week" | "season",
) {
  const since = period === "week" ? weekStart(Date.now()).toISOString() : null;
  const { data, error } = await supabase
    .rpc("group_leaderboard", { target_group: groupId, since })
    .returns<Standing[]>();
  return { standings: Array.isArray(data) ? data : [], error };
}

export default async function GroupPage({
  params,
  searchParams,
}: PageProps<"/groups/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const period = (await searchParams).period === "season" ? "season" : "week";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Database rules return nothing here unless the signed-in user is a member.
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, code, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  await syncPendingScores();
  const { standings, error } = await loadStandings(supabase, id, period);

  const perPick = (row: Standing) => (row.graded > 0 ? row.points / row.graded : 0);
  const ranked = standings
    .filter((row) => row.graded >= MIN_PICKS_TO_RANK)
    .sort((a, b) => b.points - a.points || perPick(b) - perPick(a));
  const unranked = standings
    .filter((row) => row.graded < MIN_PICKS_TO_RANK)
    .sort((a, b) => b.graded - a.graded || a.display_name.localeCompare(b.display_name));
  const isOwner = group.created_by === user?.id;

  return (
    <main className="py-6">
      <Link href="/groups" className="label hover:!text-foreground">
        ← All groups
      </Link>
      <div className="mt-3 flex items-end justify-between gap-4">
        <h2 className="display truncate text-4xl">{group.name}</h2>
        <div className="shrink-0 text-right">
          <p className="label">Group code</p>
          <p className="font-mono text-lg font-bold tracking-[0.25em] text-accent">
            {group.code}
          </p>
        </div>
      </div>

      <nav aria-label="Period" className="mt-6 flex gap-2">
        {(["week", "season"] as const).map((item) => (
          <Link
            key={item}
            href={item === "week" ? `/groups/${id}` : `/groups/${id}?period=season`}
            aria-current={period === item ? "page" : undefined}
            className={`rounded-md border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
              period === item
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-muted hover:border-muted hover:text-foreground"
            }`}
          >
            {item === "week" ? "This week" : "Season"}
          </Link>
        ))}
      </nav>

      {error && (
        <p role="alert" className="mt-6 text-sm text-loss">
          Could not load the leaderboard. Please refresh and try again.
        </p>
      )}

      <section className="card mt-4 overflow-hidden">
        <div className="label grid grid-cols-[2.5rem_1fr_4rem_4.5rem] gap-2 border-b border-line px-3 py-2 sm:grid-cols-[2.5rem_1fr_4rem_4rem_4.5rem]">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">W-L</span>
          <span className="hidden text-right sm:block">Per pick</span>
          <span className="text-right">Points</span>
        </div>

        {ranked.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted">
            Nobody is ranked yet. It takes {MIN_PICKS_TO_RANK} finished picks{" "}
            {period === "week" ? "this week" : "this season"}.
          </p>
        )}

        <ol>
          {ranked.map((row, index) => (
            <li
              key={row.user_id}
              className={`grid grid-cols-[2.5rem_1fr_4rem_4.5rem] items-center gap-2 border-b border-line px-3 py-3 last:border-b-0 sm:grid-cols-[2.5rem_1fr_4rem_4rem_4.5rem] ${
                row.user_id === user?.id ? "bg-accent/5" : ""
              }`}
            >
              <span
                className={`display text-2xl ${index === 0 ? "text-accent" : "text-muted"}`}
              >
                {index + 1}
              </span>
              <Link
                href={`/players/${row.user_id}`}
                className="truncate font-semibold hover:text-accent"
              >
                {row.display_name}
                {row.user_id === user?.id && (
                  <span className="label ml-2">You</span>
                )}
              </Link>
              <span className="text-right font-mono text-sm tabular-nums text-muted">
                {row.wins}-{row.losses}
              </span>
              <span className="hidden text-right font-mono text-sm tabular-nums text-muted sm:block">
                {formatPoints(perPick(row))}
              </span>
              <span
                className={`text-right font-mono text-base font-bold tabular-nums ${
                  row.points > 0 ? "text-win" : row.points < 0 ? "text-loss" : ""
                }`}
              >
                {formatPoints(row.points)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {unranked.length > 0 && (
        <section className="mt-6">
          <h3 className="label">Not ranked yet</h3>
          <ul className="card mt-2 divide-y divide-line">
            {unranked.map((row) => (
              <li
                key={row.user_id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <Link
                  href={`/players/${row.user_id}`}
                  className="truncate font-semibold hover:text-accent"
                >
                  {row.display_name}
                  {row.user_id === user?.id && <span className="label ml-2">You</span>}
                </Link>
                <span className="shrink-0 text-muted">
                  {row.graded} of {MIN_PICKS_TO_RANK} finished picks
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 text-sm text-muted">
        <h3 className="label">How scoring works</h3>
        <p className="mt-2">
          Every pick is a pretend 100-point stake at the closing odds. A win
          pays what the odds say (+380 wins 380, -500 wins 20). A loss costs
          100. Everyone who picks the same team gets the same odds.
        </p>
      </section>

      {isOwner && standings.length > 1 && (
        <details className="mt-6">
          <summary className="label cursor-pointer hover:!text-foreground">
            Manage members
          </summary>
          <ul className="card mt-2 divide-y divide-line">
            {standings
              .filter((row) => row.user_id !== user?.id)
              .map((row) => (
                <li
                  key={row.user_id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="truncate font-semibold">{row.display_name}</span>
                  <form action={removeMember}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="userId" value={row.user_id} />
                    <button className="btn-ghost">Remove</button>
                  </form>
                </li>
              ))}
          </ul>
        </details>
      )}

      <form action={leaveGroup} className="mt-8">
        <input type="hidden" name="groupId" value={group.id} />
        <button className="text-sm text-loss hover:underline">
          Leave this group
        </button>
      </form>
    </main>
  );
}
