import { DIFFICULTIES, TITLES, STREAK_BONUSES, CATEGORIES } from '../config/constants'

/**
 * XP required to reach a given level (cumulative threshold).
 * Level 1: 100, Level 5: 1118, Level 10: 3162, Level 20: 8944
 */
export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5))
}

/** Calculate current level from total XP */
export function calculateLevel(totalXP) {
  let level = 1
  while (xpForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

/** Progress within current level as 0-1 fraction */
export function levelProgress(totalXP) {
  const currentLevel = calculateLevel(totalXP)
  const currentThreshold = xpForLevel(currentLevel)
  const nextThreshold = xpForLevel(currentLevel + 1)
  return (totalXP - currentThreshold) / (nextThreshold - currentThreshold)
}

/** Get title based on level */
export function getTitle(level) {
  let title = TITLES[0].title
  for (const t of TITLES) {
    if (level >= t.minLevel) title = t.title
  }
  return title
}

/** Get class based on highest stat */
export function getClass(stats) {
  const statMap = {
    vitality: 'Warrior',
    wisdom: 'Scholar',
    fortune: 'Merchant',
    charisma: 'Diplomat',
  }
  let highest = null
  let highestVal = -1
  let tied = false

  for (const [stat, className] of Object.entries(statMap)) {
    const val = stats[stat] || 0
    if (val > highestVal) {
      highest = className
      highestVal = val
      tied = false
    } else if (val === highestVal) {
      tied = true
    }
  }

  return tied ? 'Adventurer' : highest
}

/** Calculate HP from level and stats */
export function calculateHP(level, vitality, wisdom) {
  return 50 + (level * 10) + (vitality * 3) + (wisdom * 1)
}

/** Calculate MP from level and stats */
export function calculateMP(level, wisdom, fortune) {
  return 30 + (level * 5) + (wisdom * 3) + (fortune * 2)
}

/** Get XP value for a quest based on difficulty, with streak bonus */
export function getQuestXP(difficulty, streakDays) {
  const base = DIFFICULTIES[difficulty]?.xp || 0
  const bonus = getStreakBonus(streakDays)
  return Math.floor(base * (1 + bonus))
}

/** Get stat gain amount for a difficulty */
export function getStatGain(difficulty) {
  return DIFFICULTIES[difficulty]?.statGain || 0
}

/** Get which stat a category maps to */
export function getCategoryStat(category) {
  return CATEGORIES[category]?.stat || 'vitality'
}

/** Get streak XP bonus multiplier (0.05, 0.10, etc.) */
export function getStreakBonus(streakDays) {
  for (const { days, bonus } of STREAK_BONUSES) {
    if (streakDays >= days) return bonus
  }
  return 0
}
