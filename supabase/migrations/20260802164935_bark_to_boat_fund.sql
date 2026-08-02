-- Bark to Boat Balance: a shared, PUBLIC (unauthenticated) dog-sitting fund tracker.
-- Two self-contained tables, deliberately isolated from the game/quests. Fully open
-- by design so anyone with the /bark-to-boat URL can read + write with the anon key
-- (no login). No existing table, policy, or the auth flow is touched.

-- The log: one row per dog-sitting. amount is stored = days * day_rate at the time of
-- entry, so historical entries keep their rate even if the rate is later changed.
create table if not exists public.boat_fund_entries (
  id uuid primary key default gen_random_uuid(),
  days numeric not null check (days > 0),
  day_rate numeric not null check (day_rate >= 0),
  amount numeric not null check (amount >= 0),
  note text,
  sat_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Singleton config row (id is pinned to 1): the adjustable day rate + goal.
create table if not exists public.boat_fund_settings (
  id int primary key default 1 check (id = 1),
  day_rate numeric not null default 30 check (day_rate >= 0),
  goal_amount numeric not null default 1200 check (goal_amount >= 0),
  updated_at timestamptz not null default now()
);

insert into public.boat_fund_settings (id) values (1) on conflict (id) do nothing;

-- RLS: enabled with fully permissive policies (public read + write). This is
-- intentional for a shared joke tracker; the anon key is already public, so this
-- adds no exposure beyond this fund's own two tables.
alter table public.boat_fund_entries enable row level security;
alter table public.boat_fund_settings enable row level security;

drop policy if exists "boat_fund_entries public all" on public.boat_fund_entries;
create policy "boat_fund_entries public all" on public.boat_fund_entries
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "boat_fund_settings public all" on public.boat_fund_settings;
create policy "boat_fund_settings public all" on public.boat_fund_settings
  for all to anon, authenticated using (true) with check (true);

-- Realtime so two people with the page open see each other's additions live.
do $$ begin
  alter publication supabase_realtime add table public.boat_fund_entries;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.boat_fund_settings;
exception when duplicate_object then null; end $$;
