// Push notification handler — loaded alongside the Workbox SW
// This file is registered separately for push events

self.addEventListener('push', function(event) {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch (e) {
    payload = { title: 'Fluentia', body: event.data.text() }
  }

  const title = payload.title || 'Fluentia Academy'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo-icon-dark.png',
    badge: '/logo-icon-dark.png',
    image: payload.image,
    dir: 'rtl',
    lang: 'ar',
    tag: payload.tag || 'fluentia-' + Date.now(),
    renotify: true,
    requireInteraction: payload.priority === 'high' || payload.priority === 'urgent',
    data: {
      url: payload.url || '/',
      notificationId: payload.notificationId,
    },
    actions: payload.actionLabel ? [
      { action: 'open', title: payload.actionLabel }
    ] : [],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
