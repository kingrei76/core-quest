-- Phase 6.4-lite — Wanderer Combat MVP
-- Plan of record: ~/.claude/plans/ok-catch-me-up-polished-sedgewick.md
-- First migration file in this project. Going forward, schema changes
-- land here as timestamped migrations applied via `supabase db push`,
-- replacing the previous "append to supabase-schema.sql + copy to
-- dashboard" workflow. supabase-schema.sql remains as a historical
-- reference of state-before-migrations.

alter table character_stats
  add column if not exists action_points int default 0,
  add column if not exists weekly_hp int default 100,
  add column if not exists weekly_hp_max int default 100,
  add column if not exists weekly_hp_reset_at timestamptz;

create table if not exists combat_encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  enemy_type text not null,
  enemy_hp int not null,
  enemy_hp_max int not null,
  status text not null default 'active'
    check (status in ('active', 'victory', 'retreat')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists combat_encounters_user_active_idx
  on combat_encounters(user_id) where status = 'active';

alter table combat_encounters enable row level security;

drop policy if exists "Users see own encounters" on combat_encounters;
create policy "Users see own encounters" on combat_encounters
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own encounters" on combat_encounters;
create policy "Users insert own encounters" on combat_encounters
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own encounters" on combat_encounters;
create policy "Users update own encounters" on combat_encounters
  for update using (auth.uid() = user_id);

drop policy if exists "Users delete own encounters" on combat_encounters;
create policy "Users delete own encounters" on combat_encounters
  for delete using (auth.uid() = user_id);

create table if not exists combat_strikes (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references combat_encounters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attack_type text not null,
  ap_spent int not null,
  damage_dealt int not null,
  is_crit boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists combat_strikes_encounter_idx on combat_strikes(encounter_id);

alter table combat_strikes enable row level security;

drop policy if exists "Users see own strikes" on combat_strikes;
create policy "Users see own strikes" on combat_strikes
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own strikes" on combat_strikes;
create policy "Users insert own strikes" on combat_strikes
  for insert with check (auth.uid() = user_id);

-- Add to realtime publication if not already present.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'combat_encounters'
  ) then
    alter publication supabase_realtime add table combat_encounters;
  end if;
end $$;
