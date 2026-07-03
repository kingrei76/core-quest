---
name: quiz
description: Use at the end of a long or high-context session, before merging. Produces an HTML report of what changed (context, intuition, what was done) plus a quiz the user must pass before the change is merged.
---

# Quiz

After a long session, you understand the change and the user doesn't yet. Before it
merges, hand that understanding back — and check that it landed.

## The report

Assemble an HTML report covering:

- **Context** — the mental model you built to make this change. What area is this, how
  does it work, what did you have to learn.
- **Intuition** — the non-obvious judgment calls. Why this way and not the obvious way.
- **What was done** — the concrete diff, in plain language. Files touched, behavior
  changed.
- **Deviations** — pulled from `docs/design/<feature>-implementation-notes.md`: where you
  left the plan and why.

## The quiz (the point)

Append **5–8 questions** targeting the things that would *hurt if the user didn't
understand them* — the schema change, the parked-vs-live boundary, any gotcha touched, any
deviation with consequences. Not trivia; the load-bearing understanding.

State explicitly: **merge waits on the user passing the quiz.** This is the human
counterpart to the automated checker's known blind spot — a green CI run is not proof the
user understands what shipped (see `automation/charters/work-checker.md` and the
timezone/UTC blind spot). The quiz closes that gap.

## Where it goes

Write to `public/reports/<feature>-<date>.html` — self-contained HTML, rendered on the
deployed URL so the user reads it on their phone like everything else (deploy-as-test).
Use a real calendar date in the filename.

## Boundary

Don't grade the user or block on a perfect score silently — surface the report, name it as
a merge gate, and let the user tell you they've read and understood it. If they miss
something, re-explain that piece rather than just re-asking.
