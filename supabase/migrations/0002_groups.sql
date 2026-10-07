-- Pick'em: display names and friend groups joined with a code.
-- Run this once in the Supabase SQL editor.

-- Display names, so the app never shows email addresses to other players.
create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 24),
  created_at timestamptz not null default now()
);

create unique index profiles_display_name_idx on public.profiles (lower(display_name));

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- True when the signed-in user belongs to the group. Runs with the owner's
-- rights so the membership rules below can use it without looping on themselves.
create function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = target_group and m.user_id = (select auth.uid())
  );
$$;

-- Profiles: signed-in users can read names. You can create and change only your own.
grant select, insert, update on public.profiles to authenticated;

create policy "Signed-in users can read names"
  on public.profiles for select to authenticated
  using (true);

create policy "Create own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Change own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Groups: only members can see a group, its code and its member list.
-- Creating and joining go through the functions below, never direct inserts.
grant select on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;

create policy "Members can read their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "Members can read the member list"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "Leave a group"
  on public.group_members for delete to authenticated
  using ((select auth.uid()) = user_id);

grant all on public.profiles, public.groups, public.group_members to service_role;

-- Creates a group with a fresh 6-character code and adds the creator to it.
create function public.create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I/L
  new_code text;
  new_id uuid;
begin
  if me is null then
    raise exception 'You must be signed in';
  end if;
  if (select count(*) from public.groups where created_by = me) >= 10 then
    raise exception 'You have created the maximum of 10 groups';
  end if;

  loop
    select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      into new_code
      from generate_series(1, 6);
    exit when not exists (select 1 from public.groups where code = new_code);
  end loop;

  insert into public.groups (name, code, created_by)
    values (btrim(group_name), new_code, me)
    returning id into new_id;
  insert into public.group_members (group_id, user_id) values (new_id, me);

  return new_id;
end;
$$;

-- Joins the group that has this code. Returns the group id.
create function public.join_group(group_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if me is null then
    raise exception 'You must be signed in';
  end if;

  select id into target from public.groups
    where code = upper(btrim(group_code));
  if target is null then
    raise exception 'No group has that code';
  end if;

  if exists (select 1 from public.group_members where group_id = target and user_id = me) then
    return target;
  end if;
  if (select count(*) from public.group_members where user_id = me) >= 20 then
    raise exception 'You are already in the maximum of 20 groups';
  end if;
  if (select count(*) from public.group_members where group_id = target) >= 50 then
    raise exception 'That group is full';
  end if;

  insert into public.group_members (group_id, user_id) values (target, me);
  return target;
end;
$$;

revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
