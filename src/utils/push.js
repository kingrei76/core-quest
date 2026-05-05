import { supabase } from '../config/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function pushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

export function permissionState() {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

export async function getCurrentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function subscribeToPush(userId) {
  if (!pushSupported()) throw new Error('Push not supported on this device')
  if (!VAPID_PUBLIC_KEY) throw new Error('Missing VITE_VAPID_PUBLIC_KEY')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission denied')

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const json = sub.toJSON()
  const p256dh = json.keys?.p256dh || bufferToBase64(sub.getKey('p256dh'))
  const auth = json.keys?.auth || bufferToBase64(sub.getKey('auth'))

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    await sub.unsubscribe().catch(() => {})
    throw error
  }

  return sub
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return
  const sub = await getCurrentSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe().catch(() => {})
}

// Verify that the browser's current subscription matches a row in
// push_subscriptions. If the row is missing (server-side cleanup, manual
// delete, etc.) re-upsert it. If the browser has no subscription but the
// permission is granted, do nothing — the user can re-enable explicitly.
export async function reconcileSubscription(userId) {
  if (!pushSupported() || !userId) return { state: 'unsupported' }
  if (Notification.permission !== 'granted') return { state: 'no-permission' }
  const sub = await getCurrentSubscription()
  if (!sub) return { state: 'no-subscription' }

  const json = sub.toJSON()
  const p256dh = json.keys?.p256dh || bufferToBase64(sub.getKey('p256dh'))
  const auth = json.keys?.auth || bufferToBase64(sub.getKey('auth'))

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' },
    )
  if (error) return { state: 'error', error: error.message }
  return { state: 'ok', endpoint: sub.endpoint }
}

// Persist a subscription that the service worker re-created via its
// `pushsubscriptionchange` handler. Removes the stale endpoint row first.
export async function syncRotatedSubscription(userId, oldEndpoint, subscriptionJson) {
  if (!userId || !subscriptionJson?.endpoint) return
  if (oldEndpoint && oldEndpoint !== subscriptionJson.endpoint) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', oldEndpoint)
  }
  await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' },
    )
}

// Trigger the send-test-push edge function. Returns the function's response
// shape so the UI can show the user exactly what happened.
export async function sendTestPush() {
  if (!pushSupported()) throw new Error('Push not supported on this device')
  if (Notification.permission !== 'granted') throw new Error('Notification permission not granted')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-push`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })
  let body
  try { body = await res.json() } catch { body = { error: 'invalid json from edge function' } }
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
  return body
}
