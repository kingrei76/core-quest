-- Weekly rhythm + slotting support for the task-management track.
--
-- focus_week : the Monday (date) of the week a task was chosen as a focus item
--              during the Monday PLAN routine. The daily EXECUTE read pulls
--              focus_week = this_monday; the Friday DEBRIEF rolls incomplete
--              focus_week items forward.
-- planned_day: the day-slot — which calendar day this week Matt intends to do
--              the task. Drives the daily "here's today's slots" read.
--              (Time-slots reuse the existing quests.reminder_at column, so the
--              already-running dispatch-reminders cron fires the intraday ping.)
--
-- Both are nullable and additive — no backfill, no impact on existing rows or
-- the parked game layer.

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS focus_week  date,
  ADD COLUMN IF NOT EXISTS planned_day date;

-- Partial indexes: the daily/weekly routines filter on these, and the vast
-- majority of rows leave them NULL, so index only the populated ones.
CREATE INDEX IF NOT EXISTS quests_focus_week_idx
  ON public.quests (user_id, focus_week)
  WHERE focus_week IS NOT NULL;

CREATE INDEX IF NOT EXISTS quests_planned_day_idx
  ON public.quests (user_id, planned_day)
  WHERE planned_day IS NOT NULL;
