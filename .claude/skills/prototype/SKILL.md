---
name: prototype
description: Use when the user wants to see options before wiring anything up — "mock it", "make an HTML page with N directions", "fake data first". Builds throwaway single-file HTML mocks with fake data and surfaces them on the deployed URL for reaction.
---

# Prototype

Build cheap, disposable mocks so the user can *react* to something real before you wire
anything up. Reacting to a screen beats reading a description.

## Rules

- **One self-contained HTML file per direction.** Inline CSS and JS. Hard-coded fake data.
  **No Supabase, no imports, no build step, no real wiring.** It must open as a plain file.
- **For "wildly different directions," make them genuinely divergent** — 3–4 takes a
  person would actually debate between, not one idea in four colorways.
- **Label it a throwaway.** Put a visible banner: "PROTOTYPE — fake data, nothing wired."

## Where the files go (this is the review loop)

Write to `public/prototypes/<feature>-<direction>.html`.

`public/` is served statically by Vite/Vercel, so **merging to `main` makes each mock live
at `core-quest.vercel.app/prototypes/<feature>-<direction>.html`.** That deployed URL *is*
the review surface — the user reviews on their phone, not a local dev server. **Do not ask
the user to run `npm run dev`** (see the deploy-as-test convention in `CLAUDE.md`).

## Parallel fan-out (optional)

When the directions are independent, dispatch one builder per direction as parallel
subagent tasks (informed by the `brainstorm` output), then collect them. Keeps wall-clock
down when you're producing 3–4 divergent takes at once.

## After the user reacts

1. Once a direction wins, run `interview` on whatever gaps the mock exposed.
2. Then build for real — with `implementation-notes` running.
3. The winning mock's live URL becomes the demo link for `pitch`.

Throwaway prototypes can stay in `public/prototypes/` as a design record, or be deleted
once the real feature ships — they're never imported by app code, so they're safe to leave.
