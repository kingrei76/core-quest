# CORE Quest — Style Bible

> Status: **stub**. Populated during Phase 6.1 Claude Design sessions.
> See `vision.md` § "Decisions locked (May 4, 2026)" for the high-level
> art direction this bible operationalizes.

The point of this doc: every later asset (sprite frames, animations, UI
chrome, environments) refers back to *one* canonical reference per
character / scene. Without a locked reference set, AI-generated art
drifts and the game looks like a deepfake of itself. This doc is the
lock.

---

## Style anchor

- **Direction:** Modern HD-2D pixel art (Style A — chosen May 4, 2026)
- **Reference games:** *Octopath Traveler*, *Sea of Stars*,
  *Chained Echoes*. Layout / input feel from *Shogun Showdown*.
- **Resolution:** TBD — likely 64×64 base sprites scaled 2-3× for
  display. Confirm during first generation pass.
- **Lighting:** Hand-painted, mood-driven, not flat.

---

## Color palette

> Anchored to existing tokens in `src/styles/tokens.css`. New palette
> must coexist with current navy / gold / teal so the menu shell
> doesn't have to be rewritten.

| Role | Token | Hex | Notes |
|------|-------|-----|-------|
| BG deep | `--color-bg-deep` | `#1a1a2e` | Existing — keep |
| BG mid | `--color-bg-mid` | `#16213e` | Existing — keep |
| BG accent | `--color-bg-accent` | `#0f3460` | Existing — keep |
| Gold | `--color-gold` | `#ffd700` | Existing — boss / prestige |
| Cyan | `--color-cyan` | `#00d4aa` | Existing — XP |
| HP red | `--color-danger` | `#e94560` | Existing — HP |
| MP blue | `--color-mp` | `#4a90d9` | Existing — MP |
| Sprite fill 1-N | TBD | TBD | Per archetype, picked in design |

**Picked during design session:**
- _(populate per archetype: dominant hue, accent hue, outline color)_

---

## Typography

> Current fonts: `Cinzel` (display), `Cormorant Garamond` (body),
> `Caveat` (handwritten). Pixel art typically wants pixel or grotesk
> faces. Decision pending — Cinzel may not survive the pivot.

**Candidates to test:**
- Keep Cinzel for menu chrome, swap to a pixel face only inside
  combat / portal viewport (lowest disruption).
- Replace globally with a modern grotesk + a pixel display face.
- Replace globally with a curated pixel font (e.g., `Press Start 2P`,
  `m6x11`, `PixelOperator`).

**Final pick:** _(decide after first sprite mockups)_

---

## Sprite specs

Lock these before generating any sprite — changing later means
re-generating every asset.

- **Character base resolution:** _(e.g., 64×64 px)_
- **Display scale:** _(e.g., 3× → 192×192 rendered)_
- **Pixel snap:** integer scaling only (no subpixel)
- **Animation frame counts:**
  - Idle: 4-6 frames @ 8-12 fps
  - Walk: 6-8 frames @ 12 fps
  - Attack: 4-6 frames + hold
  - Hurt: 2-3 frames
- **Sprite sheet format:** PNG + JSON atlas (Aseprite default export)
- **Naming convention:** `{archetype}-{action}-{frame}.png` inside
  `{archetype}/` directories under `public/sprites/`

---

## Reference image gallery

> One section per canonical asset. For each, paste the image link,
> the exact prompt that produced it, generation parameters, and
> notes for the next iteration pass. Locked images become the
> reference for *every* later derivative.

### Warrior (archetype 1) — Aspect: *The Vanguard*

