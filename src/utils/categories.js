import { CATEGORIES, DIFFICULTIES } from '../config/constants'

export const categoryOptions = Object.entries(CATEGORIES).map(([key, val]) => ({
  value: key,
  label: val.label,
  color: val.color,
  stat: val.stat,
}))

export const difficultyOptions = Object.entries(DIFFICULTIES).map(([key, val]) => ({
  value: key,
  label: val.label,
  xp: val.xp,
  color: val.color,
}))
