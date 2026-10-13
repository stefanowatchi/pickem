import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const LIKELY_FINISHED_MS = 3.5 * 60 * 60 * 1000; // a game that started this long ago is probably over
const RESULTS_KEPT_MS = 3 * 24 * 60 * 60 * 1000; // The Odds API only keeps results for 3 days
const THROTTLE_MS = 3 * 60 * 60 * 1000; // fetch a league's results at most every 3 hours
const LOW_CREDITS = 100; // below this, fetch each league's results only twice a day
const LOW_CREDITS_THROTTLE_MS = 12 * 60 * 60 * 1000;

type ScoreEvent = {
  id: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
};

// Fetches final scores for every league that has a finished game without a
// result yet, and saves them. Each fetch costs 2 API credits, so it is
// throttled per league. Never throws: on failure, results arrive on a later try.
export async function syncPendingScores() {
  try {
    const admin = createAdminClient();
    const now = Date.now();

    const { data: pending } = await admin
      .from("games")
      .select("sport_key")
      .eq("completed", false)
      .lt("commence_time", new Date(now - LIKELY_FINISHED_MS).toISOString())
      .gt("commence_time", new Date(now - RESULTS_KEPT_MS).toISOString());

    const sportKeys = [...new Set((pending ?? []).map((game) => game.sport_key))];
    if (sportKeys.length === 0) return;

    const { data: syncs } = await admin
      .from("odds_sync")
      .select("sport_key, scores_synced_at, credits_remaining");
    const credits = Math.min(
      ...(syncs ?? []).map((row) => row.credits_remaining ?? Infinity),
    );
    const throttle = credits < LOW_CREDITS ? LOW_CREDITS_THROTTLE_MS : THROTTLE_MS;

    for (const sportKey of sportKeys) {
      const last = syncs?.find((row) => row.sport_key === sportKey)?.scores_synced_at;
      if (last && now - Date.parse(last) < throttle) continue;

      // Record the attempt first so simultaneous page loads don't all fetch.
      await admin
        .from("odds_sync")
        .update({ scores_synced_at: new Date().toISOString() })
        .eq("sport_key", sportKey);

      const params = new URLSearchParams({
        apiKey: process.env.ODDS_API_KEY!,
        daysFrom: "3",
      });
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/scores?${params}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        console.error(`Scores fetch failed with status ${res.status}`);
        continue;
      }

      const events: ScoreEvent[] = await res.json();
      for (const event of events) {
        if (!event.completed || !event.scores) continue;

        const scoreFor = (team: string) =>
          Number(event.scores?.find((score) => score.name === team)?.score);
        const home = scoreFor(event.home_team);
        const away = scoreFor(event.away_team);
        if (!Number.isFinite(home) || !Number.isFinite(away)) continue;

        const { error } = await admin
          .from("games")
          .update({
            home_score: home,
            away_score: away,
            completed: true,
            winner:
              home > away ? event.home_team : away > home ? event.away_team : null,
          })
          .eq("id", event.id)
          .eq("completed", false);
        if (error) console.error("Saving a result failed:", error.message);
      }

      const remaining = Number(res.headers.get("x-requests-remaining"));
      if (Number.isFinite(remaining)) {
        await admin
          .from("odds_sync")
          .update({ credits_remaining: remaining })
          .eq("sport_key", sportKey);
      }
    }
  } catch (error) {
    console.error(
      "Scores sync failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}
