// Week math + block bucketing for the Week board. Groups the focus week the
// Monday planning routine stamps (quests.focus_week / planned_day / reminder_at)
// into Mon–Fri day columns with Morning / Afternoon / Anytime blocks.
//
// focusMonday/localDateStr are a deliberate port of todayStr()/mondayStr() in
// mcp-server/src/supabase.js — the MCP server is the source of truth for week
// semantics (Sat/Sun anchor to the *ending* week's Monday). If that file
// changes, this one must change with it.
//
// Everything takes explicit now/tz so tests pass under CI's TZ=UTC and on a
// Denver machine alike.

export const FOCUS_TZ = 'America/Denver' // paired with mcp-server/src/config.js userTz

// The device's timezone — block DISPLAY follows the phone (a reminder pings at
// an absolute moment; the board shows that moment in local time wherever Matt
// is). Week IDENTITY (focusMonday) stays pinned to FOCUS_TZ so the board always
// agrees with slot_task about which Monday a week belongs to.
export function deviceTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FOCUS_TZ
}

export const BLOCK_ORDER = ['morning', 'afternoon', 'anytime']

export const BLOCK_LABELS = {
  morning: '🌅 Morning',
  afternoon: '🌆 Afternoon',
  anytime: 'Anytime',
}

// Date (YYYY-MM-DD) of `now` in the given timezone.
export function localDateStr(now = new Date(), tz = FOCUS_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// The Monday (YYYY-MM-DD) of the week containing `now` in tz. Sunday maps to
// the *previous* Monday (the week that is ending), same as mondayStr().
export function focusMonday(now = new Date(), tz = FOCUS_TZ) {
  const d = new Date(localDateStr(now, tz) + 'T00:00:00Z') // date-only math at UTC midnight
  const dow = d.getUTCDay() // 0=Sun … 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ['Mon', … 'Fri'] dates for the week starting at `monday`.
export function weekdayDates(monday) {
  return [0, 1, 2, 3, 4].map(i => addDays(monday, i))
}

function localHour(timestamp, tz) {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date(timestamp))
  )
}

// Block convention (shared with the cloud routines): reminder_at before noon
// local = morning block, noon or later = afternoon, no reminder = anytime.
// Defaults to the DEVICE timezone so the board travels with the phone.
export function blockFor(quest, tz = deviceTz()) {
  if (!quest.reminder_at) return 'anytime'
  return localHour(quest.reminder_at, tz) < 12 ? 'morning' : 'afternoon'
}

// Reminder timestamp for dropping a task into a block on `dateStr`, using the
// DEVICE'S local 9:00 / 13:00 anchors (per the CLAUDE.md reminder rule:
// new Date('YYYY-MM-DDTHH:mm').toISOString() carries the local offset).
// 'anytime' means no reminder.
export function blockReminderISO(dateStr, block) {
  if (block === 'anytime') return null
  const anchor = block === 'morning' ? '09:00' : '13:00'
  return new Date(`${dateStr}T${anchor}`).toISOString()
}

// Short time label for a card, e.g. "9:00a" / "1:30p", in tz.
export function reminderLabel(quest, tz = deviceTz()) {
  if (!quest.reminder_at) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(quest.reminder_at))
  const get = type => parts.find(p => p.type === type)?.value ?? ''
  return `${get('hour')}:${get('minute')}${get('dayPeriod').toLowerCase().startsWith('p') ? 'p' : 'a'}`
}

// Board membership: approved (null-tolerant, matching QuestsPage), top-level,
// and a status the whiteboard shows (completed stays visible, checked off).
const BOARD_STATUSES = ['available', 'in_progress', 'completed']

export function boardQuests(quests) {
  return (quests ?? []).filter(q =>
    !q.parent_quest_id &&
    BOARD_STATUSES.includes(q.status) &&
    (!q.approval_status || q.approval_status === 'approved')
  )
}

// Split a mixed fetch into this focus week's rows vs the active backlog
// (approved active tasks NOT in this week — shown on the board so Matt can
// slot them into the week himself).
export function splitBoard(quests, monday) {
  const board = boardQuests(quests)
  return {
    week: board.filter(q => q.focus_week === monday),
    backlog: board.filter(q => q.focus_week !== monday && q.status !== 'completed'),
  }
}

// Monday-review grouping: everything by AREA (category) — Matt's "babies" —
// so the whole week can be inspected per area before it's confirmed.
// Returns [{ key, slotted, unslotted, backlog }] sorted by week involvement.
export function groupByArea(week, backlog) {
  const areas = new Map()
  const bucket = (key) => {
    if (!areas.has(key)) areas.set(key, { key, slotted: [], unslotted: [], backlog: [] })
    return areas.get(key)
  }
  for (const q of week) {
    const area = bucket(q.category || 'other')
    if (q.planned_day) area.slotted.push(q)
    else area.unslotted.push(q)
  }
  for (const q of backlog) bucket(q.category || 'other').backlog.push(q)
  return [...areas.values()].sort(
    (a, b) =>
      b.slotted.length + b.unslotted.length - (a.slotted.length + a.unslotted.length)
  )
}

// Group a focus week's quests into day columns + rails.
// Returns {
//   days: [{ date, blocks: { morning: [], afternoon: [], anytime: [] } } ×5],
//   unslotted: [],  // in the focus week but no planned_day
//   offWeek: [],    // planned_day outside this Mon–Fri (e.g. weekend)
// }
export function groupFocusWeek(quests, monday, tz = deviceTz()) {
  const days = weekdayDates(monday).map(date => ({
    date,
    blocks: { morning: [], afternoon: [], anytime: [] },
  }))
  const byDate = new Map(days.map(d => [d.date, d]))
  const unslotted = []
  const offWeek = []

  for (const q of boardQuests(quests)) {
    if (!q.planned_day) {
      unslotted.push(q)
      continue
    }
    const day = byDate.get(q.planned_day)
    if (!day) {
      offWeek.push(q)
      continue
    }
    day.blocks[blockFor(q, tz)].push(q)
  }

  return { days, unslotted, offWeek }
}
