-- Task-change history: a durable timeline of how each quest evolves over time,
-- regardless of who changed it (Claude via the MCP server, the app UI, or the
-- inbox organizer). Complements claude_actions (which only logs Claude's moves).
--
-- A trigger snapshots the row on every INSERT and on any UPDATE that touches a
-- tracked field. reminder-dispatcher housekeeping (last_reminded_at) is NOT a
-- tracked field, so it doesn't spam the log.

CREATE TABLE IF NOT EXISTS public.quest_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id       uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  changed_at     timestamptz NOT NULL DEFAULT now(),
  change_type    text NOT NULL,          -- 'created' | 'updated' | 'completed'
  changed_fields text[],                 -- which tracked fields changed
  old            jsonb,                  -- full previous row (null on create)
  new            jsonb                   -- full new row
);

CREATE INDEX IF NOT EXISTS quest_history_quest_idx ON public.quest_history (quest_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS quest_history_user_idx  ON public.quest_history (user_id, changed_at DESC);

ALTER TABLE public.quest_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quest_history_select_own ON public.quest_history;
CREATE POLICY quest_history_select_own ON public.quest_history
  FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_quest_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tracked text[] := ARRAY['title','status','approval_status','category','difficulty',
                          'priority','due_date','reminder_at','focus_week','planned_day'];
  changed text[] := '{}';
  f text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.quest_history(quest_id, user_id, change_type, changed_fields, old, new)
    VALUES (NEW.id, NEW.user_id, 'created', tracked, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    FOREACH f IN ARRAY tracked LOOP
      IF (to_jsonb(OLD) ->> f) IS DISTINCT FROM (to_jsonb(NEW) ->> f) THEN
        changed := array_append(changed, f);
      END IF;
    END LOOP;
    IF array_length(changed, 1) IS NULL THEN
      RETURN NEW;  -- nothing tracked changed (e.g. only last_reminded_at) — skip
    END IF;
    INSERT INTO public.quest_history(quest_id, user_id, change_type, changed_fields, old, new)
    VALUES (
      NEW.id, NEW.user_id,
      CASE WHEN 'status' = ANY(changed) AND NEW.status = 'completed' THEN 'completed' ELSE 'updated' END,
      changed, to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_quest_change ON public.quests;
CREATE TRIGGER trg_log_quest_change
  AFTER INSERT OR UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.log_quest_change();
