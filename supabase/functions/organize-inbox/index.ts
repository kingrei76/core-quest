// Supabase Edge Function: organize-inbox
//
// The "scheduled organizer." On a pg_cron timer it reads unprocessed inbox_items
// (raw captures from Apple Reminders via import-from-reminders), turns each into an
// approved quest, carries the user's due date + reminder time through, marks the
// inbox item processed, and sends ONE summary Web Push so Matt knows new tasks landed.
//
// Rule-based by design (no LLM, no API key): title = capture text verbatim, with a
// best-guess category + difficulty. Matt sets the real reminder/due dates in Reminders,
// so those are the load-bearing fields — they pass through unchanged.
//
// Deploy: supabase functions deploy organize-inbox --no-verify-jwt --linked
// Secrets needed (already set for dispatch-reminders): VAPID_PUBLIC_KEY,
//   VAPID_PRIVATE_KEY, VAPID_SUBJECT. Optional: USER_TZ (default America/Denver).
// Schedule: pg_cron every 5 min -> net.http_post(...) calling this function.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@corequest.app'
// The timezone Apple Reminders' local date/time strings are in (Matt's Mac = Mountain).
const USER_TZ = Deno.env.get('USER_TZ') || 'America/Denver'

let pushReady = false
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    pushReady = true
  } catch (err) {
    console.error('[organize-inbox] invalid VAPID config — summary push disabled:', (err as Error)?.message)
  }
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// quests.xp_value is NOT NULL; mirror DIFFICULTY_XP from the app's constants.
const DIFFICULTY_XP: Record<string, number> = {
  trivial: 5, easy: 10, medium: 25, hard: 50, epic: 100, legendary: 200,
}

// Game categories (must match VALID_CATEGORIES): health, intelligence, money,
// relationships, household. Checked in priority order; first keyword hit wins.
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'money', keywords: ['rent', 'invoice', 'pay', 'bill', 'insurance', 'bank', 'budget', 'tax', 'payment', 'clover', 'stripe', 'properties', 'refund', 'deposit', 'price', 'quote', 'cost'] },
  { category: 'health', keywords: ['gym', 'workout', 'run', 'doctor', 'dentist', 'medicine', 'meal', 'eat', 'recipe', 'chicken', 'sleep', 'health', 'appt', 'appointment', 'ollie', 'dog', 'walk'] },
  { category: 'relationships', keywords: ['call', 'text', 'meet', 'lunch', 'dinner', 'birthday', 'gift', 'wife', 'kids', 'family', 'friend', 'josh', 'visit', 'reach out'] },
  { category: 'intelligence', keywords: ['learn', 'read', 'study', 'research', 'design', 'build', 'code', 'plan', 'app', 'dashboard', 'write', 'draft', 'review', 'figure out', 'idea', 'sketch', 'sheet', 'grid', 'layer', 'zone'] },
  { category: 'household', keywords: ['clean', 'fix', 'buy', 'list', 'ship', 'label', 'organize', 'repair', 'home', 'house', 'yard', 'trash', 'order', 'pick up', 'drop off', 'bunk', 'bed'] },
]

const EASY_HINTS = ['call', 'text', 'email', 'buy', 'check', 'quick', 'list', 'send', 'reply', 'pay', 'order']
const HARD_HINTS = ['build', 'plan', 'design', 'research', 'write', 'create', 'launch', 'set up', 'figure out', 'redesign', 'migrate']

function guessCategory(text: string): string {
  const t = text.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.category
  }
  return 'household'
}

function guessDifficulty(text: string): string {
  const t = text.toLowerCase()
  if (HARD_HINTS.some((k) => t.includes(k))) return 'hard'
  if (EASY_HINTS.some((k) => t.includes(k))) return 'easy'
  return 'medium'
}

// Convert a local wall-clock date+time (in tz) to a correct UTC ISO timestamp.
// Standard offset-finding trick using Intl — handles MST/MDT automatically.
function offsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts = dtf.formatToParts(instant)
  const m: Record<string, number> = {}
  for (const p of parts) if (p.type !== 'literal') m[p.type] = Number(p.value)
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second)
  return asUTC - instant.getTime()
}

function localToUtcIso(dateStr: string, timeStr: string, tz: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr)
  if (!dm || !tm) return null
  const [, y, mo, d] = dm.map(Number)
  const [, h, mi] = tm.map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0)
  const off = offsetMs(new Date(guess), tz)
  return new Date(guess - off).toISOString()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { data: inbox, error: inErr } = await admin
    .from('inbox_items')
    .select('id, user_id, content, metadata, external_id')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(100)

  if (inErr) {
    return new Response(JSON.stringify({ error: inErr.message }), { status: 500 })
  }
  if (!inbox || inbox.length === 0) {
    return new Response(JSON.stringify({ organized: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const createdByUser: Record<string, number> = {}
  let organized = 0

  for (const item of inbox) {
    const content = (item.content ?? '').trim()
    if (!content) {
      // Non-task / empty capture — mark processed so it doesn't loop forever.
      await admin.from('inbox_items').update({ processed: true }).eq('id', item.id)
      continue
    }

    const meta = (item.metadata ?? {}) as Record<string, string>
    const category = guessCategory(content)
    const difficulty = guessDifficulty(content)

    const quest: Record<string, unknown> = {
      user_id: item.user_id,
      title: content,
      category,
      difficulty,
      xp_value: DIFFICULTY_XP[difficulty] ?? 25,
      status: 'available',
      approval_status: 'approved',
      inbox_source_id: item.id,
      external_source: 'ios_reminders',
      external_id: item.external_id ?? null,
      metadata: { created_by: 'organizer', source: 'organize-inbox' },
    }

    if (meta.due_date) quest.due_date = meta.due_date
    if (meta.reminder_date && meta.reminder_time) {
      const iso = localToUtcIso(meta.reminder_date, meta.reminder_time, USER_TZ)
      if (iso) quest.reminder_at = iso
    }

    const { error: qErr } = await admin.from('quests').insert(quest)
    if (qErr) {
      // Leave the inbox item unprocessed so a later run can retry it.
      console.error('[organize-inbox] quest insert failed for', item.id, qErr.message)
      continue
    }

    await admin.from('inbox_items').update({ processed: true }).eq('id', item.id)
    organized++
    createdByUser[item.user_id] = (createdByUser[item.user_id] ?? 0) + 1
  }

  // One summary push per user who got new tasks.
  let pushed = 0
  if (pushReady) {
    for (const [userId, count] of Object.entries(createdByUser)) {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId)
      if (!subs || subs.length === 0) continue

      const payload = JSON.stringify({
        title: count === 1 ? 'New task added' : `${count} new tasks added`,
        body: count === 1
          ? 'A capture was organized into Core Quest.'
          : `${count} captures were organized into Core Quest.`,
        url: '/quests',
        tag: 'organize-inbox',
      })
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          pushed++
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ organized, pushed, scanned: inbox.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
