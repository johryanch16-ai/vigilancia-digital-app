// Service Worker Oficial PWA + Monitor de Tickets en Segundo Plano - Vigilancia Digital S.A.

const CACHE_NAME = 'vigilancia-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.jpg'
];

// Estado en memoria del Service Worker (respaldado en IndexedDB para persistir reinicios de la App)
let swMonitorConfig = {
  supabaseUrl: '',
  supabaseKey: '',
  username: '',
  enabled: false,
  knownIds: new Set()
};
let swPollTimer = null;

// ============================================================================
// Persistencia ligera en IndexedDB dentro del Service Worker
// ============================================================================
function openSwDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vigilancia_sw_db', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveConfigToIdb(cfg) {
  try {
    const db = await openSwDb();
    const tx = db.transaction('config', 'readwrite');
    tx.objectStore('config').put({
      supabaseUrl: cfg.supabaseUrl || '',
      supabaseKey: cfg.supabaseKey || '',
      username: cfg.username || '',
      enabled: Boolean(cfg.enabled),
      knownIds: Array.from(cfg.knownIds || [])
    }, 'monitor');
  } catch (e) {}
}

async function loadConfigFromIdb() {
  try {
    const db = await openSwDb();
    return await new Promise((resolve) => {
      const tx = db.transaction('config', 'readonly');
      const req = tx.objectStore('config').get('monitor');
      req.onsuccess = () => {
        if (req.result) {
          swMonitorConfig = {
            supabaseUrl: req.result.supabaseUrl || '',
            supabaseKey: req.result.supabaseKey || '',
            username: req.result.username || '',
            enabled: Boolean(req.result.enabled),
            knownIds: new Set(Array.isArray(req.result.knownIds) ? req.result.knownIds : [])
          };
        }
        resolve(swMonitorConfig);
      };
      req.onerror = () => resolve(swMonitorConfig);
    });
  } catch (e) {
    return swMonitorConfig;
  }
}

// ============================================================================
// Ciclo de vida PWA (Install, Activate, Fetch para WebAPK / Standalone App)
// ============================================================================
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
      await loadConfigFromIdb();
      startSwBackgroundMonitor();
    })()
  );
});

