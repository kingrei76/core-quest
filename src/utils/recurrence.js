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

export function nextDueDate(quest) {
  if (!isRecurring(quest)) return null
  const base = quest.due_date ? new Date(quest.due_date) : new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = shiftDate(base, quest.recurrence)
  while (next < today) {
    next = shiftDate(next, quest.recurrence)
  }
  return next.toISOString().slice(0, 10)
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
