/* Volvo Masters – Firebase Cloud Messaging service worker */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBx8lrLzDWoYAonfiWMvOIpkkDqOo2LC88',
  authDomain: 'volvo-masters.firebaseapp.com',
  projectId: 'volvo-masters',
  storageBucket: 'volvo-masters.firebasestorage.app',
  messagingSenderId: '158093315460',
  appId: '1:158093315460:web:561b64a7f3d24db0fb61d1',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {}
  const title = data.title || payload.notification?.title || 'Volvo Masters'
  const body = data.body || payload.notification?.body || 'Ny händelse'
  const view = data.view || 'home'

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    
    tag: data.tag || `volvo-masters-${view}`,
    renotify: true,
    data: {
      url: `/?view=${encodeURIComponent(view)}`,
    },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification?.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(targetUrl)
        return client.focus()
      }
    }
    return self.clients.openWindow(targetUrl)
  })())
})
