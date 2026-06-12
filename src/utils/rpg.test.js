import { describe, it, expect } from 'vitest'
import {
  xpForLevel,
  calculateLevel,
  levelProgress,
  getTitle,
  getClass,
  maxHP,
  maxMP,
  getQuestXP,
  getQuestAP,
  getStatGain,
  getCategoryStat,
  getStreakBonus,
} from './rpg'

// These protect the game's "economy": how XP, levels, streak bonuses, and
// stats are calculated. If any of this math silently drifts, progression
// feels broken — so we pin the expected numbers here.

describe('xpForLevel — XP threshold to reach a level', () => {
  it('matches the documented thresholds', () => {
    expect(xpForLevel(1)).toBe(100)
    expect(xpForLevel(5)).toBe(1118)
    expect(xpForLevel(10)).toBe(3162)
    expect(xpForLevel(20)).toBe(8944)
  })
})

describe('calculateLevel — level from total XP', () => {
  it('starts at level 1 with no XP', () => {
    expect(calculateLevel(0)).toBe(1)
  })

  it('only levels up once the threshold is reached', () => {
    expect(calculateLevel(281)).toBe(1) // just under the level-2 threshold (282)
    expect(calculateLevel(282)).toBe(2) // exactly at it
    expect(calculateLevel(1117)).toBe(4) // just under level 5 (1118)
    expect(calculateLevel(1118)).toBe(5)
    expect(calculateLevel(8944)).toBe(20)
  })
})

describe('levelProgress — progress bar fraction within a level', () => {
  it('is 0 exactly at the start of a level', () => {
    expect(levelProgress(282)).toBe(0) // start of level 2
  })

  it('is partway between 0 and 1 inside a level', () => {
    const p = levelProgress(400) // partway through level 2 (282 → 519)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
    expect(p).toBeCloseTo(0.498, 2)
  })
})

describe('getTitle — character title by level', () => {
  it('returns the right title for each level band', () => {
    expect(getTitle(1)).toBe('Apprentice')
    expect(getTitle(4)).toBe('Apprentice')
    expect(getTitle(5)).toBe('Adventurer')
    expect(getTitle(10)).toBe('Journeyman')
    expect(getTitle(20)).toBe('Champion')
    expect(getTitle(50)).toBe('Mythic')
    expect(getTitle(99)).toBe('Mythic') // stays at the top title beyond 50
  })
})

describe('getClass — class from the highest stat', () => {
  it('maps each leading stat to its class', () => {
    expect(getClass({ vitality: 5, wisdom: 1, fortune: 0, charisma: 0 })).toBe('Warrior')
    expect(getClass({ vitality: 1, wisdom: 5, fortune: 0, charisma: 0 })).toBe('Scholar')
    expect(getClass({ vitality: 0, wisdom: 0, fortune: 5, charisma: 0 })).toBe('Merchant')
    expect(getClass({ vitality: 0, wisdom: 0, fortune: 0, charisma: 5 })).toBe('Diplomat')
  })

  it('returns Adventurer when the top stats tie', () => {
    expect(getClass({ vitality: 5, wisdom: 5, fortune: 0, charisma: 0 })).toBe('Adventurer')
    expect(getClass({})).toBe('Adventurer')
  })
})

describe('maxHP / maxMP — health & mana from level and stats', () => {
  it('computes HP = 50 + level*10 + vitality*3 + wisdom*1', () => {
    expect(maxHP(1, 0, 0)).toBe(60)
    expect(maxHP(5, 10, 2)).toBe(132)
  })

  it('computes MP = 30 + level*5 + wisdom*3 + fortune*2', () => {
    expect(maxMP(1, 0, 0)).toBe(35)
    expect(maxMP(5, 10, 3)).toBe(91)
  })
})

describe('getStreakBonus — XP multiplier from streak length', () => {
  it('returns the right bonus tier (and 0 below 3 days)', () => {
    expect(getStreakBonus(0)).toBe(0)
    expect(getStreakBonus(2)).toBe(0)
    expect(getStreakBonus(3)).toBe(0.05)
    expect(getStreakBonus(7)).toBe(0.1)
    expect(getStreakBonus(14)).toBe(0.15)
    expect(getStreakBonus(30)).toBe(0.25)
    expect(getStreakBonus(100)).toBe(0.25) // caps at the top tier
  })
})

describe('getQuestXP — XP award with streak bonus', () => {
  it('returns base XP with no streak', () => {
    expect(getQuestXP('medium', 0)).toBe(25)
    expect(getQuestXP('trivial', 0)).toBe(5)
  })

  it('applies the streak bonus and floors the result', () => {
    expect(getQuestXP('medium', 7)).toBe(27) // 25 * 1.10 = 27.5 → 27
    expect(getQuestXP('legendary', 30)).toBe(250) // 200 * 1.25
  })

  it('returns 0 for an unknown difficulty', () => {
    expect(getQuestXP('nonexistent', 0)).toBe(0)
  })
})

describe('getStatGain & getCategoryStat — stat rewards and mapping', () => {
  it('returns the stat gain per difficulty (0 for unknown)', () => {
    expect(getStatGain('medium')).toBe(2)
    expect(getStatGain('legendary')).toBe(12)
    expect(getStatGain('nonexistent')).toBe(0)
  })

  it('maps a category to the stat it trains (defaults to vitality)', () => {
    expect(getCategoryStat('health')).toBe('vitality')
    expect(getCategoryStat('intelligence')).toBe('wisdom')
    expect(getCategoryStat('money')).toBe('fortune')
    expect(getCategoryStat('relationships')).toBe('charisma')
    expect(getCategoryStat('nonexistent')).toBe('vitality')
  })
})

describe('getQuestAP — action points (has randomness for crits)', () => {
  // This one rolls a random crit, so instead of pinning an exact value we
  // confirm the result always stays within its valid bounds.
  it('always returns the base AP or double on a crit, with a boolean crit flag', () => {
    for (let i = 0; i < 100; i++) {
      const { ap, isCrit } = getQuestAP('medium') // base 4
      expect([4, 8]).toContain(ap)
      expect(typeof isCrit).toBe('boolean')
      expect(ap).toBe(isCrit ? 8 : 4)
    }
  })

  it('defaults unknown difficulties to a base of 1', () => {
    const { ap } = getQuestAP('nonexistent')
    expect([1, 2]).toContain(ap)
  })
})
