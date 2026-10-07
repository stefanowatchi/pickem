import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// The free plan has 500 credits a month and each fetch costs 1. With four
// leagues, every 6 hours is at most 16 fetches a day if every tab stays busy.
const STALE_MS = 6 * 60 * 60 * 1000; // refetch a league's odds at most every 6 hours
const RETRY_MS = 10 * 60 * 1000; // after a failed fetch, wait 10 minutes
const LOW_CREDITS = 100; // below this, refetch each league only once a day
const LOW_CREDITS_STALE_MS = 24 * 60 * 60 * 1000;
const PREFERRED_BOOKMAKER = "draftkings";

type OddsEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number }[];
    }[];
  }[];
};

// Fetches odds from The Odds API and saves them, unless they were fetched
// recently. Never throws: on any failure the page shows the stored odds.
export async function syncOddsIfStale(sportKey: string) {
  try {
    const admin = createAdminClient();

    const { data: syncs } = await admin
      .from("odds_sync")
      .select("sport_key, last_synced_at, credits_remaining")
      .order("last_synced_at", { ascending: false });

    const sync = syncs?.find((row) => row.sport_key === sportKey);
    // Credits are shared by all leagues, so use the most recent reading.
    const credits: number | null =
      syncs?.find((row) => row.credits_remaining !== null)?.credits_remaining ?? null;
    const staleAfter =
      credits !== null && credits < LOW_CREDITS ? LOW_CREDITS_STALE_MS : STALE_MS;
    if (sync && Date.now() - Date.parse(sync.last_synced_at) < staleAfter) {
      return;
    }

    // Record the attempt first so simultaneous page loads don't all fetch.
    await admin.from("odds_sync").upsert({
      sport_key: sportKey,
      last_synced_at: new Date().toISOString(),
      credits_remaining: credits,
    });

    const params = new URLSearchParams({
      apiKey: process.env.ODDS_API_KEY!,
      regions: "us",
      markets: "h2h",
      oddsFormat: "american",
    });
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?${params}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      console.error(`Odds fetch failed with status ${res.status}`);
      await admin.from("odds_sync").upsert({
        sport_key: sportKey,
        last_synced_at: new Date(Date.now() - staleAfter + RETRY_MS).toISOString(),
        credits_remaining: credits,
      });
      return;
    }

    const events: OddsEvent[] = await res.json();
    const now = Date.now();
    const fetchedAt = new Date().toISOString();

    // Skip games that have started, so the stored odds stay the pre-game odds.
    const rows = events
      .filter((event) => Date.parse(event.commence_time) > now)
      .map((event) => {
        const book =
          event.bookmakers.find((b) => b.key === PREFERRED_BOOKMAKER) ??
          event.bookmakers[0];
        const outcomes =
          book?.markets.find((m) => m.key === "h2h")?.outcomes ?? [];
        const priceFor = (team: string) =>
          outcomes.find((o) => o.name === team)?.price ?? null;

        return {
          id: event.id,
          sport_key: event.sport_key,
          commence_time: event.commence_time,
          home_team: event.home_team,
          away_team: event.away_team,
          home_price: priceFor(event.home_team),
          away_price: priceFor(event.away_team),
          bookmaker: book?.title ?? null,
          odds_updated_at: fetchedAt,
        };
      });

    if (rows.length > 0) {
      const { error } = await admin.from("games").upsert(rows);
      if (error) console.error("Saving games failed:", error.message);
    }

    const remaining = Number(res.headers.get("x-requests-remaining"));
    await admin.from("odds_sync").upsert({
      sport_key: sportKey,
      last_synced_at: fetchedAt,
      credits_remaining: Number.isFinite(remaining) ? remaining : credits,
    });
  } catch (error) {
    console.error(
      "Odds sync failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}
