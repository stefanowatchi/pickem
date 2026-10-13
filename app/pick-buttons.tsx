"use client";

import { useActionState } from "react";
import { togglePick } from "@/app/actions";
import { formatOdds, formatPoints, type Outcome } from "@/lib/format";

type Side = { team: string; price: number | null; score: number | null };

export function PickButtons({
  gameId,
  away,
  home,
  pickedTeam,
  locked,
  outcome,
  points,
}: {
  gameId: string;
  away: Side;
  home: Side;
  pickedTeam: string | null;
  locked: boolean;
  outcome: Outcome | null;
  points: number | null;
}) {
  const [state, formAction, pending] = useActionState(togglePick, null);
  const final = away.score !== null && home.score !== null;

  return (
    <form action={formAction}>
      <input type="hidden" name="gameId" value={gameId} />
      <div className="grid grid-cols-2 gap-2">
        {[away, home].map((side, index) => {
          const picked = pickedTeam === side.team;
          const tone = !picked
            ? "border-line bg-surface-raised enabled:hover:border-muted"
            : outcome === "won"
              ? "border-win bg-win/15 text-win"
              : outcome === "lost"
                ? "border-loss bg-loss/15 text-loss"
                : locked
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-accent bg-accent text-accent-ink shadow-[0_0_24px_-6px_var(--accent)]";
          return (
            <button
              key={side.team}
              name="team"
              value={side.team}
              disabled={locked || pending || side.price === null}
              aria-pressed={picked}
              className={`flex min-h-16 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${tone} ${
                !picked && (locked || side.price === null) ? "opacity-60" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="label block !text-current opacity-60">
                  {index === 0 ? "Away" : "Home"}
                </span>
                <span className="block text-sm font-semibold leading-tight">
                  {side.team}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {final && (
                  <span className="display block text-2xl">{side.score}</span>
                )}
                <span
                  className={`block font-mono tabular-nums ${
                    final ? "text-xs opacity-60" : "text-base font-semibold"
                  }`}
                >
                  {formatOdds(side.price)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {pickedTeam && outcome && outcome !== "pending" && points !== null && (
        <p
          className={`label mt-2 ${
            outcome === "won" ? "!text-win" : outcome === "lost" ? "!text-loss" : ""
          }`}
        >
          {outcome === "won" ? "Won" : outcome === "lost" ? "Lost" : "Tie"}{" "}
          <span className="font-mono">{formatPoints(points)}</span> pts
        </p>
      )}
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-loss">
          {state.error}
        </p>
      )}
    </form>
  );
}
