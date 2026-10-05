"use client";

import { useActionState } from "react";
import { togglePick } from "@/app/actions";

type Side = { team: string; price: number | null };

function formatOdds(price: number | null) {
  if (price === null) return "–";
  return price > 0 ? `+${price}` : `${price}`;
}

export function PickButtons({
  gameId,
  away,
  home,
  pickedTeam,
  oddsAtPick,
  locked,
}: {
  gameId: string;
  away: Side;
  home: Side;
  pickedTeam: string | null;
  oddsAtPick: number | null;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(togglePick, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="gameId" value={gameId} />
      <div className="grid grid-cols-2 gap-2">
        {[away, home].map((side, index) => {
          const picked = pickedTeam === side.team;
          return (
            <button
              key={side.team}
              name="team"
              value={side.team}
              disabled={locked || pending || side.price === null}
              aria-pressed={picked}
              className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                picked
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-foreground/20 enabled:hover:border-foreground/50 disabled:opacity-50"
              }`}
            >
              <span className="font-medium">
                {index === 1 && <span className="opacity-60">@ </span>}
                {side.team}
              </span>
              <span className="tabular-nums">
                {formatOdds(picked && oddsAtPick !== null ? oddsAtPick : side.price)}
              </span>
            </button>
          );
        })}
      </div>
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
