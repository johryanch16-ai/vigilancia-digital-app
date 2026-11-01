// Service Worker para Notificaciones Nativas Móviles y de Escritorio - Vigilancia Digital S.A.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escuchar mensajes desde la aplicación para disparar notificaciones nativas en teléfonos (Android / iOS PWA / Desktop)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    if (!title) return;

    event.waitUntil(
      self.registration.showNotification(title, {
        body: options?.body || '',
        icon: options?.icon || '/logo.jpg',
        badge: options?.badge || '/logo.jpg',
        tag: options?.tag || 'vigilancia-ticket-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        vibrate: options?.vibrate || [300, 120, 300, 120, 400],
        data: options?.data || { url: '/admin/tickets' }
      })
    );
  }
});

// Al tocar la notificación en el teléfono, abrir o enfocar la ventana en /admin/tickets
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/tickets';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (client.url && !client.url.includes(targetUrl) && 'navigate' in client) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

