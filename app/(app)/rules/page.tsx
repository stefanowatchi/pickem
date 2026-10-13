import { LEAGUES } from "@/lib/leagues";
import { MIN_PICKS_TO_RANK, STAKE } from "@/lib/rules";

const EXAMPLES = [
  { pick: "Underdog at +380", win: "+380", loss: `-${STAKE}` },
  { pick: "Slight underdog at +120", win: "+120", loss: `-${STAKE}` },
  { pick: "Slight favourite at -150", win: "+66.7", loss: `-${STAKE}` },
  { pick: "Heavy favourite at -500", win: "+20", loss: `-${STAKE}` },
];

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mt-4 p-4">
      <h3 className="display text-xl text-accent">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {children}
      </ul>
    </section>
  );
}

export default function RulesPage() {
  const leagues = LEAGUES.map((league) => league.label).join(", ");

  return (
    <main className="py-6">
      <h2 className="display text-3xl">The rules</h2>
      <p className="mt-2 text-sm text-muted">
        Everything that decides who tops the board, in plain English.
      </p>

      <Rule title="Making picks">
        <li>
          Pick the winner of any game in {leagues}. One pick per game.
        </li>
        <li>
          <strong>There is no limit on how many games you pick.</strong> Pick
          one game or every game.
        </li>
        <li>
          You can change or drop a pick any time before the game starts. Once
          it starts, the pick is locked for good.
        </li>
      </Rule>

      <Rule title="Getting ranked">
        <li>
          <strong>
            You need at least {MIN_PICKS_TO_RANK} finished picks to appear on a
            leaderboard.
          </strong>{" "}
          A finished pick is one where the game has ended and has a result.
        </li>
        <li>
          {MIN_PICKS_TO_RANK} is a minimum, not a maximum. Picks on games that
          haven&apos;t been played yet don&apos;t count towards it.
        </li>
        <li>
          Until you reach {MIN_PICKS_TO_RANK}, you show under &quot;Not ranked
          yet&quot; with your count so far.
        </li>
        <li>
          The minimum applies to each board separately: {MIN_PICKS_TO_RANK}{" "}
          this week for the weekly board, {MIN_PICKS_TO_RANK} in total for the
          season board.
        </li>
      </Rule>

      <Rule title="How points work">
        <li>
          Every pick is a pretend {STAKE}-point stake. No real money is
          involved.
        </li>
        <li>
          A win pays what the odds say. A loss costs {STAKE} points. A tie, or
          a game that is cancelled, scores 0.
        </li>
        <li>
          Underdogs pay more because they win less often. Picking only
          underdogs, or only favourites, loses points on average. You gain by
          being right more often than the odds expect.
        </li>
      </Rule>

      <div className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="label border-b border-line text-left">
              <th className="px-4 py-2 font-semibold">Your pick</th>
              <th className="px-4 py-2 text-right font-semibold">If it wins</th>
              <th className="px-4 py-2 text-right font-semibold">If it loses</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLES.map((example) => (
              <tr key={example.pick} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2.5">{example.pick}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-win">
                  {example.win}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-loss">
                  {example.loss}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Rule title="The leaderboard">
        <li>
          Each group has its own leaderboard, ranked by total points. Points
          per pick breaks a tie.
        </li>
        <li>
          <strong>This week</strong> counts games from Tuesday morning to the
          next Tuesday morning, so an NFL week from Thursday to Monday night
          stays together. It then resets to zero.
        </li>
        <li>
          <strong>Season</strong> counts every game since you started playing.
        </li>
        <li>
          Your points can be negative. Totals follow you into every group you
          join.
        </li>
      </Rule>

      <Rule title="Keeping it fair">
        <li>
          <strong>Everyone gets the same odds.</strong> Picks are scored at the
          closing odds, the last odds before the game starts, not the odds on
          screen when you picked. The number you see can still move.
        </li>
        <li>
          <strong>Picks are hidden until the game starts.</strong> After that,
          people in your groups can see them. Nobody outside your groups ever
          can.
        </li>
        <li>
          The app refreshes the odds before it saves a pick, so nobody can pick
          against a line that news has already moved.
        </li>
        <li>
          One account per person. The person who created a group can remove
          members.
        </li>
      </Rule>
    </main>
  );
}
