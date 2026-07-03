# Charter — "Core Quest blindspot scout"

Routine: **not yet wired** · proposed cron `0 10 * * *` UTC (≈4am MT, after builder+checker)

> Status 2026-07-03: **scaffolded, not scheduled.** This charter defines a read-only
> discovery Routine that runs the read-only stages of the `.claude/` Fable kit
> (`blindspot-pass` + `brainstorm`) nightly and proposes tasks through the existing
> Core Quest MCP propose→approve pipeline. Wire the cron via `create_trigger` /
> CronCreate only on Matt's explicit go-ahead (it's a standing scheduled agent), then
> replace this note with the real `trig_…` id.

## Goal
Once per night, run a **read-only** blindspot + brainstorm pass over **one rotating area**
of the codebase and surface what's worth doing — as *proposed* tasks Matt can approve —
without ever touching code.

## In scope (allowed)
- Read-only exploration of one area per run (rotate: reminders → auth → realtime hooks →
  challenges → notes → stats, then repeat).
- Run the `blindspot-pass` digest and the `brainstorm` cheapest→ambitious ranking on that
  area.
- Propose findings as tasks via the Core Quest MCP `propose_task` tool. Claude-created
  tasks land as `approval_status='proposed'` and are hidden from the board until Matt
  approves (see `CLAUDE.md` → "Task-management track").

## Out of scope (guardrails — never do)
- **Any** code change, migration, deploy, or PR. This Routine is **read-only** (mirrors
  `work-checker.md`).
- Auto-approving its own proposals. Proposals wait for Matt.
- Proposing game/combat work — that layer is **parked**; scope proposals to the task/app
  layer.
- More than one area per run (keeps proposals focused and the queue small).

## Definition of done (per run)
- Exactly **one** area scouted.
- 0–3 proposed tasks created (quality over quantity — propose nothing if nothing's worth
  it, and say so).
- Each proposal cites the **source** (file/commit) that motivated it, not prose.
- A short report to Slack + a `memory.sessions` row, in the plain-language,
  cite-the-source style of `automation/morning-review.md`.

## Drift signals (for the morning review to flag ⚠️)
Off-goal if it: made any code change; approved its own proposal; proposed game-layer work;
scouted more than one area; or produced proposals with no source citation.
