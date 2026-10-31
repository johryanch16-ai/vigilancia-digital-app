import { playNotificationSound } from './notificationAudio.js';

/**
 * Usuarios administradores con permiso exclusivo de recibir
 * alertas acústicas y de escritorio por creación de tickets.
 */
export const NOTIFICATION_USERS = ['johnny', 'johryan'];

/**
 * Verifica si un usuario está autorizado para recibir alertas de tickets
 */
export function isNotificationUser(username) {
  if (!username) return false;
  const clean = username.toString().toLowerCase().trim();
  return NOTIFICATION_USERS.includes(clean);
}

const SETTINGS_KEY_PREFIX = 'vigilancia_notif_config_';

/**
 * Obtiene la configuración de notificaciones para el usuario especificado.
 */
export function getNotificationSettings(username) {
  const userKey = (username || '').toString().toLowerCase().trim();
  const isAuth = isNotificationUser(userKey);

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
    const raw = localStorage.getItem(SETTINGS_KEY_PREFIX + userKey);
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
  const userKey = (username || '').toString().toLowerCase().trim();
  if (typeof window === 'undefined' || !userKey) return;
  try {
    localStorage.setItem(SETTINGS_KEY_PREFIX + userKey, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('vigilancia:notif_settings_changed', {
      detail: { username: userKey, settings }
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

/**
 * Dispara la alerta completa cuando se crea un nuevo ticket.
 * Solo se ejecuta si el usuario actual es Johnny o Johryan y tiene activada la opción.
 */
export function triggerTicketAlert(ticket, currentUser) {
  if (!isNotificationUser(currentUser)) {
    return false;
  }

  const settings = getNotificationSettings(currentUser);
  if (!settings.enabled) {
    return false;
  }

  // 1. Alerta Acústica
  if (settings.sound) {
    try {
      playNotificationSound();
    } catch (e) {
      console.warn('No se pudo reproducir audio:', e);
    }
  }

  // 2. Vibración háptica en móviles
  if (settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch (e) {}
  }

  // 3. Notificación nativa de escritorio del sistema operativo / navegador
  if (settings.desktop && getBrowserPermission() === 'granted') {
    try {
      const branchName = ticket.zone || ticket.branch || ticket.user || ticket.reporter_name || 'Sucursal';
      const notif = new Notification('🚨 Nuevo Ticket: ' + branchName, {
        body: 'Asunto: ' + (ticket.title || 'Incidencia') + '\nPrioridad: ' + (ticket.priority || 'Media'),
        icon: '/logo.svg',
        tag: 'ticket-' + (ticket.id || Date.now()),
        renotify: true
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch (e) {}
      };
    } catch (e) {
      console.warn('Error al emitir notificación de escritorio:', e);
    }
  }

  return true;
}

/**
 * Prueba inmediata de audio y notificación para verificar que todo funciona
 */
export async function testNotification(currentUser) {
  if (!isNotificationUser(currentUser)) {
    return { success: false, reason: 'unauthorized' };
  }

  try {
    playNotificationSound();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch (e) {}
    }

    if (getBrowserPermission() === 'granted') {
      try {
        new Notification('🚨 Alerta de Prueba - Vigilancia Digital', {
          body: '¡Hola ' + currentUser + '! Tu sistema de alertas para nuevos tickets está funcionando al 100%.',
          icon: '/logo.svg',
          tag: 'test-notification'
        });
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error('Error en testNotification:', err);
    return { success: false, error: err };
  }
}
