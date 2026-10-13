import { syncPendingScores } from "@/lib/scores";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Called once a day by Vercel (see vercel.json). Supabase pauses free projects
// after 7 days without activity, and this small read counts as activity.
// It also collects any final scores that are waiting, because The Odds API
// only keeps results for 3 days. That step is throttled, and this route
// returns no data, so it is safe to leave open.
export async function GET() {
  const { error } = await createAdminClient()
    .from("odds_sync")
    .select("sport_key")
    .limit(1);

  if (error) {
    console.error("Keepalive failed:", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }
  await syncPendingScores();
  return Response.json({ ok: true });
}
