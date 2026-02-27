import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

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
    icon: '/app_icon.jpeg',
    badge: '/app_icon.jpeg',
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
