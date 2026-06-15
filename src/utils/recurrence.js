import { RECURRENCES } from '../config/constants'

export const recurrenceOptions = Object.entries(RECURRENCES).map(([key, val]) => ({
  value: key,
  label: val.label,
}))

export function isRecurring(quest) {
  return quest?.recurrence && quest.recurrence !== 'none'
}

function shiftDate(isoDate, recurrence) {
  const d = new Date(isoDate)
  if (recurrence === 'daily') d.setDate(d.getDate() + 1)
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d
}

// Parse a 'YYYY-MM-DD' value as a LOCAL calendar date (local midnight).
// `new Date('YYYY-MM-DD')` parses as UTC midnight, which is the wrong day for
// users west of UTC — so we build the date from its parts in local time instead.
function parseLocalDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Format a Date as 'YYYY-MM-DD' from its LOCAL calendar parts (not toISOString,
// which would convert back to UTC and reintroduce the off-by-one).
function formatLocalDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function nextDueDate(quest) {
  if (!isRecurring(quest)) return null
  const base = quest.due_date ? parseLocalDate(quest.due_date) : new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = shiftDate(base, quest.recurrence)
  while (next < today) {
    next = shiftDate(next, quest.recurrence)
  }
  return formatLocalDate(next)
}

export function nextReminderAt(quest) {
  if (!isRecurring(quest) || !quest.reminder_at) return null
  const base = new Date(quest.reminder_at)
  const now = new Date()
  let next = shiftDate(base, quest.recurrence)
  while (next < now) {
    next = shiftDate(next, quest.recurrence)
  }
  return next.toISOString()
}
