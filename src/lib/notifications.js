import { playNotificationSound } from './notificationAudio.js';

/**
 * Usuarios administradores con permiso exclusivo de recibir
 * alertas acústicas, móviles y de escritorio por creación de tickets.
 */
export const NOTIFICATION_USERS = ['johnny', 'johryan'];

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
 * Guarda la configuración de notificaciones del usuario
 */
export function saveNotificationSettings(username, settings) {
  const user = (username || getActiveUser() || '').toString().toLowerCase().trim();
  if (typeof window === 'undefined' || !user) return;
  try {
    localStorage.setItem(SETTINGS_KEY_PREFIX + user, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('vigilancia:notif_settings_changed', {
      detail: { username: user, settings }
    }));
  } catch (e) {
    console.error('Error al guardar configuración de notificaciones:', e);
  }
}

/**
 * Consulta el estado actual de los permisos del navegador / teléfono
 */
export function getBrowserPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Asegura que el Service Worker esté activo para poder mostrar notificaciones en Android / iOS PWA
 */
export async function ensureServiceWorkerRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    return reg;
  } catch (e) {
    console.warn('No se pudo obtener ServiceWorkerRegistration:', e);
    return null;
  }
}

/**
 * Solicita autorización de notificaciones al navegador / teléfono
 */
export async function requestBrowserPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    await ensureServiceWorkerRegistration();
    // Compatibilidad con promesa y callback antiguo (Safari/iOS)
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
    return result;
  } catch (err) {
    return Notification.permission || 'default';
  }
}

/**
 * Emite una notificación del sistema compatible tanto con teléfonos móviles
 * (vía ServiceWorkerRegistration.showNotification, obligatorio en Android/iOS)
 * como con computadoras de escritorio (fallback a new Notification).
 */
export async function showSystemNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const notifOptions = {
    body: options.body || '',
    icon: options.icon || '/logo.jpg',
    badge: options.badge || '/logo.jpg',
    tag: options.tag || 'ticket-' + Date.now(),
    renotify: true,
    requireInteraction: options.requireInteraction !== undefined ? options.requireInteraction : true,
    vibrate: options.vibrate || [300, 120, 300, 120, 400],
    data: options.data || { url: '/admin/tickets' }
  };

  // 1. Intentar vía Service Worker (Requerido por Chrome Android, Samsung Internet e iOS PWA)
  try {
    const reg = await ensureServiceWorkerRegistration();
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(title, notifOptions);
      return true;
    }
  } catch (swErr) {
    console.warn('Fallo en reg.showNotification, intentando fallback directo:', swErr);
  }

  // 2. Fallback directo para navegadores de escritorio
  try {
    const notif = new Notification(title, notifOptions);
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
    // Limpiar caché luego de 30 minutos
    setTimeout(() => recentAlertedTicketIds.delete(ticketKey), 30 * 60 * 1000);
  }

  const settings = getNotificationSettings(targetUser);
  if (!settings.enabled) {
    return false;
  }

  console.log('🚨 DISPARANDO ALERTA DE NUEVO TICKET PARA:', targetUser, ticket);

  // 1. Alerta Acústica
  if (settings.sound) {
    try {
      playNotificationSound();
    } catch (e) {
      console.warn('Fallo al reproducir audio de alerta:', e);
    }
  }

  // 2. Vibración háptica en móviles
  if (settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([300, 120, 300, 120, 400]);
    } catch (e) {}
  }

  // 3. Notificación nativa en el teléfono / escritorio
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
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      tag: 'ticket-' + (ticket.db_id || ticket.id || Date.now()),
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
 * Prueba inmediata de audio y notificación en teléfono/escritorio para verificar que todo funciona
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

    // Si aún no tiene permiso en el teléfono/navegador, solicitarlo automáticamente al probar
    let perm = getBrowserPermission();
    if (perm === 'default') {
      perm = await requestBrowserPermission();
    }

    let notificationSent = false;
    if (perm === 'granted') {
      notificationSent = await showSystemNotification('🚨 Nuevo Ticket de Prueba - Vigilancia Digital', {
        body: `¡Hola ${targetUser}! Así te llegarán al teléfono los avisos cada vez que una sucursal cree un ticket.`,
        icon: '/logo.jpg',
        badge: '/logo.jpg',
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
