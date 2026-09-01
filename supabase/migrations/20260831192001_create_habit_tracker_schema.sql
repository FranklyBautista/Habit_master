create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null
    or char_length(btrim(display_name)) between 1 and 60
  ),
  timezone text not null default 'UTC' check (char_length(btrim(timezone)) > 0),
  locale text not null default 'es' check (locale = 'es'),
  week_starts_on smallint not null default 1 check (week_starts_on = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text check (
    description is null
    or char_length(btrim(description)) <= 160
  ),
  color text not null check (
    color in ('#047857', '#0369A1', '#7C3AED', '#C2410C', '#BE185D', '#0F766E')
  ),
  icon text not null default 'sparkles' check (
    icon in ('brain', 'book-open', 'footprints', 'list-checks', 'notebook-pen', 'sparkles')
  ),
  frequency text not null default 'daily' check (frequency = 'daily'),
  start_date date not null,
  position integer not null check (position >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_date date not null,
  completed_at timestamptz not null default now(),
  note text check (note is null or char_length(btrim(note)) <= 500),
  constraint habit_checkins_habit_owner_fkey
    foreign key (habit_id, user_id)
    references public.habits (id, user_id)
    on delete cascade,
  unique (habit_id, checkin_date)
);

create index habits_user_active_position_idx
  on public.habits (user_id, archived_at, position);
create index habits_user_updated_at_idx
  on public.habits (user_id, updated_at desc);
create index habit_checkins_user_date_idx
  on public.habit_checkins (user_id, checkin_date desc);
create index habit_checkins_habit_owner_idx
  on public.habit_checkins (habit_id, user_id);

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger habits_set_updated_at
before update on public.habits
for each row execute function private.set_updated_at();

create function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.habits from anon, authenticated;
revoke all on table public.habit_checkins from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.habits to authenticated;
grant select, insert, update, delete on table public.habit_checkins to authenticated;

alter default privileges in schema public
revoke all on tables from anon, authenticated;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

create policy "habits_select_own"
on public.habits for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "habits_insert_own"
on public.habits for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "habits_update_own"
on public.habits for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "habits_delete_own"
on public.habits for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "habit_checkins_select_own"
on public.habit_checkins for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "habit_checkins_insert_own"
on public.habit_checkins for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "habit_checkins_update_own"
on public.habit_checkins for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "habit_checkins_delete_own"
on public.habit_checkins for delete
to authenticated
using ((select auth.uid()) = user_id);
