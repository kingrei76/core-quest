# CORE Quest — Magic & Power System

> Status: **design draft (May 5, 2026)**. Foundational system. Only
> **Power 1 (Persona)** ships in early phases (6.4 Combat MVP). Powers
> 2 (Shadow) and 3 (Integration) are designed-on-paper here so the
> trajectory is locked, but their implementation is deferred — likely
> Phase 7+. The Higher Being narrative layer is introduced lightly
> from the start and deepens over the long arc.

---

## The frame

Each character has a **3-tier power set** modeled on the Jungian
individuation arc. Powers are *granted* by a **Higher Being** the
character is bonded to — a relationship the player has to grow into,
nervously at first.

Two threads, intertwined:

1. **Jungian arc** — Persona → Shadow → Self (integration). Each tier
   reflects a stage of the character coming to terms with who they are.
2. **Faith arc** — distance from Higher Being → cautious trust → full
   bond. Each tier reflects the strength of that bond.

The two arcs run in parallel: you can't unlock the Shadow power until
the bond with the Higher Being can hold the weight of self-confrontation.
You can't unlock Integration until the bond is sealed.

This is the spine of the long-game progression. Daily quests feed the
short-loop (AP economy, quest XP). The Jungian/faith arc is the
**meaning** under those quests.

---

## The Higher Being layer

Every character is bonded to a Higher Being. The Higher Being is the
*source* of the character's powers. The character starts skeptical —
they don't fully believe, they don't fully trust, they're nervous to
lean in. Over time, through quest completion and story beats, the bond
strengthens and the character grows into belief.

**Two design options for what a "Higher Being" is — pick one:**

### Option A — Five distinct Patrons (D&D Warlock-style)
Each archetype has its own Higher Being with personality, voice, and
demands. Five Patrons total, one per character.

- **Pro:** richer storytelling, distinct character arcs, room for
  different faith flavors per archetype.
- **Pro:** maps cleanly to per-archetype quest categories (each Patron
  governs a domain).
- **Con:** five times the writing burden. Five distinct voices to
  maintain.

### Option B — One Higher Being, refracted (Jungian Self-style)
A single Higher Being — interpretable as God, the True Self, the
Universe, depending on player taste. Each character experiences it
differently because each is at a different point on the same arc.

