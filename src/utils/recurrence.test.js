import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isRecurring, nextDueDate, nextReminderAt } from './recurrence'

// These tests guard the recurrence scheduling rules:
//   - isRecurring correctly identifies recurring vs one-off quests
//   - nextDueDate always returns a date >= today, advancing by the correct interval
//   - nextReminderAt always returns a timestamp >= now, advancing by the correct interval

// Pin "now" to 2026-06-13 08:00 UTC so assertions are deterministic.
const FIXED_NOW = new Date('2026-06-13T08:00:00.000Z')
const TODAY_ISO = '2026-06-13'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// isRecurring
// ---------------------------------------------------------------------------

describe('isRecurring', () => {
  it('returns false for a one-time quest (recurrence = "none")', () => {
    expect(isRecurring({ recurrence: 'none' })).toBe(false)
  })

  it('returns falsy when recurrence is absent', () => {
    expect(isRecurring({})).toBeFalsy()
  })

  it('returns falsy for null', () => {
    expect(isRecurring(null)).toBeFalsy()
  })

  it('returns true for daily', () => {
    expect(isRecurring({ recurrence: 'daily' })).toBe(true)
  })

  it('returns true for weekly', () => {
    expect(isRecurring({ recurrence: 'weekly' })).toBe(true)
  })

  it('returns true for monthly', () => {
    expect(isRecurring({ recurrence: 'monthly' })).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// nextDueDate
// ---------------------------------------------------------------------------

describe('nextDueDate', () => {
  it('returns null for a non-recurring quest', () => {
    expect(nextDueDate({ recurrence: 'none', due_date: '2026-06-12' })).toBe(null)
  })

  it('returns null when recurrence is missing', () => {
    expect(nextDueDate({ due_date: '2026-06-12' })).toBe(null)
  })

  // A daily quest whose due_date is yesterday should yield today.
  it('daily: advances from yesterday to today', () => {
    const result = nextDueDate({ recurrence: 'daily', due_date: '2026-06-12' })
    expect(result).toBe(TODAY_ISO)
  })

  // A daily quest already due today should yield tomorrow, because shiftDate
  // always advances at least once from the base.
  it('daily: advances from today to tomorrow', () => {
    const result = nextDueDate({ recurrence: 'daily', due_date: TODAY_ISO })
    expect(result).toBe('2026-06-14')
  })

  // A daily quest that is weeks in the past should fast-forward to today.
  it('daily: catches up from a stale date to today', () => {
    const result = nextDueDate({ recurrence: 'daily', due_date: '2026-06-01' })
    // Must land on today or later.
    expect(result >= TODAY_ISO).toBe(true)
  })

  it('weekly: advances from a week ago to today', () => {
    const result = nextDueDate({ recurrence: 'weekly', due_date: '2026-06-06' })
    expect(result).toBe(TODAY_ISO)
  })

  it('weekly: advances from today to a week from now', () => {
    const result = nextDueDate({ recurrence: 'weekly', due_date: TODAY_ISO })
    expect(result).toBe('2026-06-20')
  })

  it('monthly: advances from one month ago to today', () => {
    // 2026-05-13 + 1 month = 2026-06-13
    const result = nextDueDate({ recurrence: 'monthly', due_date: '2026-05-13' })
    expect(result).toBe(TODAY_ISO)
  })

  it('monthly: advances from today to one month hence', () => {
    const result = nextDueDate({ recurrence: 'monthly', due_date: TODAY_ISO })
    expect(result).toBe('2026-07-13')
  })

  // No due_date → treats today as the base, so result is >= today.
  it('returns a date >= today even when due_date is absent', () => {
    const result = nextDueDate({ recurrence: 'daily' })
    expect(result >= TODAY_ISO).toBe(true)
  })

  // The returned value must always be a valid YYYY-MM-DD string.
  it('always returns a YYYY-MM-DD string', () => {
    const result = nextDueDate({ recurrence: 'weekly', due_date: '2026-06-06' })
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ---------------------------------------------------------------------------
// nextReminderAt
// ---------------------------------------------------------------------------

describe('nextReminderAt', () => {
  it('returns null for a non-recurring quest', () => {
    expect(
      nextReminderAt({ recurrence: 'none', reminder_at: '2026-06-12T07:00:00.000Z' })
    ).toBe(null)
  })

  it('returns null when reminder_at is absent', () => {
    expect(nextReminderAt({ recurrence: 'daily' })).toBe(null)
  })

  // A daily reminder from yesterday (same time as now) should advance to today.
  it('daily: advances a yesterday reminder to today (same clock time)', () => {
    const result = nextReminderAt({
      recurrence: 'daily',
      reminder_at: '2026-06-12T08:00:00.000Z',
    })
    expect(result).toBe('2026-06-13T08:00:00.000Z')
  })

  // A reminder already in the future should be left exactly one interval out.
  it('daily: a reminder already in the future is left one day out', () => {
    const result = nextReminderAt({
      recurrence: 'daily',
      reminder_at: '2026-06-13T09:00:00.000Z', // 1 hour from now
    })
    // 1 hour in the future means shiftDate gives us tomorrow same time
    expect(result).toBe('2026-06-14T09:00:00.000Z')
  })

  it('weekly: advances from a week ago to now', () => {
    const result = nextReminderAt({
      recurrence: 'weekly',
      reminder_at: '2026-06-06T08:00:00.000Z',
    })
    expect(result).toBe('2026-06-13T08:00:00.000Z')
  })

  it('monthly: advances from a month ago to today', () => {
    const result = nextReminderAt({
      recurrence: 'monthly',
      reminder_at: '2026-05-13T08:00:00.000Z',
    })
    expect(result).toBe('2026-06-13T08:00:00.000Z')
  })

  // The returned value must always be a full ISO timestamp, never just a date.
  it('always returns a full ISO timestamp string', () => {
    const result = nextReminderAt({
      recurrence: 'daily',
      reminder_at: '2026-06-12T08:00:00.000Z',
    })
    // ISO 8601 full datetime: contains a T and a time component
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
