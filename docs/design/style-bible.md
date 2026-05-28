# CORE Quest — Style Bible

> Status: **v2 — re-baselined May 28, 2026** after the pivot from
> Style A pixel art to Alex's hand-illustrated 2D direction. See
> `vision.md` § "Decisions revised (May 28, 2026)" for the high-level
> art direction this bible operationalizes.

The point of this doc: every later asset (character art, scene
backgrounds, UI chrome, in-game sprites) refers back to *one* canonical
reference per character / scene. Without a locked reference set, art
direction drifts and the game looks like a deepfake of itself. This doc
is the lock.

---

## Style anchor

Hand-illustrated 2D. Described by attributes, not by reference game —
locked May 28, 2026 from Alex's v1 roster sheet.

- Clean line art with hand-painted gradient shading on skin and fabric
- Soft cel-shaded highlights; no hard outlines on volume forms
- Earnest, lived-in faces — visible scars, blue eyes, expressive but
  composed (not anime-cute, not grimdark)
- Character-portrait quality across the whole roster — no "background
  character" tier
- Modern-day clothing + fantasy accent fusion (carried over from the
  May-4 setting decisions; clothing variations are a v2 open question)
- **Lighting / mood:** painterly, mood-driven, not flat

**Canonical anchor:** `docs/design/style-bible/alex-v1-roster.png`

---

## Color palette

> Anchored to existing tokens in `src/styles/tokens.css`. The new
> illustration direction coexists cleanly with current navy / gold /
> teal — the menu shell does not have to be rewritten.

| Role | Token | Hex | Notes |
|------|-------|-----|-------|
| BG deep | `--color-bg-deep` | `#1a1a2e` | Existing — keep |
| BG mid | `--color-bg-mid` | `#16213e` | Existing — keep |
| BG accent | `--color-bg-accent` | `#0f3460` | Existing — keep |
| Gold | `--color-gold` | `#ffd700` | Existing — boss / prestige |
| Cyan | `--color-cyan` | `#00d4aa` | Existing — XP |
| HP red | `--color-danger` | `#e94560` | Existing — HP |
| MP blue | `--color-mp` | `#4a90d9` | Existing — MP |
| Per-archetype accents | TBD | TBD | Pulled per archetype from Alex's v2 deliveries |

---

## Typography

> Current fonts: `Cinzel` (display), `Cormorant Garamond` (body),
> `Caveat` (handwritten). Pivoting away from pixel art *helps* this —
> Cinzel + Cormorant reads more native against painted illustration
> than against pixel sprites.

**Working assumption:** keep the current trio. Revisit only if a
specific Alex delivery makes them feel wrong in context.

---

## In-game render specs

> Re-baselined May 28, 2026. The old "Sprite specs" section (64×64
> base, 3× display scale, pixel-snap, Aseprite atlas) reflected the
> superseded pixel-art pipeline.

For the combat / encounter screen, in-game character renders will
likely be a downscaled / composited derivative of Alex's full-quality
illustration. Exact resolution, frame counts, animation pipeline, and
file format are **TBD per first Alex delivery of an in-game-ready
asset**. The current `EncounterSpike` runs on CraftPix off-the-shelf
sprite sheets as explicit placeholder until that decision lands.

What's portable across whatever we pick:
- Character art lives under `public/sprites/<archetype>/` (current
  CraftPix placeholders under `public/sprites/craftpix/`)
- Sheets export with a JSON atlas next to the PNG
- Naming: `<archetype>-<action>.png` + `<archetype>-<action>.json`

---

## Reference image gallery

### Roster reference v1 — **LOCKED May 28, 2026 (Alex)**

- **Image:** `docs/design/style-bible/alex-v1-roster.png`
- **Contents:** nude anatomy body study (bald, neutral pose) plus
  four shirtless male head variations rendered on the same face
  structure. Red-hair-with-earring, gray-with-green-streaks,
  brown-wavy, and spiky-purple variants. Scarring across neck,
  shoulders, chest. Blue eyes across all four.
- **What's locked:**
  - Face structure / anatomy across the roster
  - Rendering style and tone (line + soft cel + painted skin)
  - Scarred-but-earnest character feel
  - Quality bar for every later character delivery
- **What's open (decide at v2 review with Alex):**
  - Which of the four head variations maps to which archetype
  - Full body finished designs for the four non-Warrior archetypes
  - Modern-day-clothing + fantasy-accent fusion per archetype
  - Whether the team should include non-male characters

### Warrior (archetype 1) — Aspect: *The Vanguard* — SUPERSEDED

> Superseded May 28, 2026 by the roster reference above. The previous
> Vanguard v1 was an AI-generated pixel-art portrait from the May-4
> Style A pipeline (Leonardo + Aseprite). Source files remain at
> `docs/design/style-bible/vanguard-v1*.{png,aseprite}` for history.
> The Warrior slot will be re-anchored to a clothed full-body design
> from Alex (likely derived from one of the v1 heads — pending
> archetype-mapping decision).

### Mage (archetype 2)

_Awaiting delivery from Alex (see `vision.md` § "Brief for Alex's next
delivery")._

### Rogue (archetype 3)

_Awaiting delivery from Alex (see `vision.md` § "Brief for Alex's next
delivery")._

### Diplomat (archetype 4)

_Awaiting delivery from Alex (see `vision.md` § "Brief for Alex's next
delivery")._

### Scholar (archetype 5)

_Awaiting delivery from Alex (see `vision.md` § "Brief for Alex's next
delivery")._

### Home-base scene

_Awaiting delivery from Alex — modern-day team hideout / safehouse,
evening light._

### Portal entrance

_Awaiting delivery from Alex — modern-day environment with a magical
rift opening into a fantasy world._

### Sample boss

_Awaiting delivery from Alex — pick a category-flavored creature (e.g.,
"Boss of Procrastination")._

### Combat scene mockup

_Awaiting delivery from Alex — letterboxed sideways strip with one
archetype mid-attack on the sample boss + AP gauge UI element._

---

## Briefs for Alex

When commissioning new work, point Alex at:

1. The **roster reference v1** (`alex-v1-roster.png`) as the canonical
   anchor — match face structure / rendering / tone.
2. The **attributes list** in § "Style anchor" above as the description
   of the style. Don't translate it into a reference-game label.
3. The **outstanding deliveries** in `vision.md` § "Brief for Alex's
   next delivery" for what to make next.
4. The **open questions** above (under each archetype's gallery entry)
   that this delivery is meant to close out.

For each delivery, capture:
- The brief sent to Alex
- What landed (what's locked from this delivery)
- What's still open for v2 / next iteration
- File path under `docs/design/style-bible/` (committed alongside this
  doc update)

---

## What "done" looks like for Phase 6.1

This file is "done" for Phase 6.2+ (encounter spike already merged as
Phase 6.4-lite; full art-driven rebuild blocked on Alex's deliveries) when:

1. ✓ Style anchor locked (v1 roster)
2. Each of the 5 archetypes has a locked, finished-design reference
3. Home-base scene, portal entrance, sample boss, combat-scene mockup
   are all locked
4. Color palette table has per-archetype accent colors filled in
5. Typography decision confirmed against painted illustration context
6. In-game render specs (resolution / format / animation pipeline)
   locked once first Alex in-game-ready asset arrives

Until then: the encounter spike runs on CraftPix placeholder sprites,
which keep the combat loop alive but don't represent the final visual.
