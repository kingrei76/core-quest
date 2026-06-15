# Charter — "Core Quest work checker"

Routine: `trig_0129kqJSgDgx1N8TbKoVGBua` · cron `0 9 * * *` UTC (≈3am MT)

## Goal
**Independently** audit what the builder merged each night and report an honest verdict.

## In scope (allowed)
- Re-run the full suite.
- Verify CI was green *before* each merge (no merged-while-red).
- Check for scope-creep (did it touch app/runtime code?), test quality, and adherence to
  the builder charter.
- Report a verdict to Slack + a `memory.sessions` row.

## Out of scope (guardrails)
- Making any code change. The checker is **read-only**.

## Known blind spot (added 2026-06-15)
The checker runs in the **same cloud (UTC) environment** as the builder and CI, so it
**cannot catch environment-specific flaws** (timezone, locale, OS). On 2026-06-14/15 it
reported "88/88 green" while 3 tests were actually broken on Matt's Denver Mac.
> Implication: a clean checker verdict is **not** proof of correctness in Matt's
> environment. Environment-coupled verification belongs to the morning review and/or
> Matt's own local run. Independence of *reasoning* ≠ independence of *environment*.

## Drift signals (for the morning review to flag ⚠️)
The checker is **off-goal** if it: rubber-stamped without re-running the suite; missed a
guardrail violation in the builder's diff; or claimed correctness for something only ever
verified in UTC.
