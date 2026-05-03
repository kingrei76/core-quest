// Supabase Edge Function: dispatch-reminders
// Scans quests whose reminder_at is due and that have not yet been notified
// for this reminder, and sends a Web Push to every subscription belonging
// to the quest's user. Stamps `last_reminded_at` after each successful send
// so back-to-back cron runs don't double-fire and so a late cron run will
// still pick up reminders it missed.
//
// Deploy: supabase functions deploy dispatch-reminders
// Secrets needed:
//   VAPID_PUBLIC_KEY  - VAPID public key (matches VITE_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY - VAPID private key
//   VAPID_SUBJECT     - "mailto:you@example.com" or your site URL
// Schedule (Supabase Dashboard -> Database -> Cron):
//   Every 1-5 minutes -> select net.http_post(...) calling this function

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@corequest.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

// Don't keep firing reminders for things that are days overdue — if a
// cron outage caused a multi-day backlog, only the last 24h is worth
// surfacing.
const STALE_REMINDER_HOURS = 24

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const now = new Date()
  const staleCutoff = new Date(now.getTime() - STALE_REMINDER_HOURS * 60 * 60 * 1000)

  // Pick up everything due and not too stale. We do a column-to-column
  // comparison (last_reminded_at < reminder_at) in JS, since PostgREST
  // can't express that filter directly.
  const { data: candidates, error: qErr } = await admin
    .from('quests')
    .select('id, user_id, title, reminder_at, last_reminded_at')
    .lte('reminder_at', now.toISOString())
    .gte('reminder_at', staleCutoff.toISOString())
    .in('status', ['available', 'in_progress'])
    .limit(500)

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), { status: 500 })
  }

  // Send if we've never reminded, OR if reminder_at was rolled forward
  // past the last reminder we sent (recurrence rollover, manual edit).
  const quests = (candidates ?? []).filter(q => {
    if (!q.last_reminded_at) return true
    return new Date(q.last_reminded_at) < new Date(q.reminder_at)
  })

  let sent = 0
  let failed = 0
  let stamped = 0

  for (const quest of quests) {
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', quest.user_id)

    if (!subs || subs.length === 0) {
      // No devices to push to — still stamp so we don't loop forever.
      await admin
        .from('quests')
        .update({ last_reminded_at: now.toISOString() })
        .eq('id', quest.id)
      stamped++
      continue
    }

    let anyOk = false
    for (const sub of subs) {
      const payload = JSON.stringify({
        title: 'Quest reminder',
        body: quest.title,
        url: `/quests`,
        tag: `quest-${quest.id}`,
      })
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
        anyOk = true
      } catch (err) {
        failed++
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    // Stamp once at least one device was reachable, OR if every device
    // was a permanent failure (already deleted) — either way we shouldn't
    // re-attempt this reminder on the next cron tick.
    if (anyOk || failed > 0) {
      await admin
        .from('quests')
        .update({ last_reminded_at: now.toISOString() })
        .eq('id', quest.id)
      stamped++
    }
  }

  return new Response(
    JSON.stringify({
      candidates: candidates?.length ?? 0,
      scanned: quests.length,
      sent,
      failed,
      stamped,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
