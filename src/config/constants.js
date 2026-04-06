// Difficulty tiers and their XP/stat values
export const DIFFICULTIES = {
  trivial:    { label: 'Trivial',    xp: 5,   statGain: 0,  color: 'var(--color-trivial)' },
  easy:       { label: 'Easy',       xp: 10,  statGain: 1,  color: 'var(--color-easy)' },
  medium:     { label: 'Medium',     xp: 25,  statGain: 2,  color: 'var(--color-medium)' },
  hard:       { label: 'Hard',       xp: 50,  statGain: 4,  color: 'var(--color-hard)' },
  epic:       { label: 'Epic',       xp: 100, statGain: 7,  color: 'var(--color-epic)' },
  legendary:  { label: 'Legendary',  xp: 200, statGain: 12, color: 'var(--color-legendary)' },
}

// Quest categories and their mapped stats
export const CATEGORIES = {
  health:        { label: 'Health',        stat: 'vitality',  color: 'var(--color-health)' },
  intelligence:  { label: 'Intelligence',  stat: 'wisdom',    color: 'var(--color-intelligence)' },
  money:         { label: 'Money',         stat: 'fortune',   color: 'var(--color-money)' },
  relationships: { label: 'Relationships', stat: 'charisma',  color: 'var(--color-relationships)' },
  household:     { label: 'Household',     stat: 'vitality',  color: 'var(--color-household)' },
}

// Quest statuses
export const QUEST_STATUSES = {
  available:   { label: 'Available' },
  in_progress: { label: 'In Progress' },
  completed:   { label: 'Completed' },
  failed:      { label: 'Failed' },
  abandoned:   { label: 'Abandoned' },
}

// Character titles by level range
export const TITLES = [
  { minLevel: 1,  title: 'Apprentice' },
  { minLevel: 5,  title: 'Adventurer' },
  { minLevel: 10, title: 'Journeyman' },
  { minLevel: 15, title: 'Veteran' },
  { minLevel: 20, title: 'Champion' },
  { minLevel: 30, title: 'Hero' },
  { minLevel: 40, title: 'Legend' },
  { minLevel: 50, title: 'Mythic' },
]

// Streak bonus thresholds
export const STREAK_BONUSES = [
  { days: 30, bonus: 0.25 },
  { days: 14, bonus: 0.15 },
  { days: 7,  bonus: 0.10 },
  { days: 3,  bonus: 0.05 },
]

// Stat display info
export const STATS = {
  vitality: { label: 'Vitality', abbr: 'VIT', color: 'var(--color-health)' },
  wisdom:   { label: 'Wisdom',   abbr: 'WIS', color: 'var(--color-intelligence)' },
  fortune:  { label: 'Fortune',  abbr: 'FOR', color: 'var(--color-money)' },
  charisma: { label: 'Charisma', abbr: 'CHA', color: 'var(--color-relationships)' },
}
