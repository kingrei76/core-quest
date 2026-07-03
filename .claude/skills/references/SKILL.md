---
name: references
description: Use when about to explain how something works, justify a decision, or answer a "how does X work here" question. Points at the real source of truth — file path, line, commit, doc, URL — instead of describing it from memory.
---

# References

**The best reference is source.** When you explain something or justify a decision, point
at the thing that is authoritative, not a paraphrase of it from memory.

## Practice

- When asked how something works, **locate and cite** the authoritative file/line/commit
  rather than describing it. A reader can trust a path; they can't verify prose.
- Prefer **primary sources**: the migration file over the schema snapshot; `vision.md`
  over your recollection of the game direction; the charter over a description of a
  Routine; the commit that fixed a bug over a summary of the fix.
- Assemble a compact **References block** — each claim mapped to its source of truth.
- **Flag anything you can't back with a source** as an assumption to verify, explicitly.
  "I believe X but couldn't find where it's set" is more useful than confident prose.

## Known sources of truth in this repo (examples)

- Realtime channel-collision fix → commit `1f49491` + the `useId()` rule in `CLAUDE.md`.
- XP / level math → `src/utils/rpg.js`.
- Difficulty rank for sort → `src/utils/challenges.js` (`DIFFICULTY_RANK`).
- Schema facts → the specific migration in `supabase/migrations/`, **not** the
  `supabase-schema.sql` snapshot (that's a pre-migrations historical record).
- Game/product direction → `vision.md`.
- Task-management design → `docs/design/claude-task-management.md`.

This skill is usually invoked *inside* another stage (a blindspot digest, a pitch, an
answer) rather than on its own — it's the citation discipline, not a standalone step.
