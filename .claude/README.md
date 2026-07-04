# Using the working-method kit, day to day

This folder is a set of **skills** and **subagents** that encode a way of working
(captured from "A Field Guide to Fable"). You invoke them just by *asking in plain
language* — you don't need to memorize commands. The descriptions below tell you when to
reach for each one and what to actually say.

The one habit that makes all of it pay off: **explore cheap → decide → build → verify.**
The kit just gives each of those a name so you (and Claude) don't skip them.

---

## The fastest way in — reach for this at this moment

| The moment you're in | Reach for | Just say something like… |
|---|---|---|
| Starting something in an area you don't know | **blindspot-pass** | "I don't know the X code — do a blindspot pass so I can prompt you better." |
| Requirements are fuzzy / you're not sure what you want | **interview** | "Interview me one question at a time before we build this." |
| "What should we even do here?" | **brainstorm** | "Brainstorm 10 ways we could tackle this, cheapest to most ambitious." |
| You need to *see* options before committing | **prototype** | "Mock up 3 wildly different versions as HTML with fake data first." |
| Actively building something non-trivial | **implementation-notes** | "Keep implementation notes and log any deviations as you go." |
| Explaining how something works / justifying a choice | **references** | "Show me where that actually lives — cite the file, don't paraphrase." |
| Ready to get buy-in or share what you made | **pitch** | "Package this into one doc I can drop in Slack, lead with the demo." |
| About to merge after a big session | **quiz** | "Give me a what-changed report and a quiz I have to pass before merging." |
| Non-trivial feature, don't want to think about the order | **deliberate-build** | "Let's do this properly — run the deliberate build." |

If you only remember one line: **"Let's do this properly"** → `deliberate-build` runs the
whole chain and *tells you which stages it's skipping* for a small task, so it never feels
heavy.

---

## What each one is for

**blindspot-pass** *(read-only subagent)* — Makes your *unknown-unknowns* known before you
start. It reads the unfamiliar area and hands back: the mental model, the load-bearing
files, the traps, and "questions you should decide." Use it so your next prompt is sharp
instead of vague.

**brainstorm** *(read-only subagent)* — Generates genuinely different directions (not one
idea in four colors), ranked cheapest → most ambitious, each grounded in what the code
actually allows. Use it when the solution space is wide open.

**interview** — Asks you **one** question at a time, always the question whose answer would
most change the design. Ends with a "Decisions locked" list. Use it to kill ambiguity
before building — not to ask "is this okay?"

**prototype** — Builds throwaway single-file HTML mocks with fake data so you can *react*
to something real. Nothing is wired. For core-quest they land in `public/prototypes/` and
go live on your deployed URL after a merge, so you review on your phone — no dev server.

**implementation-notes** — A running notes file for any real build. Its point is the
**deviation rule**: when reality breaks the plan, Claude picks the conservative option,
logs it under "Deviations," and keeps going — only stopping to ask you when the safe choice
is itself architecture-changing. You get a paper trail of *why*, which feeds the pitch and
quiz.

**references** — The "cite source, not memory" discipline. When Claude explains something,
it points at the file / line / commit / doc, and flags anything it *can't* back as an
assumption. Use it any time you'd otherwise be trusting a confident paragraph.

**pitch** — Turns a finished thing into one shareable doc: demo first, then what/why, then
the notable calls, then a "you might be wondering…" that pre-answers a reviewer's worries.
Use it to get a yes.

**quiz** — Before you merge, hands your own understanding back to you: a report of what
changed + a short quiz on the load-bearing parts. It's an explicit **merge gate** — the
human counterpart to "CI is green but did I actually understand this?"

**deliberate-build** — The orchestrator. Chains the above into
blindspot → interview → brainstorm → prototype → build+notes → pitch → quiz, and names
which stages to skip. Start here for anything non-trivial.

---

## Real day-to-day scenarios

**A. New feature in a part of the app (or a client repo) you don't know well**
> "Blindspot pass on the billing code first." → read the digest → "Now interview me on the
> parts that are still ambiguous." → "Mock two versions." → pick one → build (notes
> running) → "Pitch it for the client." → "Quiz me before I ship."

That's `deliberate-build` end to end. Total order you actually type: four or five plain
sentences.

**B. A decision you're unsure about**
> "Brainstorm 8 ways to handle X, cheapest to most ambitious." → "Interview me on the two
> that matter." Done — you've made a grounded call in minutes without building anything.

**C. Wrapping up a long session before shipping**
> "Give me a what-changed report and a quiz I have to pass before we merge." Don't merge
> until you've actually read it and it makes sense. This is the highest-value single habit.

**D. A quick, well-understood fix**
> Skip almost everything: just build it, keep a one-line note if you deviate, and quiz
> yourself only if it touched something load-bearing. `deliberate-build` will tell you to
> skip the rest — don't perform stages you don't need.

---

## Two rules that keep it from feeling heavy

1. **Skip aggressively.** The kit is a menu, not a checklist. Tiny task → build + maybe
   quiz. The upstream stages (blindspot, brainstorm, prototype) are cheap and read-only or
   throwaway; the downstream ones (pitch, quiz) are for things that ship or need buy-in.
2. **The principles apply even when you don't name a skill.** They're written into
   `CLAUDE.md` → "Working style," so Claude leans this way by default. The skills are just
   the sharp version.

---

## Using this across the whole business, not just this repo

These live in **this repo's** `.claude/`, so they only fire in core-quest. To have them in
**every** project you work in:

- Copy `.claude/skills/` and `.claude/agents/` into your global **`~/.claude/`** on your
  Mac. They'll then be available in every Claude Code session, any repo.
- **Keep the global copies generic.** A few skills name core-quest specifics (the
  `interview` probes about Supabase/realtime; the `prototype` `public/` path). In the
  global version, trim those to the general principle so they fit any project — leave the
  core-quest-flavored version here in the repo.
- The read-only subagents (`blindspot-pass`, `brainstorm`) are already generic — copy them
  as-is.

## Don't want to remember to invoke them?

Wire the harness to nudge you automatically — a `Stop` hook that quizzes you before merge,
a `/loop` that scouts on Fable while it's free, or the merge-to-main scout Action that's
already here. See **`automation/harness-and-loops.md`** for the recipes.
