import { describe, it, expect } from 'vitest'
import {
  localDateStr,
  focusMonday,
  addDays,
  weekdayDates,
  blockFor,
  reminderLabel,
  boardQuests,
  groupFocusWeek,
} from './focusWeek'

// These tests guard the Week board's date semantics, which MUST match the MCP
// server (mcp-server/src/supabase.js todayStr/mondayStr) — the Monday routine
// stamps focus_week using that logic, and the board reads it back. Every case
// passes an explicit `now` and tz so results are identical under CI's TZ=UTC
// and on a Denver (America/Denver) machine.

const DENVER = 'America/Denver'

describe('focusMonday', () => {
  it('a Wednesday maps to that week\'s Monday', () => {
    // Wed 2026-07-08 noon Denver
    expect(focusMonday(new Date('2026-07-08T18:00:00Z'), DENVER)).toBe('2026-07-06')
  })

  it('Saturday maps to the ending week\'s Monday (not next week)', () => {
    // Sat 2026-07-11 noon Denver
    expect(focusMonday(new Date('2026-07-11T18:00:00Z'), DENVER)).toBe('2026-07-06')
  })

  it('Sunday maps to the PREVIOUS Monday, matching mondayStr()', () => {
    // Sun 2026-07-12 noon Denver
    expect(focusMonday(new Date('2026-07-12T18:00:00Z'), DENVER)).toBe('2026-07-06')
  })

  it('diverges correctly across the UTC/Denver date line', () => {
    // 2026-07-06T03:00:00Z is Monday 03:00 UTC but still Sunday 21:00 in Denver:
    // Denver is in the week ENDING Mon Jun 29; UTC is already in the week of Jul 6.
    const now = new Date('2026-07-06T03:00:00Z')
    expect(focusMonday(now, DENVER)).toBe('2026-06-29')
    expect(focusMonday(now, 'UTC')).toBe('2026-07-06')
  })

  it('is stable across the DST spring-forward week (Mar 8 2026)', () => {
    // Tue 2026-03-10 noon Denver (MDT, UTC-6 after the Mar 8 jump)
    expect(focusMonday(new Date('2026-03-10T18:00:00Z'), DENVER)).toBe('2026-03-09')
  })
})

describe('localDateStr / addDays / weekdayDates', () => {
  it('localDateStr renders the tz-local calendar date', () => {
    expect(localDateStr(new Date('2026-07-06T03:00:00Z'), DENVER)).toBe('2026-07-05')
    expect(localDateStr(new Date('2026-07-06T03:00:00Z'), 'UTC')).toBe('2026-07-06')
  })

  it('addDays does pure date math across month ends', () => {
    expect(addDays('2026-06-29', 3)).toBe('2026-07-02')
  })

  it('weekdayDates returns Mon–Fri', () => {
    expect(weekdayDates('2026-07-06')).toEqual([
      '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10',
    ])
  })
})

describe('blockFor', () => {
  it('11:59 Denver is morning; 12:00 Denver is afternoon (MDT boundary)', () => {
    // MDT = UTC-6 in July
    expect(blockFor({ reminder_at: '2026-07-08T17:59:00Z' }, DENVER)).toBe('morning')
    expect(blockFor({ reminder_at: '2026-07-08T18:00:00Z' }, DENVER)).toBe('afternoon')
  })

  it('buckets by DENVER hour, not UTC hour (MST winter case)', () => {
    // 18:30 UTC in January = 11:30 Denver (MST, UTC-7) → morning,
    // even though the UTC hour (18) would say afternoon.
    const q = { reminder_at: '2026-01-15T18:30:00Z' }
    expect(blockFor(q, DENVER)).toBe('morning')
    expect(blockFor(q, 'UTC')).toBe('afternoon')
  })

  it('no reminder_at means anytime', () => {
    expect(blockFor({ reminder_at: null }, DENVER)).toBe('anytime')
    expect(blockFor({}, DENVER)).toBe('anytime')
  })
})

describe('reminderLabel', () => {
  it('formats the block start compactly in local time', () => {
    expect(reminderLabel({ reminder_at: '2026-07-08T15:00:00Z' }, DENVER)).toBe('9:00a')
    expect(reminderLabel({ reminder_at: '2026-07-08T19:30:00Z' }, DENVER)).toBe('1:30p')
    expect(reminderLabel({ reminder_at: null }, DENVER)).toBeNull()
  })
})

describe('boardQuests', () => {
  it('keeps approved and legacy-null approval rows, drops proposed/rejected', () => {
    const rows = [
      { id: 1, status: 'available', approval_status: 'approved' },
      { id: 2, status: 'available', approval_status: null }, // pre-migration row
      { id: 3, status: 'available', approval_status: 'proposed' },
      { id: 4, status: 'available', approval_status: 'rejected' },
    ]
    expect(boardQuests(rows).map(q => q.id)).toEqual([1, 2])
  })

  it('keeps completed (shown checked-off), drops failed/abandoned and sub-quests', () => {
    const rows = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'failed' },
      { id: 3, status: 'abandoned' },
      { id: 4, status: 'available', parent_quest_id: 'abc' },
    ]
    expect(boardQuests(rows).map(q => q.id)).toEqual([1])
  })
})

describe('groupFocusWeek', () => {
  const MONDAY = '2026-07-06'

  it('places tasks on their planned day in the right block', () => {
    const quests = [
      { id: 'wed-am', status: 'available', planned_day: '2026-07-08', reminder_at: '2026-07-08T15:00:00Z' },
      { id: 'wed-pm', status: 'available', planned_day: '2026-07-08', reminder_at: '2026-07-08T19:00:00Z' },
      { id: 'wed-any', status: 'available', planned_day: '2026-07-08', reminder_at: null },
    ]
    const { days } = groupFocusWeek(quests, MONDAY, DENVER)
    const wed = days[2]
    expect(wed.date).toBe('2026-07-08')
    expect(wed.blocks.morning.map(q => q.id)).toEqual(['wed-am'])
    expect(wed.blocks.afternoon.map(q => q.id)).toEqual(['wed-pm'])
    expect(wed.blocks.anytime.map(q => q.id)).toEqual(['wed-any'])
  })

  it('routes no-planned-day to unslotted and weekend days to offWeek', () => {
    const quests = [
      { id: 'floating', status: 'available', planned_day: null },
      { id: 'saturday', status: 'available', planned_day: '2026-07-11' },
    ]
    const { days, unslotted, offWeek } = groupFocusWeek(quests, MONDAY, DENVER)
    expect(unslotted.map(q => q.id)).toEqual(['floating'])
    expect(offWeek.map(q => q.id)).toEqual(['saturday'])
    expect(days.every(d => Object.values(d.blocks).every(b => b.length === 0))).toBe(true)
  })

  it('keeps completed tasks visible in their block', () => {
    const quests = [
      { id: 'done', status: 'completed', planned_day: '2026-07-06', reminder_at: '2026-07-06T15:00:00Z' },
    ]
    const { days } = groupFocusWeek(quests, MONDAY, DENVER)
    expect(days[0].blocks.morning.map(q => q.id)).toEqual(['done'])
  })

  it('always returns five day columns even when empty', () => {
    const { days } = groupFocusWeek([], MONDAY, DENVER)
    expect(days).toHaveLength(5)
    expect(days.map(d => d.date)).toEqual(weekdayDates(MONDAY))
  })
})
