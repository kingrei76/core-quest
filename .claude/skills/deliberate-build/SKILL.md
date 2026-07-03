---
name: deliberate-build
description: Use at the start of any unfamiliar or non-trivial feature. Chains the working-style stages — blindspot, interview, brainstorm, prototype, build-with-notes, pitch, quiz — and says which to skip for small tasks so it never feels heavyweight.
---

# Deliberate build

The entry point for non-trivial work. It sequences the other skills and subagents into one
deliberate flow: **understand cheaply → decide → diverge → build conservatively → verify.**
Prefer invoking this over improvising a workflow.

## The chain

```
blindspot-pass (subagent)   → map the unfamiliar area, surface unknown-unknowns
        ↓
interview (skill)           → lock the architecture-changing decisions, one Q at a time
        ↓
brainstorm (subagent)       → diverge on directions, cheapest → most ambitious
        ↓
prototype (skill)           → throwaway HTML mocks in public/prototypes, react to them
        ↓
build + implementation-notes (skill)  → build for real; conservative deviations, logged
        ↓
pitch (skill)               → package for buy-in, demo-first
        ↓
quiz (skill)                → what-changed report + merge-gate quiz
```

`references` is **cross-cutting** — cite source inside any stage, not as its own step.

## Scale to the task — skip stages, don't perform them

This is not a mandatory seven-step ritual. Name which stages you're skipping and why:

- **Tiny / well-understood change** → skip to build + `implementation-notes` + `quiz`.
- **Familiar area, ambiguous requirements** → `interview` → build → `quiz`.
- **Unfamiliar area** → start at `blindspot-pass`.
- **Ambiguous *product* call** → `blindspot-pass` → `interview` → `brainstorm` →
  `prototype`, then stop and let the user pick before building.

When in doubt, do the cheap upstream stages (they're read-only or throwaway) and be
sparing with the expensive downstream ones.

## Repo boundaries to respect at every stage

- The **game/combat layer is parked** — no XP/AP side-effects in the task track.
- **Schema changes follow the `CLAUDE.md` server-handoff.** This environment (web) can't
  reach Supabase: write the migration, commit it, and end with a "Local CLI handoff" block
  telling the user to run `supabase db push --linked` from their Mac.
- **Deploy-as-test is the review surface** — merge to `main`, review on
  `core-quest.vercel.app`. Don't ask the user to run a local dev server.

## Why this exists

These stages encode a working method worth keeping regardless of which model is running
(the meta-principles live in `CLAUDE.md` → "Working style"). Nothing here is pinned to a
model; the discipline is in the prompts, so it carries across model swaps.
