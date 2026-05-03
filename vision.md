# CORE Quest — Vision

> Status: living doc. The roadmap below is aspiration, not commitment.
> The **only** thing being actively planned right now is the **art &
> world direction** (the next big rock). Everything past that is
> intentionally vague until art lands.

---

## Why this doc exists

CORE Quest started as a sleek RPG-themed task PWA. Phases 2–5 built a
real RPG spine — XP, levels, HP/MP, stats, classes by highest stat,
boss quests, sub-quests, achievements, daily/weekly challenges, streaks.
The bones of a game are here. What's missing is the *feeling* of one.

The user wants to turn this from a "task tracker with RPG flavor" into a
game they're **excited to develop**, where:

- normal weekly tasks slowly make the character stronger
- **Weekly Sub-Bosses** are real-life sub-goals dressed as encounters
- **Quarterly Big Bosses** are quarterly life goals dressed as raid bosses
- powers, skills, and gear unlock over time as systems deepen
- *eventually* (way down the line) combat becomes a real grid-tactics
  layer — Fire Emblem / Triangle Strategy style — where weekly/quarterly
  bosses are actually fought on a battlefield with units

That eventual end-state is the north star. None of it gets locked in
yet. The first thing we have to nail is **what this world looks
like**, because every system after that gets visually & tonally
constrained by the answer.

---

## The next big rock: Art & world direction

**Goal of the next Claude Design session:** explore 3–4 distinct
visual directions, pick a winner (or a "lead with backups"), and walk
out with enough conviction to start commissioning / generating actual
assets the week after.

Combat mechanics, story, skill trees, gear systems are **all parked**
until art is decided. Locking art first prevents the trap of
designing systems that don't fit the look (e.g., designing a gritty
soulslike loop, then trying to draw it in chibi).

---

## Where we're starting from (visual identity audit)

Today's app is a **modern dark-fantasy quest tracker** with strong
RPG-game UI conventions already embedded. Useful to know what we'd
keep vs throw away with each art direction.

**Palette (`src/styles/tokens.css`)**
- Backgrounds: deep navy `#1a1a2e` → blue `#16213e` → teal `#0f3460`
- Accents: gold `#ffd700` (prestige/boss), cyan `#00d4aa` (XP)
- Resources: HP red `#e94560`, MP blue `#4a90d9`
- Categories color-coded; difficulty tiers gray→purple

**Typography**
- All serif. `Cinzel` (display), `Cormorant Garamond` (body),
  `Caveat` (handwritten accent for numbers). Reads "literary
  high-fantasy" not "arcade".

**Game-like UI already in place**
- HP/MP bars (`HPMPBar`), XP bar with cyan gradient (`XPBar`)
- Stat blocks for VIT/WIS/FOR/CHA (`StatBlock`)
- Achievements grid with locked/unlocked states
- Boss-quest gold border + star marker (`QuestCard.module.css:45`)
- Sub-quest nesting, streak flame counter, framer-motion swipe
- `framer-motion` is installed and battle-tested for swipe; available
  for any future micro-animations

**What's deliberately absent**
- No sprites, no character portraits, no battle screen, no map
- No emoji-as-icon strategy (a few exceptions — fire 🔥 for streaks)
- Custom SVG sprite at `public/icons.svg` only used for social links
- No spring physics or bounce — motion language is precise & controlled

**Implication for art direction:** the current UI reads as a *menu
screen* of a game, not the game itself. Whatever visual style we
pick, the menu is roughly right; the **game viewport, character,
encounters, and world** are the blank canvas.

---

## Art style options to explore

Four distinct directions, ordered roughly from cheapest-to-produce
to most-expensive. Each has a reference game so you can scroll
screenshots in 30 seconds.

### A. Modern detailed pixel art (HD-2D-adjacent)
**References:** *Sea of Stars*, *Chained Echoes*, *Octopath Traveler*,
*Triangle Strategy*. Bigger pixels (32×32 sprites), modern lighting,
hand-painted backgrounds.

- **Pro:** absolutely the strongest "this is a real game" signal.
  Scales naturally to a tile-based grid (Fire Emblem) when we get
  there. Huge asset pool on itch.io. Maps to the eventual end-state
  better than any other option.
- **Pro:** can co-exist with current dark navy palette — Sea of
  Stars uses a similar twilight palette.
- **Con:** **fights the serif typography hard.** Pixel art wants
  pixel fonts (or at least grotesks). Cinzel + 32px sprites looks
  uncanny.
- **Con:** animation per character is real work — even idle + walk +
  one attack is meaningful artist time.
- **What we'd change:** typography redo (likely). Asset pipeline gets
  set up (sprite sheet conventions, pixel snap, integer scaling).

