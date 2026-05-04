# CORE Quest — `docs/` index

Where design and engineering knowledge for CORE Quest lives.

## Top-level

- [`../vision.md`](../vision.md) — **The north-star doc.** Current
  decisions on art direction, setting, team model, combat model,
  Phase 6.x roadmap, open questions. Read this first.
- [`../CLAUDE.md`](../CLAUDE.md) — Technical conventions, Supabase
  handoff workflow, known gotchas, phases shipped, game-design
  invariants. Always re-read at session start.

## Inside `docs/`

- [`encounter-spike.md`](encounter-spike.md) — Spec for the Phase 6.2
  throwaway prototype. Validates the DOM + framer-motion + sprite-sheet
  rendering approach before committing. ~90 minute build. Decision
  criteria for green-light vs. needing an engine.

## Inside `docs/design/`

- [`design/style-bible.md`](design/style-bible.md) — Locked reference
  images, palette, typography, sprite specs, prompt recipes. Stub
  populated during Phase 6.1 design sessions. The single source of
  truth for "what does the game look like."

## When to read what

| Question | Doc |
|---|---|
| What is this game? Why? | `vision.md` |
| What's already shipped? | `CLAUDE.md` § Phases shipped |
| How is the code organized? | `CLAUDE.md` § Critical files |
| Why doesn't the web Claude push to Supabase directly? | `CLAUDE.md` § Server-change handoff |
| How should combat feel? Is the architecture sound? | `docs/encounter-spike.md` |
| What does the Warrior look like? What's the palette? | `docs/design/style-bible.md` |
| What's the next step in the roadmap? | `vision.md` § Phase 6 |

## When to update what

- New schema, new edge function, new gotcha, new convention → `CLAUDE.md`
- Decision about gameplay direction, art, story, narrative wrapper → `vision.md`
- New reference image, new palette decision, prompt that works → `docs/design/style-bible.md`
- New architectural spike or prototype spec → new file under `docs/`
