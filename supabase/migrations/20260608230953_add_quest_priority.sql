-- Add an optional priority level to quests (low | medium | high).
-- Null = unset / normal. Sortable so the board and Claude can weight by it.
alter table public.quests
  add column if not exists priority text
  check (priority is null or priority in ('low','medium','high'));
