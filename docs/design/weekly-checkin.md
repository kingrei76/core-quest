# CORE Quest — Weekly Check-in

> Status: **design draft (May 5, 2026)**. Implementation deferred —
> likely Phase 6.7 polish, after combat MVP (6.4) and home-base UI
> (6.5) ship. Depends on the Higher Being layer in
> `docs/design/magic-system.md`.

---

## What it is

A **frank weekly conversation** between the player and a coaching
voice, triggered after a weekly sub-boss is defeated. The
conversation covers:

- What progress was made this week (real, specific — pulled from
  quest data)
- Where the player got stuck or avoided things
- Where to focus next week to keep moving toward the quarterly Big
  Boss

The whole point is that the conversation **doesn't feel like the
app**. It should feel like a coach, a mentor, or a Higher Being
genuinely engaging with the player's actual progress — not a
templated retrospective with checkboxes.

Implementation: a **Claude API call** (Edge Function) with the
player's quest history and a tuned system prompt.

---

## Why it deserves to exist

CORE Quest's whole thesis is that real-life productivity dressed as
a game produces real-life results. The weekly check-in is the moment
the **game speaks back to the player as a coach** — not as flavor
text, but as an actual reflective conversation. It's the bridge
between "playing the game" and "doing the work."

Two things this feature does that the rest of the app can't:

1. **Pattern-recognition the user can't see.** "You completed 9
   physical quests but skipped strength training every Tuesday and
   Thursday." That kind of observation requires a model reading the
   data, not a checkbox.
2. **Forward focus.** Most productivity apps reflect backward.
   This one closes the loop with a forward recommendation tuned to
   the quarterly arc.

---

## Trigger

The check-in fires **after a weekly sub-boss is defeated**. Sub-bosses
are the existing Phase 4.3 weekly challenges, re-skinned per Phase
6.7. Specifically:

- Player completes the final quest in a weekly challenge → sub-boss
  marked defeated
- Defeat triggers the check-in flow on next app open
- Player can defer the check-in once; second deferral counts as
  skipping
- One check-in per defeated sub-boss, capped at one per week

If no sub-boss is defeated that week, no check-in fires. (The lack of
a check-in is itself a signal — possibly a softer "what happened?"
prompt at end of week. Defer.)

---

## Who is speaking?

The voice on the other side of the check-in is **the Higher Being**
the character is bonded to, OR a separate companion / mentor figure
at the home-base. This is the major design choice:

### Option A — Higher Being speaks directly
The check-in IS the Higher Being having a frank conversation with
the player about the team's progress. This is the moment where the
player most directly experiences the bond.

- **Pro:** narratively rich. The faith arc deepens through these
  conversations. The Higher Being's tone evolves with bond level —
  distant and careful at low bond, direct and warm at high bond.
- **Con:** if the Higher Being is "frank" in week 1 when bond is 0,
  it breaks the "nervous to believe at first" arc. Tone has to ramp.

### Option B — Mentor figure at home-base
A named companion character (a "guildmaster," "operator," "broker")
is the voice. The Higher Being remains more elusive; the mentor is
the practical day-to-day coach.

- **Pro:** consistent tone from week 1. The mentor can be frank
  immediately because they're not a faith figure.
- **Con:** weakens the Higher Being layer. Adds a sixth named voice
  to the game.

