import { LEAGUES } from "@/lib/leagues";

export type Outcome = "pending" | "won" | "lost" | "tie";

const TIME_ZONE = "America/New_York";

export const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});

export const shortDayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

export const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

export function formatOdds(price: number | null) {
  if (price === null) return "–";
  return price > 0 ? `+${price}` : `${price}`;
}

export function formatPoints(points: number) {
  const rounded = Math.round(points * 10) / 10;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function leagueLabel(sportKey: string) {
  return LEAGUES.find((league) => league.key === sportKey)?.label ?? sportKey;
}

// The weekly board resets on Tuesday morning (9:00 UTC, about 4-5am Eastern),
// so an NFL week from Thursday to Monday night stays together.
export function weekStart(now: number) {
  const date = new Date(now);
  date.setUTCHours(9, 0, 0, 0);
  const daysSinceTuesday = (date.getUTCDay() + 5) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceTuesday);
  if (date.getTime() > now) date.setUTCDate(date.getUTCDate() - 7);
  return date;
}
