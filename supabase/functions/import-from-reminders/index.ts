// Supabase Edge Function: import-from-reminders
// Accepts a bearer-token-authenticated POST from the Mac-side import.sh,
// inserts each item as a row in inbox_items, returns the matching reminder_ids
// so the caller knows which Apple Reminders to mark complete.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const IMPORT_TOKEN = Deno.env.get('REMINDERS_IMPORT_TOKEN')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const auth = req.headers.get('Authorization') || ''
  const expected = `Bearer ${IMPORT_TOKEN}`
  if (!IMPORT_TOKEN || auth !== expected) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }

  type IncomingItem = {
    reminder_id?: string
    content?: string
    due_date?: string
    reminder_date?: string
    reminder_time?: string
  }

  let body: { user_id?: string; items?: IncomingItem[] }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400)
  }

  const userId = body.user_id
  const items = Array.isArray(body.items) ? body.items : []

  if (!userId || typeof userId !== 'string') {
    return jsonResponse({ error: 'user_id required' }, 400)
  }

  if (items.length === 0) {
    return jsonResponse({ inserted: 0, ids: [], reminder_ids: [] })
  }

  const reminderIds: string[] = []
  type Row = {
    user_id: string
    content: string
    type: string
    processed: boolean
    external_id: string
    external_source: string
    metadata: Record<string, string>
  }
  const rows: Row[] = []
  for (const item of items) {
    const content = (item.content ?? '').trim()
    const reminderId = (item.reminder_id ?? '').trim()
    if (!content || !reminderId) continue
    const metadata: Record<string, string> = {}
    if (item.due_date) metadata.due_date = item.due_date
    if (item.reminder_date) metadata.reminder_date = item.reminder_date
    if (item.reminder_time) metadata.reminder_time = item.reminder_time
    rows.push({
      user_id: userId,
      content,
      type: 'unsorted',
      processed: false,
      external_id: reminderId,
      external_source: 'ios_reminders',
      metadata,
    })
    reminderIds.push(reminderId)
  }

  if (rows.length === 0) {
    return jsonResponse({ inserted: 0, ids: [], reminder_ids: [] })
  }

  // Upsert with the existing unique index (user_id, external_source, external_id).
  // ignoreDuplicates makes re-runs idempotent — if a Reminder was previously imported
  // but not marked complete (mid-run failure), it won't double-insert.
  const { data, error } = await admin
    .from('inbox_items')
    .upsert(rows, {
      onConflict: 'user_id,external_source,external_id',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  // Return ALL submitted reminder_ids so the Mac marks them complete regardless of
  // whether they were freshly inserted or already present.
  return jsonResponse({
    inserted: data?.length ?? 0,
    ids: (data ?? []).map((r) => r.id),
    reminder_ids: reminderIds,
  })
})
