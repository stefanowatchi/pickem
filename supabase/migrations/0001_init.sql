-- Pick'em first version: games, picks and the rules that protect them.
-- Run this once in the Supabase SQL editor.

create table public.games (
  id text primary key,                -- event id from The Odds API
  sport_key text not null,
  commence_time timestamptz not null,
  home_team text not null,
  away_team text not null,
  home_price integer,                 -- American moneyline odds, e.g. -150
  away_price integer,
  bookmaker text,
  odds_updated_at timestamptz
);

create index games_commence_time_idx on public.games (commence_time);

create table public.picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  picked_team text not null,
  odds_at_pick integer not null,      -- filled in by the trigger below
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

-- One row per league: when odds were last fetched and how many API credits are left.
create table public.odds_sync (
  sport_key text primary key,
  last_synced_at timestamptz not null,
  credits_remaining integer
);

alter table public.games enable row level security;
alter table public.picks enable row level security;
alter table public.odds_sync enable row level security;

-- Games: signed-in users can read. Only the server (service role) writes.
grant select on public.games to authenticated;
create policy "Signed-in users can read games"
  on public.games for select to authenticated
  using (true);

-- Picks: you can only see and change your own, and only before kickoff.
grant select, insert, update, delete on public.picks to authenticated;

create policy "Read own picks"
  on public.picks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Create own picks"
  on public.picks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Change own picks"
  on public.picks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Remove own picks before kickoff"
  on public.picks for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.games g
      where g.id = game_id and g.commence_time > now()
    )
  );

-- odds_sync has no policies: only the service role can touch it.
grant all on public.games, public.picks, public.odds_sync to service_role;

-- Locks picks at kickoff and copies the odds from the games table,
-- so the browser can never choose its own odds.
create function public.set_pick_odds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  g public.games%rowtype;
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

  new.updated_at := now();
  return new;
end;
$$;

create trigger picks_set_odds
  before insert or update on public.picks
  for each row execute function public.set_pick_odds();
