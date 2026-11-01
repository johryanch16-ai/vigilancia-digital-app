import { playNotificationSound } from './notificationAudio.js';

/**
 * Usuarios administradores con permiso exclusivo de recibir
 * alertas acústicas, móviles, de App instalada (PWA) y de escritorio por creación de tickets.
 */
export const NOTIFICATION_USERS = ['johnny', 'johryan'];

// Captura global del evento de instalación PWA (Android Chrome / Edge / Desktop)
let deferredInstallPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('vigilancia:pwa_install_available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('vigilancia:pwa_installed'));
  });
}

/**
 * Detecta si la aplicación se está ejecutando instalada como App (PWA standalone / WebAPK / iOS Home Screen)
 */
export function isRunningAsInstalledApp() {
  if (typeof window === 'undefined') return false;
  const isStandaloneDisplay = window.matchMedia && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches
  );
  const isIosStandalone = window.navigator?.standalone === true;
  const isAndroidTwa = typeof document !== 'undefined' && document.referrer.includes('android-app://');
  return Boolean(isStandaloneDisplay || isIosStandalone || isAndroidTwa);
}

/**
 * Detecta si es un dispositivo iOS (iPhone / iPad)
 */
export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Indica si el navegador tiene listo el prompt nativo de "Instalar App"
 */
export function canInstallPwaApp() {
  return Boolean(deferredInstallPrompt);
}

/**
 * Lanza el cuadro nativo del sistema operativo para instalar Vigilancia Digital como App
 */
export async function promptInstallPwaApp() {
  if (!deferredInstallPrompt) return { installed: false, reason: 'unavailable' };
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredInstallPrompt = null;
      return { installed: true };
    }
    return { installed: false, reason: outcome };
  } catch (err) {
    return { installed: false, error: err };
  }
}

/**
 * Obtiene el usuario activo actual desde localStorage
 */
export function getActiveUser() {
  if (typeof window === 'undefined') return '';
  const admin = localStorage.getItem('admin_user');
  if (admin && admin.trim()) return admin.trim();
  
  const clientRaw = localStorage.getItem('client_user');
  if (clientRaw) {
    try {
      const parsed = JSON.parse(clientRaw);
      if (parsed?.name) return parsed.name.trim();
      if (parsed?.branch) return parsed.branch.trim();
    } catch (e) {}
  }
  return '';
}

/**
 * Verifica si un usuario está autorizado para recibir alertas de tickets (Johnny o Johryan)
 */
export function isNotificationUser(username) {
  const candidate = (username || getActiveUser() || '').toString().toLowerCase().trim();
  if (!candidate) return false;
  return NOTIFICATION_USERS.includes(candidate);
}

const SETTINGS_KEY_PREFIX = 'vigilancia_notif_config_';

/**
 * Obtiene la configuración de notificaciones para el usuario especificado.
 */
export function getNotificationSettings(username) {
  const user = (username || getActiveUser() || '').toString().toLowerCase().trim();
  const isAuth = NOTIFICATION_USERS.includes(user);

  const defaultSettings = {
    enabled: isAuth,
    sound: isAuth,
    desktop: isAuth,
    floating: isAuth,
    vibration: isAuth
  };

  if (!isAuth) {
    return {
      enabled: false,
      sound: false,
      desktop: false,
      floating: false,
      vibration: false
    };
  }

  if (typeof window === 'undefined') return defaultSettings;

  try {
    const raw = localStorage.getItem(SETTINGS_KEY_PREFIX + user);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch (e) {
    return defaultSettings;
  }
}

/**
 * Guarda la configuración de notificaciones del usuario y sincroniza el Service Worker de la App
 */
export function saveNotificationSettings(username, settings) {
  const user = (username || getActiveUser() || '').toString().toLowerCase().trim();
  if (typeof window === 'undefined' || !user) return;
  try {
    localStorage.setItem(SETTINGS_KEY_PREFIX + user, JSON.stringify(settings));
    syncServiceWorkerMonitor(user);
    window.dispatchEvent(new CustomEvent('vigilancia:notif_settings_changed', {
      detail: { username: user, settings }
    }));
  } catch (e) {
    console.error('Error al guardar configuración de notificaciones:', e);
  }
}

/**
 * Consulta el estado actual de los permisos del navegador / App instalada
 */
export function getBrowserPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Asegura que el Service Worker esté activo y listo para la App instalada (Android WebAPK / iOS PWA / Desktop)
 */
export async function ensureServiceWorkerRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    if (navigator.serviceWorker.ready) {
      reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise(resolve => setTimeout(() => resolve(reg), 1500))
      ]);
    }
    return reg;
  } catch (e) {
    console.warn('No se pudo obtener ServiceWorkerRegistration:', e);
    return null;
  }
}