### B. Hand-drawn storybook / illustrated
**References:** *Hollow Knight*, *Gris*, *Slay the Princess*, *The Banner Saga*.
Painterly, atmospheric, often mood-first over animation-rich.

- **Pro:** **keeps the literary serif vibe completely.** Cinzel +
  Cormorant + an illustrated background looks intentional, premium.
- **Pro:** quarterly big-boss reveals can be full-screen illustrated
  cards — very satisfying milestone moments.
- **Con:** scaling to grid tactics later is awkward — Banner Saga
  managed it but it's expensive. Might mean accepting that combat
  stays "card-based encounter" rather than full grid.
- **Con:** harder to find pre-made assets; per-illustration cost is
  high if commissioned.
- **What we'd change:** keep typography, add an illustration framing
  layer to encounters. Probably no animated walk cycles — characters
  pose between turns.

### C. Chibi / cozy cartoon
**References:** *Stardew Valley* portraits, *Cozy Grove*, *Cult of the
Lamb*, *Finch*. Approachable, character-forward, friendly.

- **Pro:** sustains motivation longer than XP-grind aesthetics —
  research on Finch shows emotional attachment beats extrinsic rewards
  for long-term retention.
- **Pro:** plenty of asset packs, easy to commission, easy for a
  generative pipeline.
- **Con:** **biggest visual departure from where we are now.** Dark
  navy + gold + cinzel does not say "cute". You'd be redesigning
  the whole UI around the character, not adding a character to the
  current UI.
- **Con:** can feel tonally weird for "Big Boss = my Q3 revenue goal."
  Cute-fighting-existential-dread is a tone choice — fine if intentional.
- **What we'd change:** essentially a full reskin. New palette
  (warmer), new typography (rounded sans + soft serif), new spacing
  language (more padding, more curves).

### D. Tactical RPG sprite (Fire Emblem GBA / Tactics Ogre)
**References:** *Fire Emblem: Sacred Stones*, *Tactics Ogre*, *Final
Fantasy Tactics Advance*. Small sprite + portrait combo, animated
combat cut-ins.

- **Pro:** **maps directly to your end-state.** No re-pivot when
  combat lands.
- **Pro:** small art footprint per unit (16×16 map sprite + portrait +
  battle pose).
- **Con:** very few good asset packs at this fidelity; usually
  commissioned per character. Most expensive option per unit.
- **Con:** dated by some standards — feels deliberately retro, which
  may or may not be the read you want.
- **What we'd change:** typography redo (similar to A), explicit
  decision to commit to the grid-combat end-state from day one.

---

## Concrete Claude Design prompts to try

For each style, generate the same three views so you can compare
apples-to-apples:

1. **Character portrait** — your character (Adventurer class), full
   body, idle pose, against a transparent / solid bg.
2. **Quest card** — a single quest in the chosen style (showing title,
   difficulty, XP, "Boss" tier with a small enemy peek).
3. **Encounter screen** — character on left, enemy ("Q3 Revenue Goal"
   labeled as e.g. "Treasurer of Avarice") on right, HP bars, action
   buttons. Even a static mockup.

**Suggested seed prompts** (paste, then iterate):

> "Modern HD-2D pixel art RPG character portrait, 32×32 base, gold
> & cyan accents, dark navy background, Sea of Stars / Chained Echoes
> style"

> "Hand-drawn storybook illustration of an adventurer, painterly, dark
> jewel tones (navy + gold + teal), Banner Saga / Gris influence,
> serif title 'Apprentice of CORE Quest'"

> "Chibi RPG character, cute proportions, warm palette, soft outlines,
> Cult of the Lamb / Cozy Grove style, friendly expressive face"

> "Fire Emblem GBA tactical RPG sprite, 16×16 map sprite + paired
> 64×64 portrait, palette swap variants (Warrior / Scholar / Merchant
> / Diplomat)"

Once you pick a leading direction, codify a small **style guide**
(palette, typography, spacing, asset specs) before any asset is built
for real.

---

## Constraint we should respect (whichever style wins)

The point of CORE Quest is **real-life productivity dressed as a
game**. The art should reinforce that — not bury it. Two patterns
to avoid:

- **Habitica trap:** so much menu / multi-currency / nested stat
  navigation that the "game" gets in the way of the actual habit.
  We're already at risk of this; new art shouldn't accelerate it.
- **Reskin trap:** beautiful art, but the underlying loop is still
  "tap a checkbox." The character has to *do something visible* when
  a quest is completed (an animation, a reaction, an HP tick on the
  enemy, a coin pop). This is the smallest hook that turns "checking
  a box" into "playing a game."

---

