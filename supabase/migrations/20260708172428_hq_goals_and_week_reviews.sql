-- HQ tab + Monday review flow.
--
-- 1) project_pulse: a read-only window into memory.projects so the app can
--    show the aggregated "all my babies" view. The memory schema is locked to
--    service_role; this view runs with owner privileges (single-tenant app,
--    SELECT granted to authenticated only).
create or replace view public.project_pulse as
  select slug, name, status_summary, latest_update, blockers, next_steps,
         updated_at, updated_by_surface
  from memory.projects;

revoke all on public.project_pulse from anon;
grant select on public.project_pulse to authenticated;

-- 2) goals: larger goals + bottlenecks Matt writes in the app. The Monday
--    planning routine reads these (service role) to steer the week.
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  kind text not null default 'goal' check (kind in ('goal', 'bottleneck')),
  project_slug text,
  status text not null default 'active' check (status in ('active', 'done', 'dropped')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "goals owner all" on public.goals;
create policy "goals owner all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists goals_user_status_idx
  on public.goals (user_id, status, kind, position);

-- 3) week_reviews: the Monday plan lands as a DRAFT; Matt reviews every area
--    in the app and confirms before the week switches to working mode. The
--    Monday routine inserts the draft row (service role); the app flips it to
--    confirmed.
create table if not exists public.week_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_week date not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  drafted_at timestamptz not null default now(),
  confirmed_at timestamptz,
  primary key (user_id, focus_week)
);

alter table public.week_reviews enable row level security;

drop policy if exists "week_reviews owner all" on public.week_reviews;
create policy "week_reviews owner all" on public.week_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
