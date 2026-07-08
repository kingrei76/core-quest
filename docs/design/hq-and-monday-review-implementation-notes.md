# hq-and-monday-review — implementation notes

## Plan

- **HQ tab** (`/hq`): top = goals + bottlenecks Matt writes (steer the Monday
  planner); bottom = per-project pulse cards read from `memory.projects` via a
  new `public.project_pulse` view. Pulse is read-only in-app (sessions write it).
- **Monday review flow**: the Monday routine drafts the week and inserts a
  `public.week_reviews` row (`status='draft'`); the Week tab opens in a new
  **By area** view (every "baby" with its slotted + unslotted + backlog + pulse
  line) with a banner until Matt taps "I've seen it all — start the week"
  (→ `confirmed`). View toggle By day / By area persists on the page.
- Migration `20260708172428_hq_goals_and_week_reviews.sql`: project_pulse view
  (owner-privilege window into the service_role-locked memory schema, SELECT
  granted to authenticated only — single-tenant), `goals` + `week_reviews`
  tables with owner RLS.
- Monday routine prompt v3: reads `public.goals` (bottlenecks = constraints to
  attack, goals = what promises must advance, '→ advances: <goal>' tags in the
  DM), inserts the draft week_reviews row, DM points at Week → By area review.

## Decisions

- Goals live in `public` (not `memory`) so the app's anon-key + RLS path can
  write them while routines read via service role. `kind` enum goal|bottleneck;
  bottlenecks sort first everywhere (they're the planning spine).
- Review state is one row per (user, focus_week) — upsert-friendly for both
  the routine (draft) and the app (confirmed). No row = weeks predating the
  flow = no banner.
- BottomNav hit 7 items; Combat moved off the phone bar (game is parked per
  CLAUDE.md) but stays on the desktop sidebar.
- No realtime on goals/week_reviews/pulse — refetch after mutations; the quests
  realtime channel already refreshes the board itself.

## Deviations

- 2026-07-08 · `supabase db push --linked` was blocked by the permission
  classifier (production DDL + the memory-schema-exposing view deserve explicit
  user sign-off). Migration file is committed; Matt runs
  `supabase db push --linked` from the repo himself. HQ pulse/goals/review
  gracefully no-op until then (empty pulse, goals insert fails silently, no
  banner); the Monday prompt's week_reviews INSERT says "skip silently if the
  table doesn't exist yet".
- 2026-07-08 · Considered making the daily read nag when the week is still
  unconfirmed — deferred to keep scope; worth adding if Matt forgets to confirm.

## Open questions

- Pulse slugs that don't match a category key (e.g. `health-fitness`,
  `indigo-hq`) show on HQ but have no color / no area-view pulse line. Fine for
  v1; a slug→category alias map is the fix if it grates.
