# week-board — implementation notes

## Plan

- New read-only `/week` screen rendering the focus week the Monday routine slots: Mon–Fri
  columns, Morning/Afternoon/Anytime groups (bucketed by `reminder_at` Denver-local hour,
  <12 / ≥12 / null), cards colored by area via `useCategories().lookup`, completed tasks
  stay visible checked-off, plus an "Unslotted this week" rail.
- Week math ports `todayStr()`/`mondayStr()` from `mcp-server/src/supabase.js:27-33`
  exactly (Sat/Sun anchor to the *ending* week's Monday) so board and `slot_task` never
  disagree. Hardcode `America/Denver`; all fns take explicit `now`/`tz` for tests.
- New `useFocusWeek(weekMonday)` hook cloned from `useQuests` fetch+realtime skeleton
  (`useId()` channel convention, see `1f49491`); server-filtered on `focus_week`.
- No schema changes, no MCP changes, no new dependencies. v1 markup carries
  `data-day`/`data-block` for a later drag-to-reschedule.
- Full plan: `~/.claude/plans/jazzy-skipping-creek.md` (Phase B).

## Decisions

- Weekend shows the *ending* week (matches MCP `mondayStr`); ◂ ▸ chevrons peek at other
  weeks; empty future week hints "fills in after Monday planning". Chosen because next
  week's rows don't exist until the Monday routine runs — "show next week on Saturday"
  would render an empty board every weekend.
- Backlog rail is focus-week-only (`focus_week = monday AND planned_day IS NULL`); the
  Quests page already serves the full backlog. Tasks with `planned_day` outside Mon–Fri
  fold into the rail with a date chip.
- Null-tolerant `approval_status` filter client-side, mirroring `QuestsPage.jsx` (old rows
  may have null = approved). Top-level quests only (`parent_quest_id` null).

## Deviations

- 2026-07-08 · Plan implied a loading reset when the viewed week changes; the
  `react-hooks/set-state-in-effect` lint rule flags `setLoading(true)` inside the
  fetch effect. Chose to match `useQuests` exactly (loading only settles false
  after first fetch) — switching weeks briefly shows the previous list, then
  updates. Smallest-blast-radius, consistent with the existing hook.
- 2026-07-08 · Open question resolved: 6 bottom-nav items fit at 375px (flex: 1
  → ~62px each, longest label "Quests" at 0.65rem fits). Combat tab stays.
- 2026-07-08 · `react-hooks/set-state-in-effect` still flags the fetch-on-mount
  effect even after matching `useQuests` — verified the rule flags `useQuests`
  and `useCategories` identically (pre-existing, lint is advisory in CI). Left
  as-is for consistency rather than restructuring every data hook in one PR.
- 2026-07-08 · Matt rejected read-only v1 at the quiz gate. Added tap-to-move
  (MoveSheet: day + block chips) instead of drag — more reliable on touch, no
  new dependency. Board writes only focus_week/planned_day/reminder_at (the
  slot_task fields); the [core-quest] calendar event is reconciled by the daily
  routine's new STEP 4 on its next run (the app has no Calendar access). Known
  lag: board edit → calendar catches up next morning at 7am.
- 2026-07-08 · Matt wants backlog visible on the board. Widened the hook query
  with `.or(focus_week.eq.<monday>,status.in.(available,in_progress))` — week
  rows (incl. completed) plus all open tasks; completed history outside the
  week stays excluded. `splitBoard()` divides them client-side.
- 2026-07-08 · Timezone follows the phone for block DISPLAY (blockFor /
  reminderLabel default to `deviceTz()`), while week IDENTITY (focusMonday)
  stays pinned to Denver so the board and slot_task always agree on which
  Monday a week is. MoveSheet anchors (9:00/13:00) are device-local per the
  CLAUDE.md reminder rule. Google Calendar meetings shift timezone natively —
  nothing to build there.
- 2026-07-08 · Daily read prompt now (a) presses for a commitment on unfinished
  tasks instead of silently rolling, and (b) reconciles all [core-quest] events
  against current task state, catching up board edits.

## Open questions

- Nav has 5 items; adding Week makes 6 — verify fit at 375px, fallback is dropping the
  parked Combat tab (game is parked per CLAUDE.md).
