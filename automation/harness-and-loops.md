# Changing the harness · loops · scheduled agents — and using Fable while it's free

How to make Claude *do things automatically* on this project, which mechanism fits which
moment, and how to lean on Fable now (while it's free) in a way that keeps working on Opus
later. This is the "wiring" companion to the working-method skills in `.claude/` — those
say *how* to work; this says *when the harness fires them*.

## The four mechanisms (pick by the moment you want to react to)

| Mechanism | Fires on | Event-driven? | Runs where / on what model | Cost |
|---|---|---|---|---|
| **Routines** (`create_trigger` / CronCreate) | a **clock** (cron or one-shot) | ❌ time-only | a cloud Claude session | API-metered |
| **GitHub Actions** (`.github/workflows/`) | real **git events** (push / merge to `main`) | ✅ true events | ephemeral CI runner; `ANTHROPIC_API_KEY` | API-metered |
| **Claude Code hooks** (`.claude/settings.json`: `SessionStart`, `PostToolUse`, `Stop`) | a **local session** event | ✅ but **local Mac only** | your interactive Claude Code | **free on Fable / your plan** |
| **`/loop`** skill | a recurring **interval** in a live session | ❌ interval | the session you start it in | **free on Fable / your plan** |

Two honest facts that decide most designs:
- **Routines can't hear a git event** — they only wake on a schedule. So "the instant I
  merge" has exactly two homes: a **GitHub Action on merge-to-main** (built — see
  `blindspot-scout.yml`) or a **local `Stop` hook**. Anything Routine-based is really
  *"poll every N hours and notice."*
- **"Fable while free" applies to interactive Claude Code, not the API.** Hooks and
  `/loop` run inside your interactive session, so they ride your Fable/plan usage.
  Routines and GitHub Actions bill the Anthropic **API** regardless of model — so the
  free-Fable trick does **not** make those free. Use hooks + `/loop` for the free stuff.

## How each maps to the working-method principles

The principles live in `CLAUDE.md` → "Working style". The harness is how you make them
fire without remembering to:

- **Explore before you build** → a `SessionStart` hook that reminds Claude to run a
  `blindspot-pass` on unfamiliar areas; or a `/loop` scout that pre-scans.
- **Verify before merge** → a `Stop` hook that runs the `quiz` skill at the end of a build
  session, so you never merge un-quizzed.
- **Reflect after you build** → the merge-to-main **blindspot-scout** Action: every build
  triggers a read-only look for what's next (`.github/workflows/blindspot-scout.yml`).
- **Deviate conservatively + log** → nothing to wire; it's a discipline the
  `implementation-notes` skill carries during the build itself.

## Recipes

### 1. Local `Stop` hook — "when I finish a build, quiz me" (free on Fable)
The most "change the actual harness" move. In `.claude/settings.json` on your Mac, a `Stop`
hook runs a command when a session ends. Point it at a reminder (or, more ambitiously, a
headless `claude -p`) to run the `quiz` skill before you merge. Use the **`update-config`
skill** to write this safely — hooks are executed by the harness, so they must be exact.
Because it runs in your interactive Claude Code, it costs nothing extra on Fable.

> Caveat: hooks fire for **local** sessions only, not web/remote ones. Good for your Mac
> workflow; it won't cover a build you did from claude.ai/code.

### 2. `/loop` — a recurring scout on Fable, right now (free)
`/loop 30m do a read-only blindspot-pass on one area of the codebase I haven't reviewed
lately and list follow-ups`. Runs every 30 min in the session, on Fable while it's free.
Zero infra. Stop it when you're done. Great for burning free Fable cycles on the cheap
read-only stages (`blindspot-pass`, `brainstorm`) that are model-agnostic anyway.

### 3. Merge-to-main Action — the scout as a build follow-up (built)
`.github/workflows/blindspot-scout.yml`. Fires on every merge to `main`, scopes to the
changed files, files a `blindspot-scout` issue with follow-ups. **No-ops until you add an
`ANTHROPIC_API_KEY` secret.** Setup + deviations:
`docs/design/blindspot-scout-implementation-notes.md`.

### 4. Scheduled Routines — the nightly builder/checker/review (existing)
`create_trigger` (or CronCreate) drives the nightly `test-builder`, `work-checker`, and
`morning-review` (see `automation/charters/`). Time-based, API-metered. Add a new one only
for genuinely scheduled work (e.g. a weekly digest), and give it a charter first — a drift
check is only meaningful against a written goal.

## Durability (the whole point)
Nothing here is pinned to a model. The skills are `model: inherit`; the Action leaves
`--model` unset; hooks and `/loop` just invoke the skills. So you can run the free stuff on
Fable now and the exact same wiring keeps working on Opus 4.8 when Fable flips to paid —
the working style is captured in the prompt text, not the model.

## Where to make changes
- Harness behavior (hooks, permissions, env) → **`update-config` skill** → `.claude/settings.json`.
- A `SessionStart` hook specifically → **`session-start-hook` skill**.
- A recurring in-session loop → **`/loop` skill**.
- A scheduled cloud Routine → `create_trigger` / CronCreate + a charter in `automation/charters/`.
- A git-event automation → a workflow in `.github/workflows/`.