**Recommendation:** **Option A with a tone ramp.** The Higher Being
speaks, but the **frankness scales with bond level**. Early check-ins
are short, polite, distant — almost transactional. Later check-ins
are direct, warm, and personal. This makes the faith arc *felt*
through the check-in cadence itself. (See `magic-system.md` § "The
Higher Being layer.")

---

## Conversation shape

Not a one-shot. A **short multi-turn exchange** — typically 3 to 6
turns. Each turn is bounded but conversational.

### Round structure (suggested)

1. **Opening reflection** (Higher Being speaks first)
   - Acknowledges the sub-boss defeated, briefly
   - Surfaces ONE specific observation from the week's quest data
2. **Player response** — free text, optional
   - "How are you feeling about it?" / "What got in the way?"
3. **Forward question** (Higher Being)
   - Based on player response (or absence of response), proposes
     one or two areas of focus for next week
4. **Player commits** — picks a focus, or counter-proposes
5. **Closing** (Higher Being)
   - Confirms the commitment
   - One sentence that lands — affirmation, challenge, or quiet
     observation, depending on bond level

User can skip from any step; partial conversations still get logged.

### Tone constraints (locked)

- **Frank, not saccharine.** No "Great job, hero!" If the player
  skipped strength training every Tuesday, the conversation
  acknowledges it. Directly.
- **Short.** Each Higher Being turn is 1-3 sentences max. No
  monologues.
- **Specific.** Reference real quest titles, real categories, real
  patterns. Generic praise is forbidden.
- **Forward-leaning.** Backward reflection is in service of forward
  focus. Don't dwell in retrospective.
- **In character.** The Higher Being's voice ramps with bond level
  (see Phasing).

---

## Data sent to the API call

The Edge Function assembles a payload from the player's data. At
minimum:

- **Quest history (last 7 days):** title, category, difficulty,
  status (completed / failed / abandoned), completion timestamp
- **Weekly challenge / sub-boss data:** name, category, completion
  date, time-to-complete relative to start-of-week
- **Quarterly Big Boss in progress:** title, current progress
  percentage, days remaining
- **Character / archetype context:** which characters earned AP this
  week, current Bond level per character
- **Last week's check-in commitment:** what the player said they'd
  focus on (used to follow up — "you said you'd focus on X — how'd
  it go?")
- **Streak context:** active streaks, broken streaks, comebacks

The system prompt enforces tone, length, and format constraints.

### Privacy note

Quest titles can be deeply personal. The Edge Function should:

- Use a privacy-respecting model (Anthropic API with no training
  retention — confirm at implementation time)
- Never log full quest titles to telemetry
- Allow the user to mark quests as "private — don't include in
  reflections" via a per-quest flag (defer the UI for this)

---

## Implementation sketch

### Where the code lives

- **Edge Function:** `supabase/functions/weekly-checkin/index.ts`
- **Client UI:** new `<WeeklyCheckin />` component, surfaced as a
  modal on app open after sub-boss defeat
- **Storage:** new `weekly_checkins` table (one row per check-in,
  storing the conversation transcript + chosen focus)
- **Schema for table** (rough — design when implementation lands):
  ```sql
  create table weekly_checkins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) not null,
    triggered_by_quest_id uuid references quests(id),
    sub_boss_name text,
    transcript jsonb not null, -- array of { role, content, timestamp }
    chosen_focus text, -- player's commitment for next week
    skipped boolean default false,
    created_at timestamptz default now(),
    completed_at timestamptz
  );
  ```

### Model choice

Use **Claude Sonnet** as the default model for check-ins:

- Fast enough for a real-time multi-turn conversation
- Smart enough to read patterns in quest data and respond specifically
- Affordable enough to scale with weekly active users

Use **Claude Opus** for **quarterly check-ins** (after a Big Boss is
defeated) — these are higher-stakes moments and warrant the better
model.

Use **prompt caching** on the system prompt + character/archetype
context (which doesn't change between turns within one check-in).
Saves cost on multi-turn conversations.

### Cost back-of-envelope (very rough)

- ~2k tokens system prompt + ~1k tokens quest data + ~300 tokens per
  turn × 6 turns ≈ 5k tokens per check-in
- At Sonnet pricing (rough), well under $0.05 per check-in
- At 1 check-in/week/user × 100 active users = ~$5/week → trivial

Quarterly check-in (Opus) costs ~10× more per call, but only happens
quarterly per user. Still trivial.

---

## How the Higher Being's tone ramps with Bond level

The system prompt should adjust based on the speaking character's
Bond level (per `magic-system.md`). Rough table:

| Bond | Tone | Sentence length | Frankness |
|---|---|---|---|
| 0-1 | Distant, observational, polite | Short, careful | Low — Higher Being is "watching" |
| 2-4 | Curious, gently probing | Medium | Medium — starts asking direct questions |
| 5-7 | Warm, frank, personal | Conversational | High — names patterns directly |
| 8-10 | Intimate, challenging, knowing | Whatever serves the moment | Maximum — speaks as if it knows the player better than they know themselves |

This means the system prompt has a **bond-level conditional block**.
At low bond, the prompt instructs the model to keep careful distance.
At high bond, it instructs the model to push.

This is what makes the faith arc *felt* through the check-ins: as the
bond grows, the conversations get realer. That progression is the
narrative.

---

## UI surface

Modal-style, full-screen on mobile. Visual treatment:

- The Higher Being's "presence" is rendered per the magic-system doc
  — silhouette / flicker at low Bond, fully visible at high Bond
- Conversation appears as a chat-style transcript with the player's
  responses inline
- "Choose a focus" appears as a final card with 2-3 buttons + a
  free-text option
- After the conversation ends, the chosen focus is surfaced
  prominently on the home-base screen for the next week ("This
  week's focus: ...")

No notifications during the conversation. No background activity.
Phone goes dark, this is a moment.

---

## What this hooks into elsewhere

- **`magic-system.md` Bond level:** the check-in is the strongest
  Bond-grower in the game. Engaged check-ins (player wrote
  responses, didn't skip) bump Bond.
- **Home-base UI (Phase 6.5):** the chosen focus shows up on the
  home base. The Higher Being's "presence" in the home base reflects
  the most recent check-in's emotional weight.
- **Quarterly Big Boss flow:** a separate but related "quarterly
  check-in" fires after a Big Boss is defeated. Same plumbing,
  different model (Opus), different prompt depth.

---

## Open questions

1. **Higher Being voice — Option A (Higher Being speaks) or Option B
   (mentor figure)?** Recommend A with a tone ramp.
2. **Skip behavior:** if a player skips a check-in, do they still
   earn Bond? Suggest no — the Bond comes *from* engagement.
3. **Multiple sub-bosses in one week:** if the player defeats two
   sub-bosses in one week (e.g., a fast week), do they get two
   check-ins, or one combined? Lean: one combined.
4. **Persistence of check-in history:** does the player browse past
   check-ins? Could be a powerful "see how you've grown" view, but
   it's UI work. Defer to a later phase.
5. **Voice / TTS:** would a future version read the Higher Being's
   lines aloud? Cool but expensive. Defer hard.
6. **Failure mode:** what if the player has had a *terrible* week
   (defeated nothing, skipped most quests)? No sub-boss defeated =
   no check-in. But maybe a softer "soft check-in" fires instead.
   Defer.
7. **Spousal mode:** if a player invites a partner / accountability
   buddy, does the buddy see the check-in? Probably no — too
   intimate. Defer to a hypothetical multiplayer phase.

---

## What "done" looks like for shipping V1

- [ ] Edge Function deployed and tested with a real Sonnet API call
- [ ] `weekly_checkins` table created
- [ ] `<WeeklyCheckin />` modal renders the conversation flow
- [ ] Sub-boss defeat reliably triggers the check-in
- [ ] Bond level updates correctly post-check-in
- [ ] Tone ramp verified at Bond 0, Bond 5, and Bond 9 with realistic
      quest data
- [ ] Privacy: confirmed no quest titles in telemetry; no training
      retention on Anthropic API
- [ ] Cost monitoring: per-user weekly token budget tracked
