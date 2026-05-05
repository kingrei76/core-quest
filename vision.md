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

## Decisions locked (May 4, 2026)

After tonight's itch.io browsing and reflection, the following are no longer open. They become the constraints for the next design session and everything downstream.

### Art direction: modern HD-2D pixel art (Style A — winner)
- References: **Octopath Traveler**, **Sea of Stars**, **Chained Echoes**.
- Detailed pixel sprites, hand-painted backgrounds, modern lighting.
- Layout / input simplicity influence from **Shogun Showdown** (sideways feel, single-button-friendly, phone-readable scale).
- Acknowledged trade-off: highest art-production cost of the four candidates. AI tools (PixelLab + Aseprite) handle the sprite layer; the "HD-2D" depth/lighting effect requires custom shader/composition work and is the spike's main technical risk.

### Setting: modern-day portals + a team at a home base
**Frame:** real-world team of specialists at a home base. Modern-day setting. Portals open into themed monster worlds. The player commands a *team*, not a single avatar.

**Quest → portal mapping**
- Individual quest → a portal (or a room within a portal)
- Sub-quests → mini-portals or chained rooms within a portal
- Weekly challenges → mini-bosses
- Quarterly bosses → main bosses at the end of a portal arc
- Different team members enter different portals based on the quest's category

### Team model: fixed small roster, archetype-based
3-5 named characters with class identities. Initial archetype sketch (refine in design):
- **Warrior** — frontline melee, handles physical category quests (workouts, fitness)
- **Mage** — arcane caster, handles mental / cognitive quests (study, learning)
- **Rogue** — finesse / agility, handles career / strategic quests
- **Diplomat** — social / charm, handles social / relationships
- **Scholar** — wisdom / patience, handles creative / reflective

Final names, classes, and category mapping are a design-phase decision. Categories that don't map cleanly fall back to a "general" archetype (likely Warrior or Scholar).

### Combat model: action-point economy + manual play
The user's invented hybrid model:
1. Completing a quest in real life awards **items** that grant **action points** (AP) to the character whose category was tackled.
2. AP accumulates per character.
3. The user opens a character's portal at will and *spends* AP to perform combat actions.
4. Combat is manual and on-demand, but driven by an economy fed by real productivity.

This separates the *earning* of combat power from the *playing* of combat while keeping them tightly coupled. Three risks to watch in design:
- **Friction trap:** if combat requires too much ritual, users skip it and the loop dies.
- **Balance:** too few AP per quest = rare combat; too many = inflation.
- **Bookkeeping:** AP per character per portal needs a real schema (extend `characters` or new `character_action_points` table).

### Orientation: leaning portrait, decided in spike
- User leans **portrait everything** with a letterboxed sideways combat strip (no rotation lock).
- Final call deferred to the encounter spike (`docs/encounter-spike.md`) — must be tested on real iPhone PWA before committing.
- Two backup options remain: portrait CRUD + landscape-lock combat, or full landscape redesign.

### Equipment: deferred
Characters earn equipment based on portals completed. Cosmetic-only vs. stat-bearing vs. both is deferred to Phase 6.6 — don't over-design it now.

---

## Decisions locked (May 5, 2026)

A second design pass added the magic system spine and a coaching layer. Both are foundational — every later combat / story decision should respect them.

### Magic system: 3-tier Jungian power set per character
Each character has three powers, unlocked in sequence: **Persona** (their conscious self), **Shadow** (the inverse they repress), and **Integration / Self** (both held at once).

Only **Power 1 (Persona)** ships in early phases (Phase 6.4 Combat MVP). Powers 2 and 3 are designed-on-paper and deferred to Phase 7+ so the player has time to bond with the Persona before the framework expands.

Full spec: **`docs/design/magic-system.md`**.

### Higher Being layer: powers come from a bonded entity
Powers are *granted* by a Higher Being (option A: five distinct Patrons / option B: one refracted entity — recommendation B). The character starts skeptical. As bond grows through real-life quest engagement, more powers unlock. The faith arc is core narrative, not flavor.

Visual: Higher Being is barely visible in early home-base scenes (silhouette / flicker), fully present at high bond. Affects what the home-base art needs to support.

### Weekly check-in: post-sub-boss coaching conversation
After each weekly sub-boss is defeated, the player has a **frank multi-turn conversation** with the Higher Being (or mentor — design choice). Conversation is generated by a **Claude API call** (Edge Function), uses real quest data, and ends with the player committing to one focus for next week.

The conversation tone *ramps with Bond level* — distant and polite at low bond, direct and warm at high bond. This is how the faith arc is felt, not just told.

Full spec: **`docs/design/weekly-checkin.md`**. Implementation deferred to Phase 6.7.

### Modern-weapon Persona variants
Each Persona power is **mechanically skin-agnostic**. Fighter's "Crashing Strike" is a sword arc by default but can be re-skinned as shotgun blast (Tactical Operator), chainsaw rev (Berserker), etc. Encode this from day one — no hard-coded weapon types in Power 1 code. Catalog of allowable skins per archetype is locked during Phase 6.1 art generation.

