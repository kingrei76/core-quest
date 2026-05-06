// Skill definitions for the encounter spike.
// Each skill is a list of beats walked sequentially by useSkillSequence.
// A beat may set the actor's pose, fire visual effects, or both.
// Pose names map to per-pose CSS transforms in Combatant.module.css.

export const SKILLS = {
  crashingStrike: {
    id: 'crashingStrike',
    label: 'Crashing Strike',
    apCost: 1,
    beats: [
      { pose: 'wind_up', duration: 220 },
      { pose: 'lunge', duration: 160 },
      { effects: ['enemyFlash', 'screenShakeBig', 'damage:18'] },
      { pose: 'swing', duration: 220 },
      { pose: 'recover', duration: 120 },
      { pose: 'idle' },
    ],
  },

  quickSlash: {
    id: 'quickSlash',
    label: 'Quick Slash',
    apCost: 1,
    beats: [
      { pose: 'lunge', duration: 110 },
      { effects: ['enemyFlash', 'screenShakeSmall', 'damage:9'] },
      { pose: 'recover', duration: 100 },
      { pose: 'idle' },
    ],
  },
}
