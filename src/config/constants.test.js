import { describe, it, expect } from 'vitest'
import {
  DIFFICULTIES,
  CATEGORIES,
  STREAK_BONUSES,
  STATS,
} from './constants'

// These guard the game's core tables. They don't test behavior so much as
// catch a fat-fingered edit — e.g. a difficulty whose XP went backwards, or a
// category pointing at a stat that doesn't exist.

describe('DIFFICULTIES table', () => {
  const order = ['trivial', 'easy', 'medium', 'hard', 'epic', 'legendary']

  it('has all six difficulty tiers', () => {
    expect(Object.keys(DIFFICULTIES)).toEqual(order)
  })

  it('gives every tier a numeric xp and statGain', () => {
    for (const key of order) {
      expect(typeof DIFFICULTIES[key].xp).toBe('number')
      expect(typeof DIFFICULTIES[key].statGain).toBe('number')
    }
  })

  it('keeps XP rising from easiest to hardest', () => {
    for (let i = 1; i < order.length; i++) {
      expect(DIFFICULTIES[order[i]].xp).toBeGreaterThan(DIFFICULTIES[order[i - 1]].xp)
    }
  })
})

describe('CATEGORIES table', () => {
  it('points every category at a real stat', () => {
    for (const [key, value] of Object.entries(CATEGORIES)) {
      expect(STATS, `category "${key}" maps to unknown stat "${value.stat}"`).toHaveProperty(value.stat)
    }
  })
})

describe('STREAK_BONUSES table', () => {
  it('is ordered from longest streak to shortest', () => {
    // getStreakBonus relies on this order to return the highest matching tier.
    for (let i = 1; i < STREAK_BONUSES.length; i++) {
      expect(STREAK_BONUSES[i].days).toBeLessThan(STREAK_BONUSES[i - 1].days)
    }
  })

  it('gives a bigger bonus for a longer streak', () => {
    for (let i = 1; i < STREAK_BONUSES.length; i++) {
      expect(STREAK_BONUSES[i].bonus).toBeLessThan(STREAK_BONUSES[i - 1].bonus)
    }
  })
})

describe('STATS table', () => {
  it('defines the four character stats', () => {
    expect(Object.keys(STATS).sort()).toEqual(['charisma', 'fortune', 'vitality', 'wisdom'])
  })
})