- **Pro:** thematically tight with Jungian individuation (the "Self"
  is exactly this in Jung's framing). One unified faith arc across the
  whole team.
- **Pro:** half the writing burden. One voice, refracted.
- **Con:** less distinct character storytelling. Risk of the Higher
  Being feeling vague.

**Recommendation:** Option B. It's thematically tighter, cheaper to
write, and the "refraction through each character" is itself
expressive. But the user picks.

### Faith mechanics (rough)

- **Bond level** per character (0–10, or some scale)
- Bond grows from: completing matched-category quests, defeating
  bosses, surviving failed-quest comebacks
- Bond loss from: sustained quest abandonment in that category
- Bond gates: Power 2 unlocks at level 4-5, Power 3 at level 9-10
- Visual: Higher Being's "presence" in the home-base scene grows from
  a flicker / silhouette to a clear figure as the bond deepens

---

## Power 1 — Persona (ships in Phase 6.4)

The Persona power is what the character thinks they are. Direct,
on-brand, unsubtle. Granted at character creation. The Higher Being
lends this one cautiously — "use this and earn the rest."

### Per-archetype Persona powers

These are the only powers that need full mechanical design before
shipping. Combat MVP uses these.

| Archetype | Persona name | Verb | Mechanical sketch | Visual |
|---|---|---|---|---|
| **Fighter** | *Crashing Strike* | Strike | Single-target heavy melee. Bonus damage if AP > threshold. | Gold + red kinetic energy, heavy impact frames |
| **Mage** | *Calculated Burn* | Cast | Single-target ranged spell. Predictable damage, no variance. | Cyan + arcane purple, controlled beam |
| **Rogue** | *Edge Work* | Strike (ranged or melee) | Critical chance scaling. High variance, high ceiling. | Deep navy + cyan flicker, quick frames |
| **Diplomat** | *Rallying Word* | Buff/Debuff | Boost an ally OR debuff an enemy. No direct damage. | Warm amber + cream, soft glow |
| **Scholar** | *Insight* | Reveal/Counter | Reveal enemy weakness; next attack against this enemy crits. | Cyan + cream, lens-like effect |

Note: each Persona is the **most obvious** power for that archetype.
That's by design — the surprise comes in Powers 2 and 3.

### Modern-weapon variants

Per the May 5 brainstorm session, each archetype's Persona power can
be re-skinned to a modern-weapon flavor without changing the
mechanical shape. Example: Fighter's *Crashing Strike* is a sword arc
in the default skin, a shotgun blast in the "Tactical Operator" skin,
a chainsaw rev in the "Berserker" skin. The mechanical verb stays
"single-target heavy strike, bonus if AP > threshold."

This means: **the Persona power's mechanics are skin-agnostic.** The
visual / weapon flavor is a per-character cosmetic choice the user
makes during character creation. Encode this so future code doesn't
hard-code "sword" anywhere.

---

## Power 2 — Shadow (deferred, design notes only)

The Shadow power is the **inverse** of the Persona — the trait the
character represses. It feels "wrong" to wield at first. The Higher
Being grants it only after the character has demonstrated they can
hold the weight of self-confrontation (sustained engagement + a
failed-quest recovery).

### Per-archetype Shadow spine

| Archetype | What they repress | Shadow gives them | Working name |
|---|---|---|---|
| **Fighter** | Stillness, restraint, vulnerability | Counter-strike / patience-based power | *Held Breath* |
| **Mage** | Chaos, instinct, the unknown | Improvisation / unpredictable burst | *Wild Insight* |
| **Rogue** | Honesty, exposure, trust | Power that requires showing your hand | *Open Stance* |
| **Diplomat** | Self-assertion, anger, boundaries | Power that draws on righteous anger | *Edge of No* |
| **Scholar** | Action, embodiment, presence | Power that requires committing without analyzing | *Leap* |

The Shadow power is **the legitimate complaint someone might level at
that archetype, weaponized.** That's what makes it feel earned and
not arbitrary.

### Unlock mechanics (sketch — not implementation)

- Character must be at Bond level ≥ 4-5 with their Higher Being
- Trigger event: character must have **failed a meaningful quest and
  recovered** (not "completed N quests"). Resistance + comeback is the
  signal.
- Unlock moment is a real story beat — a portal that can't be cleared
  with Persona alone, requiring the Shadow to show up. The unlock IS
  the narrative.

---

## Power 3 — Integration / Self (deferred, design notes only)

The Integration power is Persona + Shadow held simultaneously. The
character is no longer at war with themselves. The Higher Being's
bond is full — the character has surrendered to and become one with
the Self.

### Per-archetype Integration spine

| Archetype | Persona + Shadow held together | Working name |
|---|---|---|
| **Fighter** | Strike + parry as one — incoming damage becomes outgoing | *Stillness in Storm* |
| **Mage** | Calculated improvisation — predictable AND wild | *Wisdom* |
| **Rogue** | Honest cunning — open about strategy, still wins | *True Edge* |
| **Diplomat** | Care without losing self — empathy + boundaries | *Whole Word* |
| **Scholar** | Lived wisdom — knowing AND doing in the same act | *Embodied Insight* |

### Unlock mechanics (sketch)

- Bond level ≥ 9-10
- Both Persona and Shadow have been used in combat regularly
- Triggered by a major story beat (quarterly boss, faith-arc
  milestone)
- Visual: the Higher Being is fully present in the home-base scene
  for the first time

---

## Visual implications for art direction

Each character needs to be readable in **3 power states** during
combat.

**Three options, ranked by recommended order:**

1. **Base sprite + aura/effect overlay per power** *(recommended)*.
   One canonical sprite per archetype, plus particle / glow / palette
   shifts when a power is active. Cheapest, most flexible, scales to
   future powers.
2. **Three full sprites per character** (5 × 3 = 15 sprites). Most
   expressive, most expensive. Use only if option 1 doesn't read on
   small screens.
3. **One sprite + palette shift only** (no overlays). Cheapest, but
   may not read clearly enough in pixel art.

**For Phase 6.1 art lock-in:** generate ONE sprite per archetype
(the Persona / default state). Effect overlays for Powers 2 and 3
come later when those powers ship.

---

## Phasing

| Phase | What ships |
|---|---|
| 6.4 Combat MVP | All 5 Persona powers, default modern-weapon skin per archetype |
| 6.5 Portal + home-base | Higher Being's first appearance in home-base — silhouette / flicker only |
| 6.7 Polish | Bond level surface in UI, tied to existing achievements |
| 7.x Shadow expansion | Shadow powers + unlock story beats. Per-archetype recovery-quest detection. |
| 7.x+ Integration expansion | Integration powers + faith-arc finale moments |

---

## Open questions

1. **Higher Being — Option A (five Patrons) or Option B (one,
   refracted)?** Recommend B; user decides.
2. **Bond progression curve:** linear with quest completion, or
   weighted by quality of engagement (failed-and-recovered counts
   more than rote completion)?
3. **Does Bond level decay?** Real faith arcs don't always grow
   monotonically. Ditching the category for a month could meaningfully
   weaken the bond. Risky for retention; thematically honest.
4. **Visibility of the Higher Being in early game:** silhouette only?
   Voice in dreams? Symbols at home-base? Decide before generating
   home-base art (Phase 6.1).
5. **What does the Higher Being SAY when it speaks?** This intersects
   with the Weekly Check-in feature (`docs/design/weekly-checkin.md`)
   — the check-in might be the Higher Being speaking, or it might be
   a separate companion voice. Decide together.
6. **Modern-weapon Persona skins:** lock the catalog of options
   per-archetype during Phase 6.1, or let players pick freely?
   Locking is safer for art consistency; freedom is more expressive.

---

## What stays decided regardless

- The 3-tier structure (Persona / Shadow / Integration) is the spine.
  Don't redesign it after this lock.
- Powers come from the Higher Being. They're not "innate" — that's a
  meaningful narrative choice.
- Only Power 1 ships in early phases. Don't try to implement 2 or 3
  before the framework lands and the player has had time to bond
  with their character.
- Power mechanics are **skin-agnostic**. Encode this from day one so
  modern-weapon variants don't require code forks.