---

## The next big rock: execute the chosen direction

The art-direction question has shifted from "choose between candidates" to "execute on Style A and validate it works for our specific setup."

**Next Claude Design session goal (revised):** produce concept art in HD-2D pixel for **the 5-archetype roster**, **at least one portal background**, **a home-base scene**, **a sample boss**, and **a combat scene mockup** — all in our modern-day-portal frame. Walk out with locked reference images for the style bible (`docs/design/style-bible.md`).

Combat mechanics now have a known shape (action-point economy). Skill trees, gear systems, and story remain open but will be informed by the locked art.

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

### A. Modern detailed pixel art (HD-2D-adjacent) — **CHOSEN (May 4, 2026)**
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

## Next session — concrete Claude Design prompts (revised for Style A)

Style is locked. The next session is about producing **the actual reference images** that lock in HD-2D pixel for our specific roster + setting, not exploring alternatives. Each prompt assumes "Sea of Stars / Octopath Traveler / Chained Echoes" as the base style anchor.

Generate these views, in order:

1. **The 5 archetype portraits** — one per character, full body, idle pose, transparent background. **The most important deliverable** — these become canonical reference images for every later asset.
2. **Home-base scene** — modern-day room or hideout where the team rests between portals. Establishes the modern-day frame.
3. **One portal entrance** — modern-day environment with a glowing rift opening into a fantasy world. Establishes the portal visual language.
4. **One sample boss** — a creature inside a portal. Pick a category (e.g., "Boss of Procrastination" for the Mage's portal) to make it concrete.
5. **Combat scene mockup** — sideways letterboxed strip showing one archetype mid-attack on the sample boss, with an AP indicator UI element.

### Suggested seed prompts (iterate from these)

> "HD-2D pixel art RPG character portrait, 64x64 base sprite scaled up, modern detailed pixel art in the style of Sea of Stars and Octopath Traveler, hand-painted lighting. **Warrior archetype:** modern-day clothing with athletic / gym cues, fantasy weapon as accent, frontline melee energy"

> "Same style and character grammar. **Mage archetype:** modern-day scholar / student clothing, glasses or book motif, arcane accent, mental / cognitive theme"

> "Same style and character grammar. **Rogue archetype:** modern-day business-casual or street look, tactical / strategic accents, finesse"

> "Same style and character grammar. **Diplomat archetype:** modern-day professional / social look, charisma and approachability cues"

> "Same style and character grammar. **Scholar archetype:** modern-day artist / writer / creative look, reflective and patient demeanor"

> "HD-2D pixel art interior scene: modern-day urban hideout / safehouse for a team of specialists. Evening lighting. Walls hint at past portal adventures (trophies, notes, a closed portal frame). Sea of Stars composition style"

> "HD-2D pixel art portal entrance: modern-day rooftop or alley with a swirling magical rift opening into a fantasy world. Dramatic lighting. The contrast between concrete / steel and fantasy is the point"

> "HD-2D pixel art boss creature: 'Boss of Procrastination' — a sluggish, comfortable monster surrounded by unfinished objects. Pixel art, Octopath Traveler boss-pose composition, intimidating but lazy"

> "HD-2D pixel art sideways combat scene, letterboxed view (wide, short aspect ratio): mage on left mid-cast, boss on right, AP gauge UI element in corner. Shogun Showdown layout influence + Sea of Stars rendering"

### What to bring back into the style bible

For each generated image you keep:
- The image itself (downloaded, named clearly e.g. `warrior-v1.png`)
- The exact prompt that produced it
- Any seed / parameter values
- Notes on what to *change* on the next pass (e.g., "cooler palette," "less detail in background")

These all go into `docs/design/style-bible.md`.

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

## Phase 6 — Visual + narrative overhaul (concrete roadmap)

This is what tonight's decisions trigger. Each step is gated by the previous one. Replaces the prior speculative roadmap.

### 6.1 — Art direction lock-in (this week)
- Next Claude Design session: produce concept art per the prompts above
- Outputs: 5 archetype portraits, 1 home-base scene, 1 portal entrance, 1 sample boss, 1 combat-scene mockup
- Lock canonical reference images into `docs/design/style-bible.md`
- Pick AI tooling subscription: **PixelLab** (~$10/mo) for sprite production
- Acquire **Aseprite** ($20 one-time) for cleanup and sprite-sheet export
- **Done when:** style bible exists with locked reference images and a documented prompt recipe per archetype

### 6.2 — Encounter spike (1-2 days, throwaway branch)
- Already specced in detail at `docs/encounter-spike.md` — DOM + framer-motion + sprite sheets approach
- Build the throwaway combat scene per that spec: one character vs. one enemy, single-button attack, HP swap
- Test all three orientation options on real iPhone PWA: portrait + letterboxed strip, portrait CRUD + landscape combat, full landscape
- Decide AP storage shape: extend `characters` row vs. new `character_action_points` table
- **Done when:** orientation locked from real-device testing; rendering approach validated (DOM-only / DOM + canvas overlay / Pixi); AP schema sketch exists

### 6.3 — Schema migration: team of characters
- Migrate `characters`: from one-row-per-user to many-rows-per-user with `archetype` field
- Add AP storage (per spike decision)
- Stub `equipment` table (columns deferred to 6.6)
- Update `useCharacter` / `CharacterContext` to expose the team roster
- Keep HP / MP and stats user-level for now unless spike says otherwise
- **Done when:** `useCharacter()` returns a team of 5; existing screens still render correctly

### 6.4 — Combat scene MVP (behind feature flag)
- Implement winning render approach from spike, in-app, behind feature flag
- Single character vs. single enemy, on-demand combat from a portal screen
- Quest completion → AP awarded to matching archetype
- Spend AP in combat → enemy HP ticks down → victory / defeat states
- **Done when:** end-to-end loop works on real device — complete a real quest, see AP bump, open portal, spend AP, see combat resolve, see reward

### 6.5 — Portal + home-base UI
- Home-base screen (modern-day setting): team idle, portals visible by category
- Portal entrance / exit transitions
- Replace or augment current dashboard with home-base
- Tie portal visuals to category color coding (existing CATEGORIES tokens)
- **Done when:** a stranger can navigate home-base → portal → combat → back without instruction

### 6.6 — Equipment & cosmetics
- Decision: cosmetic-only vs. stat-bearing vs. both (defer until here)
- Earn equipment from defeating bosses
- Per-character inventory UI; visible variation on character sprites
- **Done when:** completing a quarterly boss visibly changes the responsible character

### 6.7 — Polish + sub-boss / boss systems re-skin
- Re-theme weekly challenges (existing Phase 4.3) as portal mini-bosses
- Re-theme quarterly bosses (existing Phase 4.2) as portal arc bosses
- Achievements (existing Phase 4.4) become trophies in home-base
- **Done when:** existing Phase 4 systems feel native to the new world, not bolted on

### Beyond 6.7 (north star, not committed)
- Story / narrative chapters
- True grid-tactics combat (Fire Emblem-style) — original far-future goal
- Multiplayer / social (sharing portal completions)

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

## Open questions — status after May 4

Original list, with answers:

1. **Tone:** OPEN — bring to Claude Design with reference imagery. The modern-day-portal-fantasy frame implies *grounded with magical contrast*, but tone is still pickable.
2. **Character identity:** ANSWERED — separate avatars (a 5-archetype team), not "you."
3. **Boss visual language:** OPEN, narrowed — modern-day portals lean toward thematic monsters ("Boss of Procrastination" as a sluggish creature) over abstract metaphors. Decide in the next session.
4. **Animation budget:** OPEN — depends on rendering choice in the encounter spike. Pixel sprites can do walk cycles cheaply if PixelLab handles generation; HD-2D lighting effects might be the bottleneck instead.
5. **One character or party?** ANSWERED — party of 5 archetypes from day one.

New questions raised tonight (May 4):

6. **AP economy balance:** how many AP per quest? Per difficulty tier? Does a category-matched character (warrior on physical quests) get more AP than a non-match? Needs first-pass numbers in design.
7. **AP UI surfacing:** where in the existing app shell does AP appear? On the character page? On each quest card? Both?
8. **Equipment role:** cosmetic, stat-bearing, or both. Defer to Phase 6.6, but a tone-setting answer helps the style bible.
9. **Portal lifecycle:** does completing a portal lock it forever, or do new portals of the same type spawn? Habit games need infinite content; story games need finite. Probably the former for CORE Quest's purpose.
10. **Modern-day scene language:** how visible is the modern-day setting in the home-base? Subtle (lighting + clothing cues), or overt (smartphones, coffee cups, computer screens)? Affects every background asset.

These are conversations to have *with art on screen*.

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
  DOM-only combat architecture (Phase 6.2)
- `docs/design/style-bible.md` — locked reference images, palette,
  typography, sprite specs (populated during Phase 6.1 design session)

---

## Verification — when each phase is "done"

### Phase 6.1 (art lock-in) is done when:
1. ✓ Primary art style chosen — **DONE (May 4): Style A**
2. Reference image generated for each: 5 archetype portraits, 1 home-base scene, 1 portal entrance, 1 sample boss, 1 combat-scene mockup
3. `docs/design/style-bible.md` exists with palette + typography + sprite specs + reference gallery
4. Each reference image has its prompt + parameters recorded next to it

### Phase 6.2 (encounter spike) is done when (per `docs/encounter-spike.md`):
1. Orientation strategy locked from real-device testing (not theory)
2. Rendering approach validated (DOM-only / DOM + canvas overlay / Pixi)
3. AP storage shape decided (table vs. column)
4. Throwaway combat scene runs on real iPhone PWA without dropping frames
