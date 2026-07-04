# blindspot-scout (merge-to-main trigger) — implementation notes

## Plan
Fire the read-only blindspot-scout as a **follow-up to every build**, where "a build" =
a merge to `main` (the deploy-as-test moment). Mechanism chosen with Matt: a **GitHub
Action** (`.github/workflows/blindspot-scout.yml`) — the only truly event-driven option,
since Routines wake only on a clock and the PR-webhook feed doesn't deliver "merge" events.

## Decisions
- **Runs Claude via `anthropics/claude-code-action@v1`** with a fixed `prompt:` (automation
  mode, no `@claude` mention). Schema confirmed against the official Claude Code GitHub
  Actions docs (`prompt:`, `claude_args: --allowedTools`, action needs its own
  `actions/checkout`). Source: code.claude.com/docs/en/github-actions.
- **`permissions: contents: read, issues: write` is the real read-only guarantee.** Even
  though the Claude step is allowed `Bash` (needed so `gh issue create` can run), the
  GITHUB_TOKEN cannot push code — so no merge-triggered run can ever change the codebase.
  This is a stronger guarantee than a tool-allowlist alone.
- **Scoped to the diff.** A prep step computes the changed files (`git diff before..sha`,
  with a fallback for first/force pushes) and injects them into the prompt, so the scout
  reads the changed area, not the whole repo — cheaper and more relevant.
- **Safe by default (no-op until opted in).** A guard step skips the whole job unless an
  `ANTHROPIC_API_KEY` secret is set. Mirrors the repo's Slack "all env vars absent ⇒ no-op"
  idiom, so this can merge to `main` without surprising anyone or incurring cost.

## Deviations
- **2026-07-04 — Sink is a GitHub issue, not MCP `propose_task` (as the charter's nightly
  version specified).** Plan said proposals land in the Core Quest task inbox via
  `propose_task`. Hit: doing that in CI needs the MCP server wired into the action
  (`--mcp-config` + `MCP_SHARED_SECRET` + the host URL) — two more secrets and an
  auth path I can't verify from here. Chose the conservative option: file a GitHub
  **issue** (needs only the built-in `GITHUB_TOKEN`), which is visible, reversible, and
  requires zero external secrets. The MCP-inbox path is provided as a documented,
  opt-in upgrade (`.claude/mcp-config.example.json`) — switch to it once the MCP secret
  is set. *Why conservative:* fewer secrets, no coupling to the Vercel MCP server's auth,
  and issues are trivially deletable.
- **2026-07-04 — No model pinned.** Left `--model` off so the action uses the account
  default and the workflow isn't tied to a model that could be deprecated (same durability
  principle as the skills). Commented how to set a cheaper/faster model for cost.
- **2026-07-04 — Only the scout's own output dirs are `paths-ignore`d** (reports /
  prototypes / pitches), not all docs. Just enough to stop the scout chasing its own tail;
  a rare docs-only merge triggering it is harmless.

## Open questions (for Matt)
- **Sink preference:** keep GitHub issues, or switch to the MCP task inbox? (I defaulted to
  issues; say the word and I'll flip it to `propose_task`.)
- **Cost tolerance:** every non-trivial merge to `main` will spend some API budget. If the
  builder Routine merges nightly, the scout runs then too. Add `[skip scout]` to a commit
  message to skip a specific merge. Want a cheaper model pinned, or a cap?

## Setup handoff (what Matt must do to turn it on)
1. Add a repo secret **`ANTHROPIC_API_KEY`** (Settings → Secrets and variables → Actions).
   Until this exists, the workflow skips every run.
2. Merge this branch to `main`. On the next real merge, the scout runs and (if it finds
   follow-ups) files an issue labelled `blindspot-scout`.
3. *(Optional, to use the task inbox instead of issues):* set secret
   **`MCP_SHARED_SECRET`** and switch the workflow to the MCP path per
   `.claude/mcp-config.example.json`.
