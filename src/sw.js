import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { Queue } from 'workbox-background-sync'

// ─── Service worker lifecycle ──────────────────────────────────────────

// Claim clients so the new SW takes effect without a manual reload
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ─── Precaching (VitePWA injected manifest) ────────────────────────────

precacheAndRoute(self.__WB_MANIFEST)

// ─── Runtime caching: static assets ────────────────────────────────────

// Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// JS/CSS
registerRoute(
  /\.(?:js|css)$/,
  new NetworkFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50 }),
    ],
  })
)

// HTML
registerRoute(
  /\.html$/,
  new NetworkFirst({
    cacheName: 'html-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10 }),
    ],
  })
)

// ─── Offline support: API mutation queue (background sync) ─────────────

/**
 * Notify all open app windows about background sync status changes.
 * @param {string} type - message type
 */
async function notifyClients(type) {
  const clients = await self.clients.matchAll({ type: 'window' })
  for (const client of clients) {
    client.postMessage({ type })
  }
}

// Use Queue directly (instead of BackgroundSyncPlugin) so we can trigger
// manual replay on `online` events — required for Safari/Firefox which
// don't support the Background Sync API.
const mutationQueue = new Queue('api-mutations', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    try {
      await notifyClients('BG_SYNC_STARTED')
      await queue.replayRequests()
      await notifyClients('BG_SYNC_COMPLETE')
    } catch (err) {
      await notifyClients('BG_SYNC_ERROR')
      throw err // Rethrow so Workbox knows to retry later
    }
  },
})

// Intercept API mutation requests (POST/PUT/PATCH/DELETE).
// Try network first; on failure, queue for background sync.
for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkOnly({
      plugins: [
        {
          fetchDidFail: async ({ request }) => {
            // Queue the failed request for replay
            await mutationQueue.pushRequest({ request })
            await notifyClients('BG_SYNC_QUEUED')
          },
        },
      ],
    }),
    method
  )
}

// ─── Manual replay fallback for browsers without Background Sync API ───
// Safari and Firefox don't fire the `sync` event. When the SW detects
// connectivity is restored, manually trigger a replay of the queue.
// Also handles the case where the app was opened while already online
// but the queue has stale entries from a previous offline session.

let isReplaying = false

async function attemptManualReplay() {
  if (isReplaying) return
  isReplaying = true
  try {
    // Check if there are entries in the queue
    const entries = await mutationQueue.getAll()
    if (entries.length === 0) {
      isReplaying = false
      return
    }
    await notifyClients('BG_SYNC_STARTED')
    // replayRequests will process all entries
    await mutationQueue.replayRequests()
    await notifyClients('BG_SYNC_COMPLETE')
  } catch (err) {
    await notifyClients('BG_SYNC_ERROR')
  }
  isReplaying = false
}

// Listen for the main thread telling us we're back online
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  if (event.data && event.data.type === 'REPLAY_MUTATIONS') {
    attemptManualReplay()
  }
})

// ─── Push notifications ────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Huis', body: event.data.text() }
  }

  const title = data.title || 'Huis'
  const options = {
    body: data.body || '',
    icon: '/icons/icon512_rounded.png',
    tag: 'daily-summary',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click handler — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/')
    })
  )
})
