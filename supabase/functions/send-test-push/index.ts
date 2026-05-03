// Supabase Edge Function: send-test-push
// Sends a single Web Push to every push_subscriptions row belonging to the
// caller, immediately. Use this to validate the entire VAPID + subscription
// + iOS PWA pipeline without waiting for cron + a real reminder.
//
// Auth: standard Supabase user JWT in the Authorization header.
// The function uses the user's JWT to identify them, then a service-role
// client to load their subscriptions.
//
// Deploy: supabase functions deploy send-test-push
// Same secrets as dispatch-reminders:
//   VAPID_PUBLIC_KEY  - matches VITE_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT     - "mailto:you@example.com" or your site URL
//
// Returns:
//   { sent: N, failed: N, results: [{ endpoint, ok, status?, error? }, ...] }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@corequest.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

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

function maskEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    const path = url.pathname
    const tail = path.slice(-12)
    return `${url.host}…${tail}`
  } catch {
    return endpoint.slice(0, 32) + '…'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)

  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ error: 'missing bearer token' }, 401)
  }

  // Use the caller's JWT to identify them.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) return jsonResponse({ error: 'invalid session' }, 401)
  const userId = userData.user.id

  const { data: subs, error: subErr } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (subErr) return jsonResponse({ error: subErr.message }, 500)
  if (!subs || subs.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, results: [], note: 'no subscriptions on file' })
  }

  const payload = JSON.stringify({
    title: 'CORE Quest test',
    body: 'If you can read this, push is working end-to-end.',
    url: '/character',
    tag: 'test-push',
  })

  type Result = { endpoint: string; ok: boolean; status?: number; error?: string }
  const results: Result[] = []
  let sent = 0
  let failed = 0

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent++
      results.push({ endpoint: maskEndpoint(sub.endpoint), ok: true })
    } catch (err) {
      failed++
      const status = (err as { statusCode?: number })?.statusCode
      const message = (err as { body?: string; message?: string })?.body
        || (err as { message?: string })?.message
        || 'unknown error'
      results.push({ endpoint: maskEndpoint(sub.endpoint), ok: false, status, error: String(message).slice(0, 200) })
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return jsonResponse({ sent, failed, results })
})
