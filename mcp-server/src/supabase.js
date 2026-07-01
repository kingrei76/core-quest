// Service-role Supabase client + small data helpers. Every query is scoped to
// config.userId so this server can only ever touch Matt's rows.

import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

export const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: { persistSession: false },
})

const UID = config.userId

// Today's date (YYYY-MM-DD) in the user's timezone — used to bucket date-only
// due_dates into today / overdue / upcoming.
export function todayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.userTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// The Monday (YYYY-MM-DD) of the week containing today, in the user's timezone.
// This is the value the weekly PLAN stamps into quests.focus_week; the daily
// read and DEBRIEF filter on focus_week = mondayStr().
export function mondayStr() {
  const d = new Date(todayStr() + 'T00:00:00Z') // anchor at UTC midnight; date-only math
  const dow = d.getUTCDay()                      // 0=Sun … 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow          // days back to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

const ACTIVE = ['available', 'in_progress']

// --- reads -----------------------------------------------------------------

export async function listTasks(view = 'active', limit = 50) {
  const today = todayStr()
  let q = admin.from('quests').select('*').eq('user_id', UID).limit(limit)

  switch (view) {
    case 'pending':
      q = q.eq('approval_status', 'proposed').order('created_at', { ascending: false })
      break
    case 'today':
      q = q.eq('approval_status', 'approved').in('status', ACTIVE).eq('due_date', today)
      break
    case 'overdue':
      q = q.eq('approval_status', 'approved').in('status', ACTIVE).lt('due_date', today)
        .order('due_date', { ascending: true })
      break
    case 'upcoming':
      q = q.eq('approval_status', 'approved').in('status', ACTIVE).gt('due_date', today)
        .order('due_date', { ascending: true })
      break
    case 'planned_today':
      // Day-slotted for today (set during the Monday plan). The daily read.
      q = q.eq('approval_status', 'approved').in('status', ACTIVE).eq('planned_day', today)
        .order('reminder_at', { ascending: true, nullsFirst: false })
      break
    case 'focus':
      // This week's focus list (stamped by the Monday plan).
      q = q.eq('approval_status', 'approved').in('status', ACTIVE).eq('focus_week', mondayStr())
        .order('planned_day', { ascending: true, nullsFirst: false })
      break
    case 'all':
      q = q.order('created_at', { ascending: false })
      break
    case 'active':
    default:
      q = q.eq('approval_status', 'approved').in('status', ACTIVE)
        .order('due_date', { ascending: true, nullsFirst: false })
      break
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getInbox(limit = 50) {
  const { data, error } = await admin
    .from('inbox_items')
    .select('*')
    .eq('user_id', UID)
    .eq('processed', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTask(taskId) {
  const { data, error } = await admin
    .from('quests')
    .select('*')
    .eq('user_id', UID)
    .eq('id', taskId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// Rank Matt's open tasks to answer "what's next?" — returns them ordered most-
// urgent-first, each tagged with a short reason. The ranking mirrors how Matt
// works the day: the time block he's in now > today's day-slots > overdue >
// this week's focus > due today > everything else. Within a tier, higher
// priority and earlier dates win.
export async function getRankedNext() {
  const today = todayStr()
  const monday = mondayStr()
  const now = new Date()

  const { data, error } = await admin
    .from('quests')
    .select('*')
    .eq('user_id', UID)
    .eq('approval_status', 'approved')
    .in('status', ACTIVE)
  if (error) throw new Error(error.message)

  const prioRank = { high: 0, medium: 1, low: 2 }
  const pr = (t) => (t.priority in prioRank ? prioRank[t.priority] : 3)

  const classify = (t) => {
    const slotDue = t.reminder_at && new Date(t.reminder_at) <= now
    if (slotDue) return { tier: 1, reason: 'in your time-slot now' }
    if (t.planned_day === today) return { tier: 2, reason: 'slotted for today' }
    if (t.due_date && t.due_date < today) return { tier: 3, reason: `overdue (due ${t.due_date})` }
    if (t.focus_week === monday) return { tier: 4, reason: 'this week’s focus' }
    if (t.due_date === today) return { tier: 5, reason: 'due today' }
    return { tier: 6, reason: 'available' }
  }

  const tiebreak = (t) => t.reminder_at || (t.due_date ? t.due_date + 'T23:59' : '9999')

  return (data ?? [])
    .map((t) => ({ ...t, ...classify(t) }))
    .sort((a, b) =>
      a.tier - b.tier ||
      pr(a) - pr(b) ||
      (tiebreak(a) < tiebreak(b) ? -1 : tiebreak(a) > tiebreak(b) ? 1 : 0),
    )
}

// --- writes ----------------------------------------------------------------

export async function insertProposed(row) {
  const { data, error } = await admin
    .from('quests')
    .insert({ ...row, user_id: UID })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(taskId, updates) {
  const { data, error } = await admin
    .from('quests')
    .update(updates)
    .eq('user_id', UID)
    .eq('id', taskId)
    .select()
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function markInboxProcessed(inboxId) {
  const { error } = await admin
    .from('inbox_items')
    .update({ processed: true })
    .eq('user_id', UID)
    .eq('id', inboxId)
  if (error) throw new Error(error.message)
}

export async function logAction(action, { questId = null, summary = '', payload = {} } = {}) {
  // Best-effort audit; never let logging failure break a tool call.
  try {
    await admin.from('claude_actions').insert({
      user_id: UID,
      action,
      quest_id: questId,
      summary,
      payload,
    })
  } catch (e) {
    console.error('[audit] failed to log action', action, e?.message)
  }
}
