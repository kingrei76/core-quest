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

## Delivery
- Post via Slack `slack_send_message`. **Channel:** _TBD — confirm with Matt._
- **B1** = manual trigger (run by hand, review the output). **B3** = nightly schedule
  as a Claude Code Routine pointed at this file.

## Design note — why charters exist
A drift check is only meaningful against a written goal. The `automation/charters/`
files are that yardstick. When a routine's scope changes, update its charter first.
