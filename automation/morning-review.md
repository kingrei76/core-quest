# Morning Review — "Overnight on your projects" digest

Instruction set for the morning briefing routine. **B1** builds Section ① only;
Section ② (AI news + "how this could upgrade SaaSless Forge") is added in **B2**.

## When
Early morning Mountain Time, after the overnight autonomous routines have finished
(builder ≈2am MT, checker ≈3am MT).

## Inputs to gather
1. **Merged PRs in the last ~24h** on `kingrei76/core-quest`
   (`gh pr list --state merged --search "merged:>=YYYY-MM-DD"`), with titles, authors,
   and diffs (`gh pr diff <n>`).
2. **CI status** for each merge (`gh run list` / `gh run view`).
3. The builder + checker **Slack reports** and `memory.sessions` rows from last night.
4. The relevant **charter(s)** in `automation/charters/`.

## The judgment (per merged change)
Compare the actual diff against the responsible agent's charter and emit a verdict:
- **✅ on-goal** — within charter scope, CI green, no guardrail violated.
- **⚠️ possible drift** — name exactly *what* and *why*, citing the charter rule.

Apply each charter's "Drift signals". **Remember the checker's blind spot:** a clean
checker verdict is *not* sufficient for environment-coupled correctness (timezone/locale)
— call it out explicitly when something was only verified in UTC.

## Output — one Slack message (plain language; Matt is non-technical)
```
🌅 Overnight on your projects — <date>

<Project name>
• What changed: <one line>
• Safety: tests <pass/fail>, CI <green/red>
• Stayed on-goal? <✅ yes / ⚠️ heads up: ...>
• See it / test it: <PR link>  ·  run locally: git pull && npm ci && npm test
```
- One block per project that had activity.
- If nothing merged: say so plainly — `No overnight changes.`
- Keep it skimmable. Lead with the ⚠️ items if any.

## Section ② — AI & Claude Code news (B2)
Appended to the same message, below Section ①.

**Sources (high signal, low noise):**
- Claude Code releases — `https://github.com/anthropics/claude-code/releases.atom`
- Claude Code CHANGELOG (raw) — `https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md`
- AINews — `https://news.smol.ai`
- r/ClaudeCode — `https://www.reddit.com/r/ClaudeCode/.rss`
- Anthropic news — `https://www.anthropic.com/news`
- A live web search for "Claude Code" + "AI agents"
- **Exclude X/Twitter.**

**Procedure:**
1. Pull the above, keep items from roughly the last 24–48h.
2. Rank ~5–8 by relevance to Matt's actual operation (autonomous agents/routines,
   hooks, MCP, model/cost changes, anything affecting client builds).
3. For each kept item: one plain-language line + a short **"→ for us:"** tie-in to
   SaaSless Forge's stack (Core Quest routines, client repos, the memory system).
4. End with a one-line **"Worth acting on"** call-out if anything is genuinely useful.

**Tone:** plain language, skimmable, no hype. Matt is non-technical. Skip items with
no practical relevance rather than padding the list.

## Delivery
- Post via the **Slack connector** (`slack_send_message`) — NOT the paid @Claude app.
  Decision 2026-06-15: staying off Slack Pro, so delivery is one-way (a posted digest);
  Matt acts on items from the CLI or claude.ai/code, not via an in-Slack @mention.
- **Channel routing** (set 2026-06-15):
  - Section ② (AI & Claude Code news) → **#ai-news** `C0BANUXQVKQ` (public).
  - Section ① (overnight project digest) → Matt's DM `D0ARGJ9N76K` for now;
    repoint to a dedicated project channel (e.g. #core-quest) once Matt names one.
- **B1** = manual trigger (run by hand, review the output). **B3** = nightly schedule
  as a Claude Code Routine pointed at this file.

## Design note — why charters exist
A drift check is only meaningful against a written goal. The `automation/charters/`
files are that yardstick. When a routine's scope changes, update its charter first.
