import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Activate new service worker immediately when available
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Claim clients so the new SW takes effect without a manual reload
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Precache all assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST)

// Runtime caching: Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// Runtime caching: JS/CSS
registerRoute(
  /\.(?:js|css)$/,
  new NetworkFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50 }),
    ],
  })
)

// Runtime caching: HTML
registerRoute(
  /\.html$/,
  new NetworkFirst({
    cacheName: 'html-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10 }),
    ],
  })
)

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Huishouden', body: event.data.text() }
  }

  const title = data.title || 'Huishouden'
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
