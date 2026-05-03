-- CORE Quest Database Schema
-- Run this in the Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends Supabase Auth users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text default 'Adventurer',
  character_name text default 'Adventurer',
  character_class text default 'Adventurer',
  character_title text default 'Apprentice',
  total_xp integer default 0,
  current_streak integer default 0,
  best_streak integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Character stats
create table character_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique not null,
  vitality integer default 10,
  wisdom integer default 10,
  fortune integer default 10,
  charisma integer default 10,
  current_hp integer default 150,
  current_mp integer default 80,
  updated_at timestamptz default now()
);

-- Inbox items (raw captures)
create table inbox_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  type text default 'unsorted' check (type in ('task', 'note', 'unsorted')),
  processed boolean default false,
  created_at timestamptz default now()
);

-- Quests (processed tasks)
create table quests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null check (category in ('health', 'intelligence', 'money', 'relationships', 'household')),
  difficulty text not null check (difficulty in ('trivial', 'easy', 'medium', 'hard', 'epic', 'legendary')),
  status text default 'available' check (status in ('available', 'in_progress', 'completed', 'failed', 'abandoned')),
  due_date date,
  recurrence text default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  xp_value integer not null,
  inbox_source_id uuid references inbox_items(id),
  reminder_at timestamptz,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Notes
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  tags text[] default '{}',
  linked_quest_id uuid references quests(id) on delete set null,
  inbox_source_id uuid references inbox_items(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- XP events (history)
create table xp_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  quest_id uuid references quests(id) on delete set null,
  xp_earned integer not null,
  category text,
  earned_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table character_stats enable row level security;
alter table inbox_items enable row level security;
alter table quests enable row level security;
alter table notes enable row level security;
alter table xp_events enable row level security;

-- Profiles: uses id (not user_id)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Character stats
create policy "Users can view own stats" on character_stats for select using (auth.uid() = user_id);
create policy "Users can update own stats" on character_stats for update using (auth.uid() = user_id);

-- Inbox items
create policy "Users can view own inbox" on inbox_items for select using (auth.uid() = user_id);
create policy "Users can insert own inbox" on inbox_items for insert with check (auth.uid() = user_id);
create policy "Users can update own inbox" on inbox_items for update using (auth.uid() = user_id);
create policy "Users can delete own inbox" on inbox_items for delete using (auth.uid() = user_id);

-- Quests
create policy "Users can view own quests" on quests for select using (auth.uid() = user_id);
create policy "Users can insert own quests" on quests for insert with check (auth.uid() = user_id);
create policy "Users can update own quests" on quests for update using (auth.uid() = user_id);
create policy "Users can delete own quests" on quests for delete using (auth.uid() = user_id);

-- Notes
create policy "Users can view own notes" on notes for select using (auth.uid() = user_id);
create policy "Users can insert own notes" on notes for insert with check (auth.uid() = user_id);
create policy "Users can update own notes" on notes for update using (auth.uid() = user_id);
create policy "Users can delete own notes" on notes for delete using (auth.uid() = user_id);

-- XP events
create policy "Users can view own xp" on xp_events for select using (auth.uid() = user_id);
create policy "Users can insert own xp" on xp_events for insert with check (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, character_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Adventurer'), 'Adventurer');

  insert into public.character_stats (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- VITALS TIMESTAMP (Phase 4.1)
-- ============================================

alter table character_stats
  add column if not exists last_penalty_at timestamptz;

-- ============================================
-- BOSS QUESTS / SUB-QUESTS (Phase 4.2)
-- ============================================

alter table quests
  add column if not exists parent_quest_id uuid references quests(id) on delete cascade;

alter table quests
  add column if not exists is_boss boolean default false;

create index if not exists quests_parent_idx on quests(parent_quest_id);

-- ============================================
-- CHALLENGES (Phase 4.3)
-- ============================================

create table if not exists challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  kind text not null,
  label text not null,
  scope text not null check (scope in ('daily', 'weekly')),
  target_category text,
  target_difficulty text,
  target_count integer not null,
  progress integer default 0,
  reward_xp integer not null,
  period_start date not null,
  period_end date not null,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists challenges_unique_period
  on challenges(user_id, kind, period_start);

create index if not exists challenges_user_active_idx
  on challenges(user_id, period_end);

alter table challenges enable row level security;

create policy "Users can view own challenges" on challenges
  for select using (auth.uid() = user_id);
create policy "Users can insert own challenges" on challenges
  for insert with check (auth.uid() = user_id);
create policy "Users can update own challenges" on challenges
  for update using (auth.uid() = user_id);

alter publication supabase_realtime add table challenges;

-- ============================================
-- ACHIEVEMENTS (Phase 4.4)
-- ============================================

create table if not exists achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  key text not null,
  unlocked_at timestamptz default now(),
  unique(user_id, key)
);

create index if not exists achievements_user_idx on achievements(user_id);

alter table achievements enable row level security;

create policy "Users can view own achievements" on achievements
  for select using (auth.uid() = user_id);
create policy "Users can insert own achievements" on achievements
  for insert with check (auth.uid() = user_id);

alter publication supabase_realtime add table achievements;

-- ============================================
-- CUSTOM CATEGORIES (Phase 5.3)
-- ============================================

create table if not exists user_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  key text not null,
  label text not null,
  stat text not null check (stat in ('vitality', 'wisdom', 'fortune', 'charisma')),
  color text,
  archived boolean default false,
  created_at timestamptz default now(),
  unique(user_id, key)
);

create index if not exists user_categories_user_idx on user_categories(user_id);

alter table user_categories enable row level security;

create policy "Users can view own categories" on user_categories
  for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on user_categories
  for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on user_categories
  for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on user_categories
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table user_categories;

-- Quests previously had a CHECK constraint on category.
-- Drop it so user-defined keys are accepted.
alter table quests drop constraint if exists quests_category_check;

-- ============================================
-- PUSH NOTIFICATIONS (Phase 3)
-- ============================================

create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "Users can view own subscriptions" on push_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own subscriptions" on push_subscriptions
  for delete using (auth.uid() = user_id);

-- ============================================
-- DEVICE IMPORT (iPhone Shortcuts → inbox)
-- ============================================

alter table inbox_items
  add column if not exists external_id text,
  add column if not exists external_source text,
  add column if not exists metadata jsonb default '{}'::jsonb;

create unique index if not exists inbox_items_external_key
  on inbox_items (user_id, external_source, external_id)
  where external_id is not null;

create table if not exists device_import_tokens (
  token text primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  label text,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

create index if not exists device_import_tokens_user_idx
  on device_import_tokens(user_id);

alter table device_import_tokens enable row level security;

create policy "Users can view own tokens" on device_import_tokens
  for select using (auth.uid() = user_id);
create policy "Users can insert own tokens" on device_import_tokens
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own tokens" on device_import_tokens
  for delete using (auth.uid() = user_id);

-- ============================================
-- REMINDER DEDUPE (Phase 3 robustness fix)
-- ============================================
-- Stamp the moment we last sent a push for a quest's reminder. The
-- dispatcher uses this so it can scan "everything due and not yet
-- reminded" instead of relying on a fragile 5-min window — late
-- reminders fire as soon as the cron next runs, and back-to-back
-- runs don't double-send.

alter table quests
  add column if not exists last_reminded_at timestamptz;

create index if not exists quests_due_reminder_idx
  on quests (reminder_at)
  where status in ('available', 'in_progress')
    and reminder_at is not null;

-- ============================================
-- ENABLE REALTIME
-- ============================================

alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table character_stats;
alter publication supabase_realtime add table inbox_items;
alter publication supabase_realtime add table quests;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table xp_events;
