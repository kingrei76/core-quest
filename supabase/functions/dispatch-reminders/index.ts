// Supabase Edge Function: dispatch-reminders
// Scans quests with reminder_at falling in the recent window and sends a
// Web Push notification to every subscription belonging to the quest's user.
//
// Deploy: supabase functions deploy dispatch-reminders
// Secrets needed:
//   VAPID_PUBLIC_KEY  - VAPID public key (matches VITE_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY - VAPID private key
//   VAPID_SUBJECT     - "mailto:you@example.com" or your site URL
// Schedule (Supabase Dashboard -> Database -> Cron):
//   Every 5 minutes -> select net.http_post(...) calling this function

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

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const now = new Date()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)

  const { data: quests, error: qErr } = await admin
    .from('quests')
    .select('id, user_id, title, category, reminder_at, status')
    .gte('reminder_at', fiveMinAgo.toISOString())
    .lte('reminder_at', now.toISOString())
    .in('status', ['available', 'in_progress'])

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const quest of quests ?? []) {
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', quest.user_id)

    for (const sub of subs ?? []) {
      const payload = JSON.stringify({
        title: 'Quest reminder',
        body: quest.title,
        url: `/quests`,
        tag: `quest-${quest.id}`,
      })
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
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
  }

  return new Response(
    JSON.stringify({ scanned: quests?.length ?? 0, sent, failed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
