// Supabase Edge Function: morning-digest
// Sends ONE consolidated "here's your day" Web Push per user, early each
// morning — a roll-up of what's awaiting approval, overdue, and due today.
// This is the bookend to `dispatch-reminders` (which fires per-task pings
// throughout the day); together they are the task-manager's reminder feed.
//
// Deploy: supabase functions deploy morning-digest
// Secrets needed (same VAPID triplet as dispatch-reminders / frontend):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// Schedule (pg_cron): 0 9 * * *  AND  0 10 * * *  (UTC)
//   5am America/New_York is 09:00 UTC in EDT, 10:00 UTC in EST. Scheduling
//   both and guarding with a per-local-day idempotency check means it fires
//   once at 5am local year-round without double-sending.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@corequest.app'
// Effectively single-tenant, but kept user-scoped to match the rest of the
// schema. America/Denver mirrors the MCP server's `config.userTz` (Matt = Mountain).
const USER_TZ = Deno.env.get('USER_TZ') || 'America/Denver'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

const ACTIVE = ['available', 'in_progress']

// Local calendar date (YYYY-MM-DD) in the user's timezone — matches the MCP
// server's todayStr() so the digest's buckets line up with the app/board.
function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: USER_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function countFor(userId: string, build: (q: any) => any): Promise<number> {
  let q = admin
    .from('quests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  q = build(q)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const today = todayStr()
  const now = new Date()

  // Every user with at least one device is a digest candidate.
  const { data: subRows, error: subErr } = await admin
    .from('push_subscriptions')
    .select('user_id')
  if (subErr) {
    return new Response(JSON.stringify({ error: subErr.message }), { status: 500 })
  }
  const userIds = [...new Set((subRows ?? []).map((r) => r.user_id))]

  const results: Record<string, unknown>[] = []

  for (const userId of userIds) {
    // Idempotency: if a digest already went out for this local day, skip.
    const { data: already } = await admin
      .from('claude_actions')
      .select('id')
      .eq('user_id', userId)
      .eq('action', 'morning_digest')
      .eq('payload->>date', today)
      .limit(1)
    if (already && already.length > 0) {
      results.push({ userId, skipped: 'already-sent' })
      continue
    }

    const [pending, overdue, dueToday] = await Promise.all([
      countFor(userId, (q) => q.eq('approval_status', 'proposed')),
      countFor(userId, (q) =>
        q.eq('approval_status', 'approved').in('status', ACTIVE).lt('due_date', today)),
      countFor(userId, (q) =>
        q.eq('approval_status', 'approved').in('status', ACTIVE).eq('due_date', today)),
    ])

    // Nothing to say — no empty ping.
    if (pending === 0 && overdue === 0 && dueToday === 0) {
      results.push({ userId, skipped: 'nothing-to-report' })
      continue
    }

    const parts: string[] = []
    if (dueToday > 0) parts.push(`${dueToday} due today`)
    if (overdue > 0) parts.push(`${overdue} overdue`)
    if (pending > 0) parts.push(`${pending} awaiting approval`)
    const body = parts.join(' · ')

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    let sent = 0
    let failed = 0
    const payload = JSON.stringify({
      title: 'Good morning ☀️',
      body,
      url: '/quests',
      tag: 'morning-digest',
    })

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (err) {
        failed++
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    // Only stamp the idempotency row once a device actually received it, so a
    // transient all-fail at 09:00 UTC still gets retried at 10:00 UTC.
    if (sent > 0) {
      await admin.from('claude_actions').insert({
        user_id: userId,
        action: 'morning_digest',
        summary: `Morning digest: ${body}`,
        payload: { date: today, pending, overdue, today: dueToday, sent, failed },
      })
    }

    results.push({ userId, pending, overdue, today: dueToday, sent, failed })
  }

  return new Response(
    JSON.stringify({ ranAt: now.toISOString(), tz: USER_TZ, date: today, users: results }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
