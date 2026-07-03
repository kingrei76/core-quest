# Charter — "Core Quest test builder"

Routine: `trig_013g7TRSf9SyUpWoHWsWcozK` · cron `0 8 * * *` UTC (≈2am MT)

## Goal
Grow Core Quest's automated test coverage **one milestone per nightly run**, without ever
changing how the app behaves.

## In scope (allowed)
- Add or extend test files (`*.test.js` / `*.test.jsx`) and test configuration.
- Add **test-only** devDependencies (vitest, testing-library, jsdom, etc.).
- Edit the CI workflow strictly to make the tests run and pass.

## Out of scope (guardrails — never do)
- Change application/runtime code to make a test pass. **Tests adapt to the code, not the reverse.**
- Touch game-balance values or the known `levelProgress` quirk.
- Any non-test feature work (e.g. the morning briefing, game features).

## Definition of done (per run)
- Exactly **one** milestone's tests added.
- `npm test` green locally before opening the PR.
- PR is "why-led" (explains the intent, not just the diff).
- CI green on the PR → squash-merge → confirm post-merge CI green.
- Report to Slack + log a `memory.sessions` row.

## Working-style disciplines (added 2026-07-03 — from the `.claude/` Fable kit)
These make the nightly agent *behave* like the working method in `.claude/` (see
`CLAUDE.md` → "Working style"), without new infrastructure:
- **Implementation notes + Deviations.** Maintain
  `docs/design/<milestone>-implementation-notes.md`. When an edge case forces leaving the
  plan, pick the conservative option, log it under **Deviations** (plan said / hit / chose
  / why), and keep going. (Mechanism: the `implementation-notes` skill.)
- **Quiz-style what-changed note as a merge gate.** The PR body (or a
  `public/reports/<milestone>-<date>.html`) leads with a short "what changed / what to
  understand" summary + a few questions on the load-bearing points. This is the human
  counterpart to the checker's known UTC/env blind spot — a green suite is not proof Matt
  understands what shipped. (Mechanism: the `quiz` skill.)
- **Cite source, not prose.** The Slack report and PR reference the file/commit that is the
  source of truth, not a paraphrase. (Mechanism: the `references` skill.)

## Determinism requirement (added 2026-06-15)
Tests **must pass regardless of the machine's timezone/locale.** Pin the clock
(`TZ=UTC` in the test scripts) and treat a `YYYY-MM-DD` value as a *calendar date*
(build from parts in local time; never `new Date(str)` + `toISOString`).
> Why: a weekend M3 test was UTC-only and failed on Matt's America/Denver Mac while
> looking green in CI. See `patterns/timezone-flaky-tests-utc-ci-and-checker-blindspot`
> in the knowledge vault.

## Drift signals (for the morning review to flag ⚠️)
A merged change is **off-goal** if it: edits app/runtime code rather than tests; covers
more than one milestone; touches `levelProgress` or balance values; merged without green
CI; or adds a timezone/locale-dependent test.
