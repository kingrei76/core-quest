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