## Long-term roadmap (parking lot — not committed)

> Captured here so it's written down. Don't plan against this; we'll
> revisit each rock once the previous one is real.

| # | Rock | Status |
|---|------|--------|
| Now | **Art & world direction** | actively planning |
| Next | Apply chosen style to existing UI (menu/character/quests) | pending art lock |
| Then | **Combat v0** — character does *something visible* when a quest is completed (damage tick on a placeholder enemy) | pending art |
| Then | **Weekly Sub-Bosses** as real-life sub-goals you fight across a week | pending combat v0 |
| Then | **Quarterly Big Bosses** mapped to quarterly life goals | pending sub-bosses working |
| Later | Skills, gear, character class progression | TBD |
| Eventually | **Fire Emblem-style grid combat** with multiple units | north-star, may take years |
| Maybe | Story / narrative chapter system | optional, TBD |

The user is explicit that **mechanics and story** are deliberately
unplanned right now. Art locks first, then mechanics with several
ideas in hand, then story emerges from both.

---

## Architecture decision (deferred)

Architecture for the eventual game layer was discussed in the same
session that produced this doc. Headline conclusion:

- **No game engine needed** for phases 6–9 (character art, encounter
  screen, weekly/quarterly bosses). React + `framer-motion` + sprite
  sheets handles all of it.
- **The inflection point is grid combat** (the eventual Fire Emblem-
  style end-state). At that point, evaluate **PixiJS** (renderer-only,
  React keeps state) or **Phaser** (full engine) — never Unity / Godot.
- **Set asset conventions now**, independent of engine: target sprite
  sizes, texture atlas format (Aseprite + JSON), animation naming.
  Whatever art is commissioned/generated should be reusable across
  any future renderer.

The first proof point for this architecture is the **Encounter Spike**
described in `docs/encounter-spike.md` — a ~90-min prototype that
proves DOM-based animation feels good before committing.

---

## What stays decided regardless of art direction

These are already wired and shouldn't be touched while we explore:

- The XP / level / HP / MP / stat math (`src/utils/rpg.js`)
- Difficulty → XP & stat-gain table (`src/config/constants.js`)
- Boss flag on quests + sub-quest auto-complete (Phase 4.2)
- Weekly/daily challenges (Phase 4.3) — these are the natural home
  for "Weekly Sub-Boss" mechanics later
- Achievements catalog (Phase 4.4) — natural home for skill/power
  unlock UI
- iPhone Reminders auto-import + push notification dispatcher
- Supabase schema + the handoff workflow in `CLAUDE.md`

---

## Open questions to bring into the design session

Things we don't have to answer today, but worth bringing into the
Claude Design session:

1. **Tone:** heroic & earnest? Deadpan absurdist? Cozy melancholic?
   Soulslike grim? This decides which of A–D actually fits.
2. **Character identity:** is "the character" *you*, or a separate
   avatar you guide? Affects portrait/customization scope.
3. **Boss visual language:** are bosses "monsters" (Treasurer of
   Avarice, Hydra of Procrastination) or are they more abstract
   (a literal mountain you climb)? Two very different art briefs.
4. **Animation budget:** static portraits + UI motion only, vs. real
   walk cycles & combat animations? Decides whether pixel art (A) or
   hand-drawn (B) is more realistic.
5. **One character or party?** End-state is grid tactics with units,
   so a party is implied — but does the party exist visually from day
   one, or only when grid combat lands?

These are the conversations to have *with art on screen*, not before.

---

## Critical files to know about (for future sessions)

- `src/styles/tokens.css` — all design tokens; this is where any new
  palette/typography lands first
- `src/index.css` — Google Fonts loader; swap here to test new
  typefaces
- `src/components/character/` — character page + all stat / HP / MP /
  XP / streak / achievement UI; this is the natural "menu screen"
- `src/components/quests/QuestCard.jsx` — most-touched component; any
  art-direction change shows up here first
- `public/icons/` — PWA icons; first thing to refresh once a brand
  mark is decided
- `CLAUDE.md` — conventions + Supabase handoff workflow; always
  re-read at session start
- `docs/encounter-spike.md` — the prototype that validates the
  DOM-only combat architecture

---

## Verification (when does this rock count as "done")

This planning rock is done when, after the next Claude Design
session, we have:

1. A chosen primary art style (A / B / C / D / hybrid)
2. At least one mockup of each of: character portrait, quest card,
   encounter screen — in that style
3. A short **style guide** doc (palette + typography + spacing +
   asset specs) committed to `docs/` or appended here
4. A pruned roadmap: what changes in the existing UI to apply the
   new style, in what order

Then — and only then — we start planning the next rock (combat v0).
