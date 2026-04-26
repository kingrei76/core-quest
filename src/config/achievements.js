// Catalog of unlockable achievements. Each criterion receives:
//   { profile, stats, level, completedCount, currentStreak, bestStreak, completionsByCategory }
// and returns true when satisfied.

export const ACHIEVEMENTS = [
  {
    key: 'first-steps',
    label: 'First Steps',
    description: 'Complete your first quest.',
    icon: '🌱',
    criterion: (ctx) => ctx.completedCount >= 1,
  },
  {
    key: 'ten-quests',
    label: 'Quest Streak',
    description: 'Complete 10 quests.',
    icon: '⚔️',
    criterion: (ctx) => ctx.completedCount >= 10,
  },
  {
    key: 'fifty-quests',
    label: 'Veteran Adventurer',
    description: 'Complete 50 quests.',
    icon: '🛡️',
    criterion: (ctx) => ctx.completedCount >= 50,
  },
  {
    key: 'hundred-quests',
    label: 'Quest Master',
    description: 'Complete 100 quests.',
    icon: '🏆',
    criterion: (ctx) => ctx.completedCount >= 100,
  },
  {
    key: 'level-5',
    label: 'Adventurer',
    description: 'Reach level 5.',
    icon: '✨',
    criterion: (ctx) => ctx.level >= 5,
  },
  {
    key: 'level-10',
    label: 'Journeyman',
    description: 'Reach level 10.',
    icon: '🌟',
    criterion: (ctx) => ctx.level >= 10,
  },
  {
    key: 'level-20',
    label: 'Champion',
    description: 'Reach level 20.',
    icon: '💫',
    criterion: (ctx) => ctx.level >= 20,
  },
  {
    key: 'streak-7',
    label: 'On a Roll',
    description: '7-day streak.',
    icon: '🔥',
    criterion: (ctx) => ctx.currentStreak >= 7 || ctx.bestStreak >= 7,
  },
  {
    key: 'streak-30',
    label: 'Unstoppable',
    description: '30-day streak.',
    icon: '☄️',
    criterion: (ctx) => ctx.currentStreak >= 30 || ctx.bestStreak >= 30,
  },
  {
    key: 'balanced',
    label: 'Balanced Soul',
    description: 'Reach 25 in every stat.',
    icon: '⚖️',
    criterion: (ctx) =>
      ctx.stats &&
      (ctx.stats.vitality >= 25) &&
      (ctx.stats.wisdom >= 25) &&
      (ctx.stats.fortune >= 25) &&
      (ctx.stats.charisma >= 25),
  },
  {
    key: 'health-50',
    label: 'Iron Body',
    description: 'Complete 50 health quests.',
    icon: '💪',
    criterion: (ctx) => (ctx.completionsByCategory.health || 0) >= 50,
  },
  {
    key: 'wisdom-50',
    label: 'Sage',
    description: 'Complete 50 intelligence quests.',
    icon: '📚',
    criterion: (ctx) => (ctx.completionsByCategory.intelligence || 0) >= 50,
  },
]
