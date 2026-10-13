// Runs before every build (see "prebuild" in package.json), including on Vercel.
// It checks that the database has everything this version of the code needs.
// If something is missing the build fails, and Vercel keeps serving the last
// working version instead of deploying one that would show errors.
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ODDS_API_KEY",
];
const missingEnv = required.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(`\nBuild stopped. Missing environment variables: ${missingEnv.join(", ")}\n`);
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Each entry is a table or view and the columns the code reads from it.
const tables = {
  games: "id, sport_key, commence_time, home_price, away_price, odds_updated_at, home_score, away_score, completed, winner",
  picks: "id, user_id, game_id, picked_team, odds_at_pick",
  odds_sync: "sport_key, last_synced_at, credits_remaining, scores_synced_at",
  profiles: "id, display_name",
  groups: "id, name, code, created_by",
  group_members: "group_id, user_id",
  scored_picks: "id, user_id, game_id, odds, outcome, points",
};

const problems = [];
for (const [table, columns] of Object.entries(tables)) {
  const { error } = await db.from(table).select(columns).limit(1);
  if (error) problems.push(`${table}: ${error.message}`);
}

// PGRST202 means the function does not exist. Any other answer means it does.
const functions = {
  group_leaderboard: { target_group: "00000000-0000-0000-0000-000000000000" },
  create_group: { group_name: "check" },
  join_group: { group_code: "CHECK0" },
};
for (const [name, args] of Object.entries(functions)) {
  const { error } = await db.rpc(name, args);
  if (error?.code === "PGRST202") problems.push(`function ${name} is missing`);
}

if (problems.length > 0) {
  console.error("\nBuild stopped. The database is missing things this version needs:");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\nRun the scripts in supabase/migrations in the Supabase SQL editor, then build again.\n");
  process.exit(1);
}

console.log("Database check passed.");
