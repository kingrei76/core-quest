# Encounter Spike

> A 60–90 minute prototype to prove that DOM + framer-motion + sprite
> sheets can deliver fun, robust battle animations *before* committing
> to that architecture for phases 7–9. Build → feel → decide.

---

## What this is (and isn't)

**This is** a throwaway-quality, isolated route that animates a single
attack on a single enemy with one character. Solid colors and emoji are
fine for art. The point is to feel the *motion*, not see the *art*.

**This is not** production code, integrated with the quest system, or a
template for the real combat layer. It's a probe — keep it under 300
lines of new code total.

## Decision criteria

After the spike, ask:

- ✅ **Green-light DOM combat** — the hit feels impactful, the screen
  shake is satisfying, the damage number reads, the whole loop is
  responsive. Adding a second skill would just be adding data to an
  array.
- 🟡 **DOM + targeted canvas** — animation feels OK but particles look
  flat or jittery. Plan: stay DOM, drop a small `<canvas>` overlay only
  for particle bursts (lightweight, no engine).
- ❌ **Reach for an engine sooner** — sequence stutters, beats feel
  disconnected, HP bar lag is obvious, can't get above ~15fps on iPhone
  Safari. Rare for turn-based, but if it happens, the answer is PixiJS
  via `@pixi/react` for the encounter view (NOT a full Phaser switch).

## Scope cuts (do NOT do these in the spike)

- Sound — defer to a later spike. Howler.js is a 30-min add when ready.
- Multiple skills — Attack only. Defend, skills, items, status all later.
- Real character / enemy data — hardcode. No Supabase, no quest hookup.
- Real art — solid color rectangles + emoji glyphs are explicitly fine.
- Multiple enemies — 1v1 is plenty.
- Death / win states — animate the hit and update HP, that's it.
- Mobile responsiveness polish — desktop first, tweak on iPhone after.

## File layout

```
src/components/spike/
  EncounterSpike.jsx          # the page component
  EncounterSpike.module.css   # layout, screen shake keyframes
  Combatant.jsx               # one combatant (character or enemy)
  Combatant.module.css        # pose styles, sprite positioning
  FloatingNumber.jsx          # damage number that drifts up + fades

src/hooks/
  useSkillSequence.js         # the orchestrator hook

src/data/
  skills.js                   # skill definitions (Attack only for now)
```

Add the route in `src/main.jsx` alongside the existing routes:

```js
{ path: '/spike/encounter', element: <EncounterSpike /> }
```

Keep it ungated and absent from the main nav — you reach it by typing
the URL. That keeps it discoverable for testing without polluting the
product.

## Data shape

A skill is a list of *beats*. A beat is a state change with optional
side-effects. The hook walks beats sequentially, awaiting each
duration before moving on.

```js
// src/data/skills.js
export const SKILLS = {
  attack: {
    id: 'attack',
    label: 'Attack',
    beats: [
      { actor: 'self', pose: 'wind_up',                        duration: 200 },
      { actor: 'self', pose: 'idle', move: { x: 80 },          duration: 200 },
      { actor: 'self', pose: 'swing',                          duration: 100 },
      { effects: ['enemyFlash', 'screenShakeSmall', 'damage:15'] },
      { actor: 'self', pose: 'swing',                          duration: 200 },
      { actor: 'self', pose: 'idle', move: { x: 0 },           duration: 200 },
      { actor: 'self', pose: 'idle' },
    ],
  },
}
```

Beat fields:
- `actor`: `'self' | 'enemy'` — whose pose/transform to update
- `pose`: a named pose key the `Combatant` component knows how to render
- `move`: `{ x, y }` — translate offset relative to combatant's home position
- `duration`: ms before advancing. If omitted, beat is instantaneous.
- `effects`: array of effect tokens fired at this beat. Tokens are
  parsed by the hook — `damage:N`, `enemyFlash`, `screenShakeSmall`,
  `screenShakeBig`, `floatNumber:N`.

Composability win: adding "Heavy Attack" later is *just another entry
in `SKILLS`* with different durations and a `screenShakeBig` effect.

## Hook signature

```js
// src/hooks/useSkillSequence.js
export function useSkillSequence({ onEffect }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [selfPose, setSelfPose] = useState('idle')
  const [enemyPose, setEnemyPose] = useState('idle')
  const [selfOffset, setSelfOffset] = useState({ x: 0, y: 0 })
  const [enemyOffset, setEnemyOffset] = useState({ x: 0, y: 0 })

  async function play(skill) { /* walk beats, await durations, fire effects */ }

  return {
    isPlaying,
    selfPose, enemyPose,
    selfOffset, enemyOffset,
    play,
  }
}
```

