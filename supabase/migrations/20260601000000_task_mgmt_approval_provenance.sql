-- Task-management hub: approval workflow, cross-source provenance/dedupe,
-- Claude action audit log, and the long-missing last_reminded_at column that
-- dispatch-reminders has been (silently) failing on.
--
-- Applied to remote via Supabase MCP on 2026-06-01.

create extension if not exists pg_trgm;

-- quests: approval workflow + provenance + reminder bookkeeping
alter table public.quests
  add column if not exists approval_status text not null default 'approved',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists last_reminded_at timestamptz;

do $$ begin
  alter table public.quests
    add constraint quests_approval_status_check
    check (approval_status in ('proposed','approved','rejected'));
exception when duplicate_object then null; end $$;

-- Cross-source dedupe (mirrors the inbox_items unique index). Lets the same
-- task arriving from iOS / Core Quest / Obsidian collapse to one row.
create unique index if not exists quests_user_external_uidx
  on public.quests (user_id, external_source, external_id)
  where external_source is not null and external_id is not null;

-- Fuzzy near-duplicate detection helper on open task titles.
create index if not exists quests_title_trgm_idx
  on public.quests using gin (title gin_trgm_ops);

-- Index the pending-approval queue for fast board + briefing reads.
create index if not exists quests_user_approval_idx
  on public.quests (user_id, approval_status);

-- Audit log: every task action Claude takes (propose/approve/reject/complete/…)
create table if not exists public.claude_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  quest_id uuid references public.quests(id) on delete set null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists claude_actions_user_created_idx
  on public.claude_actions (user_id, created_at desc);

alter table public.claude_actions enable row level security;

-- App reads its own audit log; the MCP server writes via the service role
-- (which bypasses RLS), so only a SELECT policy is needed here.
do $$ begin
  create policy "own claude_actions" on public.claude_actions
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