/**
 * Sincroniza credenciales, estado de alertas y tickets conocidos con el Service Worker
 * para que la App instalada siga vigilando nuevos tickets incluso en segundo plano.
 */
export async function syncServiceWorkerMonitor(username, extraKnownIds = []) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const user = (username || getActiveUser() || '').toString().toLowerCase().trim();
    const isAuth = isNotificationUser(user);
    const settings = getNotificationSettings(user);
    const permGranted = getBrowserPermission() === 'granted';

    const reg = await ensureServiceWorkerRegistration();
    const targetWorker = reg?.active || navigator.serviceWorker.controller;
    if (!targetWorker) return;

    // Recopilar IDs ya conocidos en localStorage para evitar duplicados al pasar a segundo plano
    const knownIds = new Set(extraKnownIds.filter(Boolean).map(String));
    try {
      const localRaw = localStorage.getItem('vigilancia_local_tickets');
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach(t => {
            if (t?.id) knownIds.add(String(t.id));
            if (t?.db_id) knownIds.add(String(t.db_id));
          });
        }
      }
    } catch (e) {}

    targetWorker.postMessage({
      type: 'SYNC_SW_MONITOR',
      payload: {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        username: user,
        enabled: Boolean(isAuth && settings.enabled && settings.desktop && permGranted),
        knownIds: Array.from(knownIds)
      }
    });

    // Registrar Periodic Background Sync y Background Sync si la App instalada lo soporta
    if (reg && isAuth && settings.enabled && permGranted) {
      if ('periodicSync' in reg) {
        try {
          await reg.periodicSync.register('vigilancia-ticket-sync', {
            minInterval: 60 * 1000
          });
        } catch (e) {}
      }
      if ('sync' in reg) {
        try {
          await reg.sync.register('vigilancia-ticket-sync');
        } catch (e) {}
      }
    }
  } catch (e) {}
}

/**
 * Limpia el contador numérico en el ícono de la App instalada
 */
export async function clearInstalledAppBadge() {
  if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge();
    } catch (e) {}
  }
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.active?.postMessage({ type: 'CLEAR_APP_BADGE' });
    } catch (e) {}
  }
}

/**
 * Solicita autorización de notificaciones al sistema operativo (App instalada o navegador)
 */
export async function requestBrowserPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    await ensureServiceWorkerRegistration();
    const result = await new Promise((resolve) => {
      try {
        const maybePromise = Notification.requestPermission((perm) => resolve(perm));
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(resolve).catch(() => resolve(Notification.permission || 'default'));
        }
      } catch (e) {
        resolve(Notification.permission || 'default');
      }
    });
    if (result === 'granted') {
      await syncServiceWorkerMonitor();
    }
    return result;
  } catch (err) {
    return Notification.permission || 'default';
  }
}

/**
 * Emite una notificación del sistema 100% compatible cuando se instala como App (PWA)
 * en Android (WebAPK), iOS (Home Screen App 16.4+) y Windows/Mac, así como en navegador.
 */
export async function showSystemNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  // Actualizar globo (badge) del ícono de la App instalada
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      navigator.setAppBadge(1).catch(() => {});
    } catch (e) {}
  }

  const notifOptions = {
    body: options.body || '',
    icon: options.icon || '/icon-192.png',
    badge: options.badge || '/icon-192.png',
    tag: options.tag || 'ticket-' + Date.now(),
    renotify: true,
    requireInteraction: options.requireInteraction !== undefined ? options.requireInteraction : true,
    vibrate: options.vibrate || [300, 120, 300, 120, 400],
    actions: [
      { action: 'open', title: 'Ver Incidencia' }
    ],
    data: options.data || { url: '/admin/tickets' }
  };

  // 1. Vía ServiceWorkerRegistration.showNotification (Estándar nativo obligatorio en Apps PWA instaladas)
  try {
    const reg = await ensureServiceWorkerRegistration();
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(title, notifOptions);
      if (options.ticketId && reg.active) {
        reg.active.postMessage({
          type: 'SYNC_SW_MONITOR',
          payload: { knownIds: [String(options.ticketId)] }
        });
      }
      return true;
    }
    // Respaldo por postMessage al Service Worker activo
    if (reg?.active) {
      reg.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { title, options: { ...notifOptions, ticketId: options.ticketId } }
      });
      return true;
    }
  } catch (swErr) {
    console.warn('Fallo en reg.showNotification, intentando fallback:', swErr);
  }

  // 2. Fallback directo para navegadores de escritorio sin SW
  try {
    const { actions, ...fallbackOpts } = notifOptions;
    const notif = new Notification(title, fallbackOpts);
    notif.onclick = () => {
      try {
        window.focus();
      } catch (e) {}
    };
    return true;
  } catch (err) {
    console.warn('Error al emitir notificación nativa:', err);
    return false;
  }
}

