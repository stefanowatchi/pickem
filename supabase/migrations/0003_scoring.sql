-- Pick'em: results, scoring, group leaderboards and anti-cheating rules.
-- Run this once in the Supabase SQL editor, after 0002_groups.sql.

-- Final results, written only by the server.
alter table public.games
  add column home_score integer,
  add column away_score integer,
  add column completed boolean not null default false,
  add column winner text; -- winning team's name; null for a tie or an unfinished game

alter table public.odds_sync add column scores_synced_at timestamptz;

-- THE SCORING FORMULA. Every pick is a pretend 100-point stake at the game's
-- closing odds: a win pays what the odds say, a loss costs 100, a tie is 0.
-- Change the ranking rules here and nowhere else.
create function public.pick_points(odds integer, outcome text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when odds is null or odds = 0 then 0
    when outcome = 'won' and odds > 0 then odds::numeric
    when outcome = 'won' then round(10000.0 / abs(odds), 1)
    when outcome = 'lost' then -100
    else 0
  end;
$$;

-- True when the signed-in user shares at least one group with the other user.
create function public.shares_group_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other_user
  );
$$;

-- Picks stay private until the game starts. After that, people who share a
-- group with you can see them. Nobody else ever can.
create policy "Group members can read picks once the game has started"
  on public.picks for select to authenticated
  using (
    public.shares_group_with(user_id)
    and exists (
      select 1 from public.games g
      where g.id = game_id and g.commence_time <= now()
    )
  );

-- Every pick with its closing odds, outcome and points. It runs with the
-- viewer's permissions, so it only ever shows picks the viewer may read.
-- The odds come from the game, not the pick: everyone who picked the same
-- team is scored at the same price, whenever they picked.
create view public.scored_picks
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  p.game_id,
  p.picked_team,
  g.sport_key,
  g.commence_time,
  g.home_team,
  g.away_team,
  g.home_score,
  g.away_score,
  g.completed,
  r.odds,
  r.outcome,
  public.pick_points(r.odds, r.outcome) as points
from public.picks p
join public.games g on g.id = p.game_id
cross join lateral (
  select
    case when p.picked_team = g.home_team then g.home_price else g.away_price end as odds,
    case
      when not g.completed then 'pending'
      when g.winner is null then 'tie'
      when g.winner = p.picked_team then 'won'
      else 'lost'
    end as outcome
) r;

grant select on public.scored_picks to authenticated;
grant select on public.scored_picks to service_role;

-- A group's standings. Only members of the group get any rows back.
-- Only games that have started are counted, so it never reveals hidden picks.
create function public.group_leaderboard(target_group uuid, since timestamptz default null)
returns table (
  user_id uuid,
  display_name text,
  graded integer,
  wins integer,
  losses integer,
  in_progress integer,
  points numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.user_id,
    coalesce(pr.display_name, 'New player'),
    (count(s.id) filter (where s.outcome <> 'pending'))::integer,
    (count(s.id) filter (where s.outcome = 'won'))::integer,
    (count(s.id) filter (where s.outcome = 'lost'))::integer,
    (count(s.id) filter (where s.outcome = 'pending'))::integer,
    coalesce(sum(s.points) filter (where s.outcome <> 'pending'), 0)
  from public.group_members m
  left join public.profiles pr on pr.id = m.user_id
  left join public.scored_picks s
    on s.user_id = m.user_id
    and s.commence_time <= now()
    and (since is null or s.commence_time >= since)
  where m.group_id = target_group
    and public.is_group_member(target_group)
  group by m.user_id, pr.display_name;
$$;

-- Replaces the pick trigger from 0001. New rule: a pick is only accepted
-- against fresh odds (10 minutes old at most when the game starts within
-- 2 hours, otherwise 1 hour). The app refreshes the odds before saving a pick,
-- so nobody can pick against a line that news has already moved. The rule
-- relaxes when API credits are nearly gone, so the app keeps working.
create or replace function public.set_pick_odds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
  credits integer;
  max_age interval;
begin
  if tg_op = 'UPDATE' and (new.game_id <> old.game_id or new.user_id <> old.user_id) then
    raise exception 'A pick cannot be moved to another game or user';
  end if;

  select * into g from public.games where id = new.game_id;
  if not found then
    raise exception 'Game not found';
  end if;
  if g.commence_time <= now() then
    raise exception 'This game has started, so picks are locked';
  end if;

  if new.picked_team = g.home_team then
    new.odds_at_pick := g.home_price;
  elsif new.picked_team = g.away_team then
    new.odds_at_pick := g.away_price;
  else
    raise exception 'That team is not playing in this game';
  end if;

  if new.odds_at_pick is null then
    raise exception 'Odds are not available for this game yet';
  end if;

  select min(credits_remaining) into credits from public.odds_sync;
  if credits is null or credits >= 50 then
    max_age := case
      when g.commence_time - now() < interval '2 hours' then interval '12 minutes'
      else interval '62 minutes'
    end;
    if g.odds_updated_at is null or g.odds_updated_at < now() - max_age then
      raise exception 'The odds were out of date and are refreshing. Please try again.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.pick_points(integer, text) from public, anon;
revoke execute on function public.shares_group_with(uuid) from public, anon;
revoke execute on function public.group_leaderboard(uuid, timestamptz) from public, anon;
grant execute on function public.pick_points(integer, text) to authenticated, service_role;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.group_leaderboard(uuid, timestamptz) to authenticated;