Effects bubble out via `onEffect(token)` so the page component can
trigger screen shake, spawn a `<FloatingNumber>`, and decrement
enemy HP — all from one place.

## Component tree

```
<EncounterSpike>
  <div class="stage" data-shake={shakeState}>
    <Combatant side="left"  pose={selfPose}  offset={selfOffset}  />
    <Combatant side="right" pose={enemyPose} offset={enemyOffset} flash={enemyFlash} />
    <FloatingNumber {...} /> {/* spawned on damage */}
  </div>
  <HPBar current={enemyHp} max={enemyMax} />
  <ActionBar>
    <button onClick={() => play(SKILLS.attack)} disabled={isPlaying}>Attack</button>
  </ActionBar>
</EncounterSpike>
```

Reuse the existing `HPMPBar` from `src/components/character/HPMPBar.jsx`
for the bar — it already accepts `current` / `max` / `color` props and
animates width via the existing CSS transition.

## Animation primitives to use

- **Pose change**: swap `data-pose="..."` on the `<Combatant>`. CSS
  rules per pose set `background-position` (sprite frame) or, in the
  spike, a different emoji glyph or background-color. No JS animation
  needed for the pose itself; the transition is just visual.
- **Move (x/y offset)**: pass to `framer-motion`'s `<motion.div animate={{x, y}} transition={{duration: 0.2}}/>`. Don't reach for raw CSS — framer-motion gives you smoother
  easing curves out of the box and is already in deps.
- **Screen shake**: add a class to the stage. Define a keyframe:
  ```css
  @keyframes shake-small {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-3px, 1px); }
    50% { transform: translate(2px, -2px); }
    75% { transform: translate(-1px, 2px); }
  }
  .shake-small { animation: shake-small 0.18s ease-out; }
  ```
  Toggle the class for the duration, then remove. Use a key trick (`key={shakeId}`) so the animation re-runs on subsequent shakes.
- **Enemy flash**: `filter: brightness(2) saturate(0)` on the enemy
  combatant for 80ms. Toggle via state.
- **Damage number**: spawn `<FloatingNumber>` with a unique key, position
  absolutely above the enemy, framer-motion animates `y: -40, opacity: [1, 1, 0]` over 600ms, then unmounts itself via `onAnimationComplete`.

## Placeholder art

For each combatant, a 96×128 div with:
- `background: var(--color-bg-card)`
- a centered emoji at 4rem font-size (🧙‍♂️ for character, 👹 for enemy)
- `border: 2px solid var(--color-gold)` (character) or `--color-danger` (enemy)
- pose changes swap the emoji or shift `background-color` slightly

That's it. No sprite sheets needed for the spike. If the spike feels
good, the *next* spike (1-day) is "swap emoji for a real sprite sheet
and prove the frame timing works." That's where you start the actual
art pipeline.

## Time budget

- 0:00 – 0:15 — scaffold the route, the page, two combatant divs, HP bar
- 0:15 – 0:35 — `useSkillSequence` hook, walk beats with await
- 0:35 – 0:55 — wire effects: flash, shake, damage number
- 0:55 – 1:10 — polish timing on Attack until it *feels good*
- 1:10 – 1:30 — test on iPhone (PWA / Safari), note any jank

If you blow past 90 minutes, that's itself a signal — either scope
crept or the architecture is fighting you.

## Success looks like

You tap "Attack" and:

1. Character winds up (a beat of stillness — important, no instant blur)
2. Lunges right
3. Connects — enemy flashes white for ~80ms, screen shudders
4. "−15" floats up off the enemy in red, drifts up and fades over ~600ms
5. Enemy HP bar smoothly drops from 100 to 85
6. Character returns to home
7. You can tap Attack again — no UI lockup, sequence replays cleanly

If steps 3–5 land within the same ~150ms window (impact, flash, shake,
number, HP drop), it'll feel *good*. If they're staggered or out of
sync, it won't — and that's the first thing to fix in the polish pass.

## What to write down after the spike (regardless of outcome)

A `docs/encounter-spike-results.md` with:
- Did it feel good? (yes / yes-but / no)
- What was the hardest beat to time?
- What effect was most impactful?
- iPhone Safari behavior — any jank in standalone PWA mode?
- Next architectural decision: DOM-only / DOM + canvas overlay / engine

That's the input to phase-7 planning.

---

## Critical files (existing) to be aware of

- `src/main.jsx` — routes; add `/spike/encounter` here
- `src/components/character/HPMPBar.jsx` — reusable HP bar
- `src/styles/tokens.css` — palette tokens (`--color-gold`,
  `--color-danger`, etc.)
- `package.json` — `framer-motion` already installed; no new deps for
  this spike
