import { playNotificationSound } from './notificationAudio.js';

/**
 * Usuarios administradores con permiso exclusivo de recibir
 * alertas acústicas y de escritorio por creación de tickets.
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
 * Consulta el estado actual de los permisos del navegador
 */
export function getBrowserPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita autorización de notificaciones al navegador
 */
export async function requestBrowserPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    return Notification.permission || 'default';
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
    return false; // Ya alertado
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
      navigator.vibrate([250, 100, 250, 100, 350]);
    } catch (e) {}
  }

  // 3. Notificación nativa de escritorio del sistema operativo / navegador
  if (settings.desktop && getBrowserPermission() === 'granted') {
    try {
      const branchName = ticket.zone || ticket.branch || ticket.user || ticket.reporter_name || 'Sucursal';
      const notif = new Notification('🚨 Nuevo Ticket: ' + branchName, {
        body: 'Asunto: ' + (ticket.title || 'Incidencia') + '\nPrioridad: ' + (ticket.priority || 'Media') + '\n' + (ticket.description ? ticket.description.slice(0, 80) : ''),
        icon: '/logo.svg',
        tag: 'ticket-' + (ticket.id || Date.now()),
        renotify: true,
        requireInteraction: true
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch (e) {}
      };
    } catch (e) {
      console.warn('Error al emitir notificación nativa de escritorio:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vigilancia:ticket_alert_triggered', { 
      detail: { ticket, user: targetUser } 
    }));
  }

  return true;
}

/**
 * Prueba inmediata de audio y notificación para verificar que todo funciona
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
        navigator.vibrate([180, 80, 180]);
      } catch (e) {}
    }

    if (getBrowserPermission() === 'granted') {
      try {
        const n = new Notification('🚨 Alerta de Prueba - Vigilancia Digital', {
          body: '¡Hola ' + targetUser + '! Tu sistema de alertas para nuevos tickets está funcionando al 100%.',
          icon: '/logo.svg',
          tag: 'test-notification',
          renotify: true
        });
        n.onclick = () => {
          try { window.focus(); } catch (e) {}
        };
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error('Error en testNotification:', err);
    return { success: false, error: err };
  }
}
