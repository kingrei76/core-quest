# Charter — "Core Quest blindspot scout"

Trigger: **merge to `main`** via GitHub Action `.github/workflows/blindspot-scout.yml`
(event-driven — runs as a follow-up to every build). Optional nightly cron remains a
possible fallback but is not wired.

> Status 2026-07-04: **wired to merge-to-main, disabled by default.** Matt chose the
> "when I build something new" trigger = merge to `main`. The Action runs the read-only
> stages of the `.claude/` Fable kit (`blindspot-pass` + `brainstorm`) over just the
> changed files and files follow-ups. It **no-ops until an `ANTHROPIC_API_KEY` repo
> secret is set**, so it's safe to merge. Default sink is a **GitHub issue** (labelled
> `blindspot-scout`); the MCP `propose_task` inbox is an opt-in upgrade
> (`.claude/mcp-config.example.json`). Design + deviations:
> `docs/design/blindspot-scout-implementation-notes.md`.

## Goal
On every merge to `main`, run a **read-only** blindspot + brainstorm pass over **the area
that just changed** and surface what's worth doing next — as follow-ups Matt can approve —
without ever touching code.

## In scope (allowed)
- Read-only exploration scoped to the **files changed in the merge** (and the code around
  them), computed from the push diff.
- Run the `blindspot-pass` digest and the `brainstorm` cheapest→ambitious ranking on that
  changed area.
- Surface 0–3 follow-ups. **Default sink: a GitHub issue** labelled `blindspot-scout`.
  Optional upgrade: propose them as tasks via the Core Quest MCP `propose_task` tool, which
  land as `approval_status='proposed'`, hidden until Matt approves (see `CLAUDE.md` →
  "Task-management track"; wiring in `.claude/mcp-config.example.json`).

## Out of scope (guardrails — never do)
- **Any** code change, migration, deploy, commit, or PR. Enforced structurally by the
  Action's `permissions: contents: read` (mirrors `work-checker.md`).
- Auto-approving its own proposals. They wait for Matt.
- Proposing game/combat work — that layer is **parked**; scope follow-ups to the task/app
  layer.
- Filing noise — if nothing is worth doing, file nothing and say so.

## Definition of done (per run)
- Scoped to the merge's changed files (not the whole repo).
- 0–3 follow-ups surfaced (quality over quantity — propose nothing if nothing's worth it).
- Each follow-up cites the **source** (file/commit) that motivated it, not prose.
- Filed as one `blindspot-scout` issue (or the MCP inbox, if upgraded), or nothing.

## Drift signals (for the morning review to flag ⚠️)
Off-goal if it: made any code change; approved its own proposal; proposed game-layer work;
scanned far beyond the changed area; or produced follow-ups with no source citation.
