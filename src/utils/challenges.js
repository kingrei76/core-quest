import { CATEGORIES } from '../config/constants'

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d)
  const day = x.getDay() // 0 = Sun
  x.setDate(x.getDate() - day)
  return x
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

export function currentDailyPeriod() {
  const start = startOfDay()
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: isoDate(start), end: isoDate(end) }
}

export function currentWeeklyPeriod() {
  const start = startOfWeek()
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start: isoDate(start), end: isoDate(end) }
}

const DAILY_TEMPLATES = [
  { kind: 'daily-3', label: 'Complete 3 quests today', target_count: 3, reward_xp: 30 },
  { kind: 'daily-medium', label: 'Complete a Medium-or-harder quest', target_count: 1, target_difficulty: 'medium', reward_xp: 25 },
]

const WEEKLY_TEMPLATES = [
  { kind: 'weekly-15', label: 'Complete 15 quests this week', target_count: 15, reward_xp: 150 },
  { kind: 'weekly-category', label: 'Complete 5 quests in a focus area', target_count: 5, reward_xp: 100, dynamic: 'random_category' },
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fillDynamic(template) {
  if (template.dynamic === 'random_category') {
    const keys = Object.keys(CATEGORIES)
    const cat = pickRandom(keys)
    const label = CATEGORIES[cat].label
    return {
      ...template,
      target_category: cat,
      label: `Complete ${template.target_count} ${label} quests this week`,
    }
  }
  return template
}

export function generateDailyChallenges() {
  const { start, end } = currentDailyPeriod()
  return DAILY_TEMPLATES.map(t => ({
    kind: t.kind,
    label: t.label,
    scope: 'daily',
    target_count: t.target_count,
    target_difficulty: t.target_difficulty || null,
    target_category: t.target_category || null,
    reward_xp: t.reward_xp,
    period_start: start,
    period_end: end,
  }))
}

export function generateWeeklyChallenges() {
  const { start, end } = currentWeeklyPeriod()
  return WEEKLY_TEMPLATES.map(fillDynamic).map(t => ({
    kind: t.kind,
    label: t.label,
    scope: 'weekly',
    target_count: t.target_count,
    target_difficulty: t.target_difficulty || null,
    target_category: t.target_category || null,
    reward_xp: t.reward_xp,
    period_start: start,
    period_end: end,
  }))
}

const DIFFICULTY_RANK = { trivial: 0, easy: 1, medium: 2, hard: 3, epic: 4, legendary: 5 }

export function questMatchesChallenge(quest, challenge) {
  if (challenge.target_category && quest.category !== challenge.target_category) return false
  if (challenge.target_difficulty) {
    const need = DIFFICULTY_RANK[challenge.target_difficulty] ?? 0
    const got = DIFFICULTY_RANK[quest.difficulty] ?? 0
    if (got < need) return false
  }
  return true
}
