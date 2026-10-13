// The game's rules in one place, so the pages that explain them and the pages
// that apply them can't drift apart. The points formula itself lives in the
// database: see pick_points in supabase/migrations/0003_scoring.sql.

// Finished picks a player needs in a period (week or season) to be ranked.
export const MIN_PICKS_TO_RANK = 3;

// Every pick is a pretend stake of this many points.
export const STAKE = 100;
