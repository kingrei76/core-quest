/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Network-first for Supabase API calls so cached data stays fresh
registerRoute(
  ({ url }) => /\.supabase\.co$/i.test(url.hostname),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 10,
  })
)

// SPA navigation fallback
registerRoute(new NavigationRoute(async () => {
  const cache = await caches.match('/index.html')
  return cache || fetch('/index.html')
}))

sw.addEventListener('push', (event) => {
  let payload = { title: 'CORE Quest', body: 'You have a quest reminder.', url: '/quests' }
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.body = event.data.text()
    }
  }
  event.waitUntil(
    sw.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/quests' },
      tag: payload.tag || 'quest-reminder',
      renotify: true,
    })
  )
})

sw.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/quests'
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      if (sw.clients.openWindow) return sw.clients.openWindow(target)
    })
  )
})

sw.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') sw.skipWaiting()
})

// Re-subscribe automatically when the browser invalidates our push subscription
// (happens periodically on iOS PWAs and when push servers rotate keys).
sw.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const oldEndpoint = event.oldSubscription?.endpoint
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey
      if (!applicationServerKey) return
      const fresh = await sw.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
      // Notify any open client so it can persist the new subscription to Supabase.
      const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGED',
          oldEndpoint,
          subscription: fresh.toJSON(),
        })
      }
    } catch {
      // Best-effort; surfacing this requires an open client.
    }
  })())
})