// Registro en memoria de tickets ya alertados para no repetir sonido/notificación en 30 minutos
const recentAlertedTicketIds = new Set();

/**
 * Dispara la alerta completa cuando se crea un nuevo ticket.
 * Solo se ejecuta si el usuario actual es Johnny o Johryan y tiene activada la opción.
 */
export function triggerTicketAlert(ticket, currentUser) {
  const targetUser = currentUser || getActiveUser();
  if (!isNotificationUser(targetUser)) {
    return false;
  }

  const ticketKey = ticket?.db_id || ticket?.id || (ticket?.title + '::' + ticket?.date);
  if (ticketKey && recentAlertedTicketIds.has(ticketKey)) {
    return false; // Ya alertado recientemente
  }
  if (ticketKey) {
    recentAlertedTicketIds.add(ticketKey);
    setTimeout(() => recentAlertedTicketIds.delete(ticketKey), 30 * 60 * 1000);
  }

  const settings = getNotificationSettings(targetUser);
  if (!settings.enabled) {
    return false;
  }

  console.log('🚨 DISPARANDO ALERTA DE NUEVO TICKET PARA:', targetUser, ticket);

  // Sincronizar ID con el Service Worker de la App instalada
  syncServiceWorkerMonitor(targetUser, [ticket?.db_id, ticket?.id]);

  // 1. Alerta Acústica
  if (settings.sound) {
    try {
      playNotificationSound();
    } catch (e) {
      console.warn('Fallo al reproducir audio de alerta:', e);
    }
  }

  // 2. Vibración háptica en teléfono / App instalada
  if (settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([300, 120, 300, 120, 400]);
    } catch (e) {}
  }

  // 3. Notificación nativa de la App instalada / teléfono / escritorio
  if (settings.desktop && getBrowserPermission() === 'granted') {
    const branchName = ticket.zone || ticket.branch || ticket.user || ticket.reporter_name || 'Sucursal';
    const bodyLines = [
      `Asunto: ${ticket.title || 'Nueva incidencia reportada'}`,
      `Prioridad: ${ticket.priority || 'Media'}`
    ];
    if (ticket.description) {
      bodyLines.push(ticket.description.slice(0, 90));
    }

    showSystemNotification(`🚨 Nuevo Ticket: ${branchName}`, {
      body: bodyLines.join('\n'),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'ticket-' + (ticket.db_id || ticket.id || Date.now()),
      ticketId: ticket.db_id || ticket.id,
      requireInteraction: true,
      vibrate: [300, 120, 300, 120, 400],
      data: { url: '/admin/tickets', ticketId: ticket.id }
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vigilancia:ticket_alert_triggered', { 
      detail: { ticket, user: targetUser } 
    }));
  }

  return true;
}

/**
 * Prueba inmediata de audio y notificación en App instalada / teléfono / escritorio
 */
export async function testNotification(currentUser) {
  const targetUser = currentUser || getActiveUser();
  if (!isNotificationUser(targetUser)) {
    return { success: false, reason: 'unauthorized' };
  }

  try {
    playNotificationSound();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([250, 100, 250]);
      } catch (e) {}
    }

    let perm = getBrowserPermission();
    if (perm === 'default') {
      perm = await requestBrowserPermission();
    }

    let notificationSent = false;
    if (perm === 'granted') {
      await syncServiceWorkerMonitor(targetUser);
      notificationSent = await showSystemNotification('🚨 Nuevo Ticket de Prueba - Vigilancia Digital', {
        body: `¡Hola ${targetUser}! Las notificaciones de tu App instalada están activas al 100%.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification-' + Date.now(),
        requireInteraction: false,
        vibrate: [250, 100, 250]
      });
    }

    return {
      success: true,
      permission: perm,
      notificationSent
    };
  } catch (err) {
    console.error('Error en testNotification:', err);
    return { success: false, error: err };
  }
}
