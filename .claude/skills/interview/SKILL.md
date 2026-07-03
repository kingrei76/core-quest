---
name: interview
description: Use when the user says "interview me", when requirements are ambiguous, or before committing to an architecture on unfamiliar work. Asks one question at a time, prioritizing the question whose answer would most change the design.
---

# Interview

Resolve ambiguity *before* building, by interviewing the user one question at a time.

## The one rule that matters

**One question per turn.** Never send a wall of questions. A batched questionnaire makes
the user do triage work you should be doing for them.

## How to choose the next question

Rank every candidate question by a single test:

> *If the answer came back the opposite of what I'd assume, would it change the
> architecture, the data model, or the schema?*

Ask the highest-leverage question first. **Skip any question whose answer wouldn't change
what you build** — decide those yourself with a sensible default and mention it.

## Loop

1. Ask the single most architecture-changing open question.
2. Wait for the answer. Integrate it.
3. Re-rank: is there still an open question that would change the design? If yes, ask it.
   If the only unknowns left are cosmetic, stop.
4. Emit a short **"Decisions locked"** list the user can eyeball, then hand off (to
   `prototype` to see options, or straight to build with `implementation-notes`).

## Probes to keep in the quiver (core-quest specific)

Before assuming, check whether the work touches any of these — each one changes the plan:

- **Supabase schema?** → a migration is needed, and this environment can't reach Supabase.
  Web sessions write the migration + emit a "Local CLI handoff" block (see `CLAUDE.md`).
- **A realtime list hook?** → it must namespace its channel with `useId()` (see `1f49491`).
- **Game layer or task layer?** → the game/combat track is *parked*; don't wire XP/AP
  side-effects into task work.
- **Auth?** → never re-add `emailRedirectTo` to OTP signin (breaks iOS PWA).
- **Categories?** → read the merged list via `useCategories()`, don't index `CATEGORIES`
  directly.

## Anti-pattern

Do not use this skill to ask "is the plan okay?" — that's not an interview question, it's
a checkpoint. Interview questions resolve *unknowns*, not *approval*.