// Manejador fetch requerido para que Android/Chrome/Edge/iOS instalen la PWA como App nativa (WebAPK)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // No interceptar llamadas a Supabase ni APIs externas
  if (url.origin !== self.location.origin) return;

  // Para navegación SPA (ej. /admin/tickets, /admin/branches) cuando se abre como App instalada
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Estrategia Network-first con respaldo en caché para íconos y recursos estáticos
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200 && STATIC_ASSETS.includes(url.pathname)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================================================
// Verificación de tickets en segundo plano desde la App instalada (Service Worker)
// ============================================================================
async function checkSupabaseInBackground() {
  if (!swMonitorConfig.supabaseUrl || !swMonitorConfig.supabaseKey) {
    await loadConfigFromIdb();
  }
  if (!swMonitorConfig.enabled || !swMonitorConfig.supabaseUrl || !swMonitorConfig.supabaseKey) {
    return;
  }

  try {
    const endpoint = `${swMonitorConfig.supabaseUrl}/rest/v1/tickets?select=*&order=created_at.desc&limit=10`;
    const res = await fetch(endpoint, {
      headers: {
        'apikey': swMonitorConfig.supabaseKey,
        'Authorization': `Bearer ${swMonitorConfig.supabaseKey}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) return;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return;

    // Si es la primera vez y no había IDs registrados, inicializarlos sin spamear
    if (swMonitorConfig.knownIds.size === 0) {
      rows.forEach(r => {
        if (r && r.id) swMonitorConfig.knownIds.add(String(r.id));
      });
      await saveConfigToIdb(swMonitorConfig);
      return;
    }

    // Revisar si la App está visible en primer plano
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasVisibleClient = clientList.some(c => c.visibilityState === 'visible');

    let changed = false;
    const ordered = [...rows].reverse();

    for (const item of ordered) {
      if (!item || !item.id) continue;
      const idStr = String(item.id);

      if (!swMonitorConfig.knownIds.has(idStr)) {
        swMonitorConfig.knownIds.add(idStr);
        changed = true;

        const createdTime = item.created_at ? new Date(item.created_at).getTime() : Date.now();
        const isFresh = (Date.now() - createdTime) < 30 * 60 * 1000;

        // Si la App está en segundo plano / pantalla bloqueada / minimizada, el Service Worker
        // dispara directamente la notificación nativa de la App y actualiza el globo del ícono
        if (isFresh && !hasVisibleClient) {
          const branchName = item.zone || item.reporter_name || 'Sucursal';
          const bodyText = `Asunto: ${item.title || 'Incidencia'}\nPrioridad: ${item.priority || 'Media'}${item.description ? '\n' + String(item.description).slice(0, 90) : ''}`;

          if ('setAppBadge' in self.navigator) {
            try { self.navigator.setAppBadge(1); } catch (e) {}
          }

          await self.registration.showNotification(`🚨 Nuevo Ticket: ${branchName}`, {
            body: bodyText,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'ticket-' + idStr,
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 120, 300, 120, 400],
            actions: [
              { action: 'open', title: 'Ver Incidencia' }
            ],
            data: { url: '/admin/tickets', ticketId: idStr }
          });
        }

        // Avisar también a cualquier ventana abierta de la App
        clientList.forEach(client => {
          client.postMessage({
            type: 'SW_NEW_TICKET_DETECTED',
            ticket: item
          });
        });
      }
    }

    if (changed) {
      await saveConfigToIdb(swMonitorConfig);
    }
  } catch (err) {}
}

function startSwBackgroundMonitor() {
  if (swPollTimer) clearInterval(swPollTimer);
  swPollTimer = setInterval(() => {
    checkSupabaseInBackground();
  }, 5000);
}

// ============================================================================
// Comunicación entre la App instalada y el Service Worker
// ============================================================================
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  // 1. Mostrar notificación nativa de la App (invocado desde notifications.js)
  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = data.payload || {};
    if (!title) return;

    if (options?.ticketId) {
      swMonitorConfig.knownIds.add(String(options.ticketId));
      saveConfigToIdb(swMonitorConfig);
    }

    if ('setAppBadge' in self.navigator) {
      try { self.navigator.setAppBadge(1); } catch (e) {}
    }

    event.waitUntil(
      self.registration.showNotification(title, {
        body: options?.body || '',
        icon: options?.icon || '/icon-192.png',
        badge: options?.badge || '/icon-192.png',
        tag: options?.tag || 'vigilancia-ticket-' + Date.now(),
        renotify: true,
        requireInteraction: options?.requireInteraction !== undefined ? options.requireInteraction : true,
        vibrate: options?.vibrate || [300, 120, 300, 120, 400],
        actions: [
          { action: 'open', title: 'Abrir App' }
        ],
        data: options?.data || { url: '/admin/tickets' }
      })
    );
    return;
  }

  // 2. Sincronizar configuración y credenciales de monitoreo con el Service Worker de la App
  if (data.type === 'SYNC_SW_MONITOR') {
    const p = data.payload || {};
    if (p.supabaseUrl) swMonitorConfig.supabaseUrl = p.supabaseUrl;
    if (p.supabaseKey) swMonitorConfig.supabaseKey = p.supabaseKey;
    if (p.username !== undefined) swMonitorConfig.username = p.username;
    if (p.enabled !== undefined) swMonitorConfig.enabled = Boolean(p.enabled);
    if (Array.isArray(p.knownIds)) {
      p.knownIds.forEach(id => {
        if (id) swMonitorConfig.knownIds.add(String(id));
      });
    }
    saveConfigToIdb(swMonitorConfig);
    startSwBackgroundMonitor();
    return;
  }

  // 3. Limpiar badge del ícono de la App cuando el administrador revisa los tickets
  if (data.type === 'CLEAR_APP_BADGE') {
    if ('clearAppBadge' in self.navigator) {
      try { self.navigator.clearAppBadge(); } catch (e) {}
    }
    return;
  }

  // 4. Forzar revisión inmediata al cambiar visibilidad
  if (data.type === 'CHECK_NOW') {
    event.waitUntil(checkSupabaseInBackground());
  }
});

// Soporte para Periodic Background Sync y Background Sync en PWAs instaladas (Android Chrome/Edge)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'vigilancia-ticket-sync') {
    event.waitUntil(checkSupabaseInBackground());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'vigilancia-ticket-sync') {
    event.waitUntil(checkSupabaseInBackground());
  }
});

// Soporte para Web Push nativo
self.addEventListener('push', (event) => {
  let payload = {
    title: '🚨 Nuevo Ticket - Vigilancia Digital',
    body: 'Se ha registrado una nueva incidencia en el sistema.',
    url: '/admin/tickets'
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'push-ticket-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 120, 300, 120, 400],
      actions: [{ action: 'open', title: 'Ver Incidencia' }],
      data: { url: payload.url || '/admin/tickets' }
    })
  );
});

// Al tocar la notificación en el teléfono (App instalada o navegador), abrir o enfocar la App en /admin/tickets
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if ('clearAppBadge' in self.navigator) {
    try { self.navigator.clearAppBadge(); } catch (e) {}
  }

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