- **Status:** v1 locked (May 5, 2026). Awaiting Aseprite cleanup pass.
- **Image:** `docs/design/style-bible/vanguard-v1.png`
- **Aspect:** The Vanguard (per `docs/design/magic-system.md`)
- **Persona power (Phase 6.4):** *Crashing Strike*
- **Modern-weapon variant:** Tactical Operator (rifle + greatsword)
- **Tool:** Leonardo.AI (model — fill in: e.g., Pixel Art XL)
- **Parameters:** _(fill in: aspect ratio, guidance, seed)_
- **Prompt that produced v1:**

  ```
  HD-2D pixel art RPG character portrait, 64×64 base sprite scaled 3× for display.
  Sea of Stars production polish with Octopath Traveler dramatic lighting and
  painted depth. Twilight palette: deep navy background with warm amber and gold
  accent lighting. Earnest-heroic tone, sincere adventure. Modern fantasy
  aesthetic. Hand-painted gradient shading, no hard outlines.

  Vanguard archetype, frontline warrior class. Full body idle pose, confident
  weight-bearing stance, slight smirk, eye contact with viewer. Modern tactical
  operator fused with fantasy plate armor: ballistic plate carrier with
  rune-etched ceramic plates, modern combat helmet with visor flipped up,
  fingerless tactical gloves, sturdy combat boots. Two-handed greatsword slung
  diagonally across back, modern assault rifle held at low ready. Military
  patches replaced with arcane sigils. Battle-scarred but composed expression.
  Dominant earth and steel grey, gold accent on rune-etched plates, deep navy
  background.
  ```

- **What landed (keep):**
  - Silhouette reads at thumbnail
  - Earnest-heroic facial expression (smile, eye contact, beard)
  - Gold rune on left pauldron — the canonical "fantasy magic on modern gear" anchor
  - Olive-and-steel palette with gold accent on navy background
  - Full body idle pose, confident stance

- **What to fix in Aseprite (next pass — not in Leonardo):**
  - Remove watermark / hallucinated text artifacts ("Sea of Stars" upper-left, "HODERTL ZART" bottom-left)
  - Slung weapon on back reads as a second rifle — paint over with a clear two-handed greatsword silhouette if dual-weapon vibe is desired
  - Optionally simplify chest gear (remove 1-2 pouches/straps) for cleaner silhouette
  - Lock final canvas size + pixel density (decide 64×64 vs. 96×96 base during cleanup)
  - Ensure transparent background for compositing into game scenes

- **Notes for v2 (only if Aseprite cleanup can't fix what's wrong):**
  - Tighten prompt — long prompts caused Leonardo to drop instructions on subsequent generations
  - Add aggressive negative prompt: `text, watermark, logo, signature, letters, helmet visor down, mouth covered`

### Mage (archetype 2)

_(same template)_

### Rogue (archetype 3)

_(same template)_

### Diplomat (archetype 4)

_(same template)_

### Scholar (archetype 5)

_(same template)_

### Home-base scene

_(same template — modern-day team safehouse)_

### Portal entrance

_(same template — modern-day rift to fantasy world)_

### Sample boss

_(same template — e.g., "Boss of Procrastination")_

### Combat scene mockup

_(same template — sideways letterboxed strip with AP UI)_

---

## Prompt recipes

A "recipe" is a base prompt + a parameter table that reliably produces
on-style output. Build these up as you find prompts that work.

### Base style fragment (paste into every prompt)

> _(populate after first session — e.g., "HD-2D pixel art, 64×64 base
> scaled 3×, Sea of Stars / Octopath Traveler painted lighting, navy
> + gold + teal palette, ...")_

### Per-archetype clothing recipe

_(table of: archetype → modern-day clothing keywords → fantasy accent
keywords)_

### Per-scene composition recipe

_(home-base / portal / combat → camera angle + framing notes)_

---

## What "done" looks like for Phase 6.1

This file is "done enough" for Phase 6.2 (encounter spike) when:

1. All 5 archetype portraits have locked reference images + prompt recipes
2. Home-base scene + portal entrance + sample boss all locked
3. Combat scene mockup exists (even if rough)
4. Color palette table is complete
5. Typography decision is made
6. Sprite specs are committed (resolution, scale, frame counts)

Once those six are filled in, Phase 6.2 can start with confidence that
the spike is animating *the right thing* visually.
