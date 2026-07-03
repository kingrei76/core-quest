---
name: pitch
description: Use after building, when the user wants buy-in or to share what was made — "package this", "write it up for Slack", "make the case". Assembles the prototype + spec + implementation notes into one droppable doc that leads with a demo and pre-answers reviewers' unknowns.
---

# Pitch

Package what was built into a single doc someone can read in one sitting and say yes to.
The reviewer starts with the same unknowns you did — answer them up front.

## Inputs (already produced earlier in the chain)

- The winning prototype's live link (`core-quest.vercel.app/prototypes/…`) or a demo GIF.
- The "Decisions locked" list from `interview`.
- `docs/design/<feature>-implementation-notes.md` (especially the Deviations).

## Structure (lead with the demo)

1. **Demo first** — the GIF or the live prototype link, before any prose. Let them *see*
   it before they read about it.
2. **What & why** — one paragraph. What this is, what problem it solves.
3. **The spec** — what it does, in plain language.
4. **Key deviations** — the notable calls from the implementation notes, each with its
   one-line rationale. Don't hide these; owning them builds trust.
5. **"You might be wondering…"** — pre-answer the reviewer's likely unknown-unknowns. Run
   a mini blindspot pass *from the reviewer's seat*: what would a careful person worry
   about here (data safety, the parked game layer, a schema change, a gotcha touched)?
   Answer each before they have to ask.

## Output

- Default: `docs/design/<feature>-pitch.md`.
- When a **live droppable link** is wanted (e.g. to drop in Slack): a self-contained
  `public/pitches/<feature>.html`, surfaced via merge-to-`main` like any prototype.

## Tone

Plain language. Product decisions here get made by a non-technical reader — mirror the
skimmable, hype-free tone of `automation/morning-review.md`. Lead with the ⚠️ / caveats if
any exist; don't bury them.
