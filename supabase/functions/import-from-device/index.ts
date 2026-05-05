// Supabase Edge Function: import-from-device
// Accepts batched reminders/notes from an iOS Shortcut and inserts them
// into inbox_items as pending review items. Dedupes by external_id.
//
// Auth: caller passes a per-user token in the Authorization header:
//   Authorization: Bearer cq_xxxxxxxxxxxxxxxxxx
// Tokens are issued client-side and stored in device_import_tokens.
//
// Body shape:
//   {
//     items: [
//       {
//         external_id: "REMINDER_UUID",          // required for dedupe
//         external_source: "ios_reminders",      // required
//         content: "Pick up dry cleaning",       // required
//         due_date: "2026-04-29",                // optional, YYYY-MM-DD
//         metadata: { ...arbitrary }             // optional
//       },
//       ...
//     ]
//   }
//
// Returns: { inserted, skipped }

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)

  const auth = req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (!match) return jsonResponse({ error: 'missing bearer token' }, 401)
  const token = match[1].trim()

  const { data: tokenRow, error: tokenErr } = await admin
    .from('device_import_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr) return jsonResponse({ error: 'token lookup failed' }, 500)
  if (!tokenRow) return jsonResponse({ error: 'invalid token' }, 401)

  const userId = tokenRow.user_id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400)
  }

  const items = (body as { items?: unknown[] })?.items
  if (!Array.isArray(items)) return jsonResponse({ error: 'items must be an array' }, 400)
  if (items.length > 200) return jsonResponse({ error: 'too many items (max 200)' }, 400)
  if (items.length === 0) {
    // Empty batch is a valid "ping" — bump last_used_at so the user can
    // see it in the UI after pressing "Test connection".
    await admin
      .from('device_import_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token)
    return jsonResponse({ inserted: 0, skipped: 0 })
  }

  const rows = items
    .map((raw) => {
      const item = raw as Record<string, unknown>
      const content = typeof item.content === 'string' ? item.content.trim() : ''
      if (!content) return null
      const externalId = typeof item.external_id === 'string' ? item.external_id : null
      const externalSource = typeof item.external_source === 'string' ? item.external_source : 'unknown'
      const dueDate = typeof item.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.due_date)
        ? item.due_date
        : null
      const metadata: Record<string, unknown> = (item.metadata && typeof item.metadata === 'object')
        ? { ...(item.metadata as Record<string, unknown>) }
        : {}
      if (dueDate) metadata.due_date = dueDate
      return {
        user_id: userId,
        content,
        type: 'unsorted' as const,
        processed: false,
        external_id: externalId,
        external_source: externalSource,
        metadata,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length === 0) return jsonResponse({ inserted: 0, skipped: items.length })

  // Insert with on-conflict-do-nothing for the unique (user_id, external_source, external_id) index.
  // Supabase JS client supports `upsert` with `ignoreDuplicates: true`.
  const { data: inserted, error: insertErr } = await admin
    .from('inbox_items')
    .upsert(rows, {
      onConflict: 'user_id,external_source,external_id',
      ignoreDuplicates: true,
    })
    .select('id')

  if (insertErr) return jsonResponse({ error: insertErr.message }, 500)

  // Touch the token's last_used_at so the user can see freshness.
  await admin
    .from('device_import_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', token)

  return jsonResponse({
    inserted: inserted?.length ?? 0,
    skipped: rows.length - (inserted?.length ?? 0),
  })
})
