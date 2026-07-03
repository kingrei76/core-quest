---
name: implementation-notes
description: Use during any non-trivial build. Maintains docs/design/<feature>-implementation-notes.md; when an edge case forces deviating from the plan, picks the conservative option, logs it under "Deviations", and keeps going.
---

# Implementation notes

Keep a running notes file while building, so the *why* behind every choice survives the
session. This file is also the raw material for `pitch` and `quiz`.

## On build start

Create `docs/design/<feature>-implementation-notes.md` with these sections:

```markdown
# <feature> — implementation notes

## Plan
<the agreed approach, in a few bullets>

## Decisions
<non-obvious choices made, each with its reason>

## Deviations
<appended as they happen — see the rule below>

## Open questions
<anything still unresolved>
```

## The deviation rule (the core discipline)

When reality contradicts the plan — an edge case, a wrong assumption, a missing API:

1. **Don't stop to ask if the choice is low-stakes.** Pick the **conservative** option:
   smallest blast radius, reversible, consistent with existing patterns.
2. **Append a dated bullet under `## Deviations`**: what the plan said · what you hit ·
   what you chose · why.
3. **Keep going.**

**Escalate to the user only when the conservative choice is itself architecture-changing**
— then invoke `interview` for that one decision rather than guessing.

## Style

- Append-only and **why-led** (matches this repo's "why-led PR" norm — explain intent, not
  just the diff).
- Cite sources for facts you relied on (see the `references` skill).
- Keep it terse. It's a log, not an essay.
