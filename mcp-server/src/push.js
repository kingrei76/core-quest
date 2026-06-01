// Web Push helper — sends a notification to all of the user's registered
// devices. Reuses the same VAPID key triplet as dispatch-reminders / frontend.
// If VAPID isn't configured, this is a no-op (propose still succeeds).

import webpush from 'web-push'
import { admin } from './supabase.js'
import { config } from './config.js'

let configured = false
if (config.vapidPublic && config.vapidPrivate) {
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublic, config.vapidPrivate)
  configured = true
} else {
  console.warn('[push] VAPID keys not set — push notifications disabled')
}

export async function sendPushToUser({ title, body, url = '/quests', tag = 'core-quest' }) {
  if (!configured) return { sent: 0, skipped: true }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', config.userId)

  if (!subs || subs.length === 0) return { sent: 0, noDevices: true }

  const payload = JSON.stringify({ title, body, url, tag })
  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent++
    } catch (err) {
      const status = err?.statusCode
      // Prune dead subscriptions so we don't keep retrying them.
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      } else {
        console.error('[push] send failed', status, err?.message)
      }
    }
  }
  return { sent }
}
