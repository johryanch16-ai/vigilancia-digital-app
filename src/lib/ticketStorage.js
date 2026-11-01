import { supabase } from './supabase.js';

const STORAGE_KEY = 'vigilancia_local_tickets';
const CHANNEL_NAME = 'vigilancia_tickets_broadcast';

// Canal de difusión entre pestañas y ventanas del mismo navegador
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

function getTicketSignature(t) {
  const title = (t.title || '').trim().toLowerCase();
  const desc = (t.description || '').trim().toLowerCase();
  const rep = (t.reporter_name || t.user || t.zone || t.branch || '').trim().toLowerCase();
  return `${title}||${desc}||${rep}`;
}

function getTicketTimestamp(t) {
  const raw = t?.created_at || t?.rawDate;
  if (!raw) return 0;
  const ts = new Date(raw).getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * Desduplica tickets combinando locales y remotos de Supabase sin perder
 * tickets legítimos creados en distintos momentos aunque tengan el mismo asunto.
 */
export function deduplicateTickets(tickets) {
  if (!Array.isArray(tickets)) return [];
  const seenDbIds = new Set();
  const seenLocalIds = new Set();
  const result = [];

  for (const t of tickets) {
    if (!t) continue;
    const dbId = t.db_id || (isUuid(t.id) ? t.id : null);
    const localId = t.id ? String(t.id) : null;

    if (dbId && seenDbIds.has(dbId)) {
      continue;
    }
    if (localId && seenLocalIds.has(localId)) {
      continue;
    }

    // Verificar si ya existe en result un ticket local/remoto equivalente creado en los mismos 3 minutos
    const sig = getTicketSignature(t);
    const ts = getTicketTimestamp(t);

    const existingIdx = result.findIndex(existing => {
      const exDbId = existing.db_id || (isUuid(existing.id) ? existing.id : null);
      if (dbId && exDbId && dbId !== exDbId) {
        // Ambos tienen distinto ID en base de datos -> son dos tickets distintos (nunca fusionar)
        return false;
      }
      if (getTicketSignature(existing) !== sig) {
        return false;
      }
      const exTs = getTicketTimestamp(existing);
      if (ts > 0 && exTs > 0) {
        return Math.abs(ts - exTs) < 3 * 60 * 1000; // Ventana de 3 minutos para unir local + remoto
      }
      return !dbId || !exDbId;
    });

    if (existingIdx !== -1) {
      const existing = result[existingIdx];
      // Conservar la versión más completa (con db_id, imagen y código local si existen)
      const merged = {
        ...existing,
        ...t,
        id: existing.id && !isUuid(existing.id) ? existing.id : (t.id || existing.id),
        displayId: existing.displayId && !isUuid(existing.displayId) ? existing.displayId : (t.displayId || existing.displayId),
        db_id: dbId || existing.db_id || (isUuid(existing.id) ? existing.id : null),
        image: existing.image || t.image || null,
        image_name: existing.image_name || t.image_name || null,
        category: (existing.category && existing.category !== 'General') ? existing.category : (t.category || 'General'),
        zone: (existing.zone && existing.zone !== 'Sucursal') ? existing.zone : (t.zone || t.reporter_name || existing.reporter_name || 'Sucursal'),
        user: existing.user || t.user || t.reporter_name || 'Sucursal',
        reporter_name: existing.reporter_name || t.reporter_name || existing.user || 'Sucursal'
      };
      result[existingIdx] = merged;
      if (merged.db_id) seenDbIds.add(merged.db_id);
      if (merged.id) seenLocalIds.add(String(merged.id));
      continue;
    }

    const normalized = {
      ...t,
      db_id: dbId || t.db_id || null,
      zone: t.zone || t.branch || t.reporter_name || t.user || 'Sucursal',
      user: t.user || t.reporter_name || t.zone || t.branch || 'Sucursal',
      reporter_name: t.reporter_name || t.user || t.zone || t.branch || 'Sucursal',
      category: t.category || 'General'
    };

    if (normalized.db_id) seenDbIds.add(normalized.db_id);
    if (normalized.id) seenLocalIds.add(String(normalized.id));
    result.push(normalized);
  }

  // Ordenar del más reciente al más antiguo
  result.sort((a, b) => getTicketTimestamp(b) - getTicketTimestamp(a));
  return result;
}

export function getLocalTickets() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return deduplicateTickets(parsed);
  } catch (e) {
    return [];
  }
}

export function saveLocalTicket(ticket) {
  if (typeof window === 'undefined' || !ticket) return;
  try {
    const existing = getLocalTickets();
    const updated = deduplicateTickets([ticket, ...existing]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Obtiene y combina todos los tickets (locales + Supabase) asegurando que
 * ningún ticket creado por cualquier sucursal quede fuera.
 */
export async function fetchAllTicketsFromAllSources() {
  const local = getLocalTickets();
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, zones(name), categories(name), equipos(name)')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const mappedRemote = data.map(t => ({
        id: t.id ? t.id.toString() : 'TKT-' + Math.random().toString(36).substring(2, 6),
        displayId: (t.id || '').toString().substring(0, 8).toUpperCase(),
        db_id: t.id,
        title: t.title || 'Incidencia',
        description: t.description || '',
        status: t.status || 'Abierto',
        priority: t.priority || 'Media',
        zone: t.zones?.name || t.zone || t.reporter_name || 'Sucursal',
        branch: t.reporter_name || t.zones?.name || t.zone || 'Sucursal',
        category: t.categories?.name || t.category || 'General',
        equipo: t.equipos?.name || 'Ninguno',
        user: t.reporter_name || 'Sucursal',
        reporter_name: t.reporter_name || 'Sucursal',
        image: t.image || null,
        date: new Date(t.created_at || Date.now()).toLocaleString(),
        rawDate: t.created_at,
        created_at: t.created_at,
        inDatabase: true
      }));

      const combined = deduplicateTickets([...local, ...mappedRemote]);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      } catch (e) {}
      return combined;
    }
  } catch (err) {
    console.warn('Error al consultar Supabase en fetchAllTicketsFromAllSources:', err);
  }
  return local;
}

export function updateLocalTicketStatus(id, newStatus) {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getLocalTickets();
    let updatedTicket = null;
    const updated = existing.map(t => {
      if (t.id === id || t.db_id === id) {
        updatedTicket = { 
          ...t, 
          status: newStatus, 
          resolved_at: newStatus === 'Resuelto' ? new Date().toISOString() : t.resolved_at 
        };
        return updatedTicket;
      }
      return t;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    const targetDbId = updatedTicket?.db_id || (isUuid(id) ? id : null);

    if (channel && updatedTicket) {
      channel.postMessage({ type: 'STATUS_CHANGED', id: updatedTicket.id, db_id: targetDbId, status: newStatus, ticket: updatedTicket });
    }

    notifySubscribersStatusChange(updatedTicket?.id || id, newStatus, updatedTicket);

    // Actualizar también en Supabase usando el UUID real (db_id)
    if (targetDbId) {
      try {
        supabase.from('tickets').update({ status: newStatus }).eq('id', targetDbId).then(() => {}).catch(() => {});
      } catch(e) {}
    }

    return updatedTicket;
  } catch (e) {
    return null;
  }
}

// Edición completa de datos de ticket por el administrador
export function updateTicketData(id, fields) {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getLocalTickets();
    let updatedTicket = null;
    const updated = existing.map(t => {
      if (t.id === id || t.db_id === id) {
        updatedTicket = {
          ...t,
          ...fields,
          zone: fields.zone || t.zone,
          reporter_name: fields.zone || fields.reporter_name || t.reporter_name
        };
        return updatedTicket;
      }
      return t;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const targetDbId = updatedTicket?.db_id || (isUuid(id) ? id : null);

    if (channel && updatedTicket) {
      channel.postMessage({ type: 'TICKET_UPDATED', id: updatedTicket.id, ticket: updatedTicket });
    }

    notifySubscribersTicketUpdated(updatedTicket);
    if (fields.status && updatedTicket) {
      notifySubscribersStatusChange(updatedTicket.id, fields.status, updatedTicket);
    }

    if (targetDbId) {
      try {
        const updatePayload = {};
        if (fields.title !== undefined) updatePayload.title = fields.title;
        if (fields.description !== undefined) updatePayload.description = fields.description;
        if (fields.priority !== undefined) updatePayload.priority = fields.priority;
        if (fields.status !== undefined) updatePayload.status = fields.status;
        if (fields.zone !== undefined) updatePayload.reporter_name = fields.zone;

        supabase.from('tickets').update(updatePayload).eq('id', targetDbId).then(() => {}).catch(() => {});
      } catch(e) {}
    }

    return updatedTicket;
  } catch (e) {
    return null;
  }
}

export function deleteLocalTicket(id) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const target = existing.find(t => t.id === id || t.db_id === id);
    const targetDbId = target?.db_id || (isUuid(id) ? id : null);

    const updated = existing.filter(t => t.id !== id && t.db_id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (channel) {
      channel.postMessage({ type: 'TICKET_DELETED', id });
    }
    notifySubscribersTicketUpdated({ id, db_id: targetDbId, _deleted: true });

    if (targetDbId) {
      try {
        supabase.from('tickets').delete().eq('id', targetDbId).then(() => {}).catch(() => {});
      } catch(e) {}
    }
  } catch (e) {}
}

// Generador de Consecutivo Profesional (Ej: INC-2026-0001, INC-2026-0002...)
export function getNextTicketNumber() {
  const year = new Date().getFullYear();
  let maxNum = 0;

  if (typeof window !== 'undefined') {
    const existing = getLocalTickets();
    existing.forEach(t => {
      if (t.id) {
        const match = String(t.id).match(/INC-(\d{4})-(\d+)/);
        if (match && parseInt(match[1], 10) === year) {
          const num = parseInt(match[2], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const storedSeq = parseInt(localStorage.getItem('vigilancia_ticket_seq') || '0', 10);
    const nextNum = Math.max(maxNum, storedSeq) + 1;
    localStorage.setItem('vigilancia_ticket_seq', nextNum.toString());
    const padded = String(nextNum).padStart(4, '0');
    return `INC-${year}-${padded}`;
  }

  return `INC-${year}-0001`;
}

export async function createTicket({ title, description, priority, branch, category, reporterName, image, imageName }) {
  const cleanTitle = (title || '').trim();
  const cleanDesc = (description || '').trim();
  const cleanReporter = (reporterName || branch || 'Sucursal').trim();

  // 1. Evitar únicamente doble clic accidental en ventana de 10 segundos
  const existingLocal = getLocalTickets();
  const tenSecondsAgo = Date.now() - 10 * 1000;
  const recentDuplicate = existingLocal.find(t => 
    (t.title || '').trim().toLowerCase() === cleanTitle.toLowerCase() &&
    (t.description || '').trim().toLowerCase() === cleanDesc.toLowerCase() &&
    (t.reporter_name || t.user || '').trim().toLowerCase() === cleanReporter.toLowerCase() &&
    getTicketTimestamp(t) > tenSecondsAgo
  );

  if (recentDuplicate) {
    console.warn('Doble clic prevenido: ya se registró este ticket hace menos de 10 segundos.');
    return recentDuplicate;
  }

  const generatedId = getNextTicketNumber();
  const nowIso = new Date().toISOString();
  const displayDate = new Date().toLocaleString();

  const ticketObj = {
    id: generatedId,
    displayId: generatedId,
    title: cleanTitle,
    description: cleanDesc,
    priority: priority || 'Media',
    status: 'Abierto',
    zone: branch || cleanReporter || 'Sin especificar',
    branch: branch || cleanReporter || 'Sin especificar',
    category: category || 'General',
    user: cleanReporter,
    reporter_name: cleanReporter,
    image: image || null,
    image_name: imageName || null,
    date: displayDate,
    rawDate: nowIso,
    created_at: nowIso
  };

  // Registrar ID local para no duplicar alerta cuando regrese de Supabase
  globalKnownTicketIds.add(ticketObj.id);

  // Guardar primero en local
  saveLocalTicket(ticketObj);

  // Insertar SIEMPRE el nuevo ticket en Supabase para que llegue a todos los dispositivos y teléfonos
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        title: ticketObj.title,
        description: ticketObj.description,
        priority: ticketObj.priority,
        status: 'Abierto',
        reporter_name: ticketObj.reporter_name
      }])
      .select();

    if (!error && data && data[0]) {
      ticketObj.db_id = data[0].id;
      ticketObj.inDatabase = true;
      globalKnownTicketIds.add(data[0].id);
      saveLocalTicket(ticketObj);
    } else if (error) {
      console.error('Error al insertar ticket en Supabase:', error);
    }
  } catch (err) {
    console.error('Excepción al insertar ticket en Supabase:', err);
  }

  // Difundir a otras pestañas y a todos los suscriptores activos en esta ventana
  if (channel) {
    channel.postMessage({ type: 'NEW_TICKET', ticket: ticketObj });
  }
  notifySubscribersNewTicket(ticketObj);

  return ticketObj;
}

// Sincronización automática de tickets locales creados mientras no había conexión
export async function syncPendingLocalTickets() {
  if (typeof window === 'undefined') return;
  try {
    const local = getLocalTickets();
    if (!local || local.length === 0) return;

    let changed = false;
    for (const t of local) {
      const hasValidDbId = t.db_id || isUuid(t.id);
      if (!hasValidDbId) {
        try {
          const { data, error } = await supabase
            .from('tickets')
            .insert([{
              title: t.title,
              description: t.description,
              priority: t.priority || 'Media',
              status: t.status || 'Abierto',
              reporter_name: t.reporter_name || t.user || t.zone || 'Sucursal'
            }])
            .select();

          if (!error && data && data[0]) {
            t.db_id = data[0].id;
            t.inDatabase = true;
            globalKnownTicketIds.add(data[0].id);
            changed = true;
          }
        } catch (err) {}
      }
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicateTickets(local)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vigilancia:tickets_synced', { detail: { count: local.length } }));
      }
    }
  } catch (e) {}
}

// ============================================================================
// MOTOR CENTRALIZADO DE SUSCRIPCIÓN EN TIEMPO REAL (SINGLETON MULTICAST)
// Garantiza que TODOS los componentes suscritos (AdminLayout, AdminDashboard,
// AdminBranchTickets, AdminBitacora, AppClient) reciban cada evento sin que
// un componente bloquee a otro.
// ============================================================================

const globalKnownTicketIds = new Set();
const globalKnownTicketStatuses = new Map();
let isEngineStarted = false;
let isGlobalKnownInitialized = false;
let initPromise = null;
const activeSubscribers = new Set();

function notifySubscribersNewTicket(ticket) {
  if (!ticket) return;
  if (ticket.id) globalKnownTicketIds.add(String(ticket.id));
  if (ticket.db_id) globalKnownTicketIds.add(String(ticket.db_id));

  activeSubscribers.forEach(sub => {
    if (typeof sub.onNewTicket === 'function') {
      try {
        sub.onNewTicket(ticket);
      } catch (e) {
        console.error('Error en suscriptor onNewTicket:', e);
      }
    }
  });
}

function notifySubscribersStatusChange(id, status, ticket) {
  if (id) globalKnownTicketStatuses.set(String(id), status);
  if (ticket?.db_id) globalKnownTicketStatuses.set(String(ticket.db_id), status);

  activeSubscribers.forEach(sub => {
    if (typeof sub.onStatusChange === 'function') {
      try {
        sub.onStatusChange(id, status, ticket);
      } catch (e) {
        console.error('Error en suscriptor onStatusChange:', e);
      }
    }
  });
}

function notifySubscribersTicketUpdated(ticket) {
  activeSubscribers.forEach(sub => {
    if (typeof sub.onTicketUpdated === 'function') {
      try {
        sub.onTicketUpdated(ticket);
      } catch (e) {
        console.error('Error en suscriptor onTicketUpdated:', e);
      }
    }
  });
}

async function initGlobalKnownIds() {
  if (isGlobalKnownInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const local = getLocalTickets();
      local.forEach(t => {
        if (t.id) globalKnownTicketIds.add(String(t.id));
        if (t.db_id) globalKnownTicketIds.add(String(t.db_id));
        if (t.id && t.status) globalKnownTicketStatuses.set(String(t.id), t.status);
        if (t.db_id && t.status) globalKnownTicketStatuses.set(String(t.db_id), t.status);
      });

      const { data } = await supabase
        .from('tickets')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && Array.isArray(data)) {
        data.forEach(t => {
          if (t.id) {
            globalKnownTicketIds.add(String(t.id));
            globalKnownTicketStatuses.set(String(t.id), t.status || 'Abierto');
          }
        });
      }
    } catch (e) {}
    isGlobalKnownInitialized = true;
  })();

  return initPromise;
}

function mapSupabaseRowToTicket(item) {
  return {
    id: item.id ? item.id.toString() : getNextTicketNumber(),
    displayId: (item.id || '').toString().substring(0, 8).toUpperCase(),
    db_id: item.id,
    title: item.title || item.subject || 'Incidencia',
    description: item.description || '',
    priority: item.priority || 'Media',
    status: item.status || 'Abierto',
    zone: item.zone || item.reporter_name || 'Sucursal',
    branch: item.reporter_name || item.zone || 'Sucursal',
    category: item.category || 'General',
    user: item.reporter_name || item.client_name || 'Sucursal',
    reporter_name: item.reporter_name || 'Sucursal',
    image: item.image || null,
    date: new Date(item.created_at || Date.now()).toLocaleString(),
    rawDate: item.created_at || new Date().toISOString(),
    created_at: item.created_at || new Date().toISOString(),
    inDatabase: true
  };
}

async function pollSupabaseTickets() {
  if (activeSubscribers.size === 0) return;
  try {
    await initGlobalKnownIds();

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !Array.isArray(data)) return;

    // Procesar de más antiguo a más reciente entre los nuevos para mantener el orden
    const reversed = [...data].reverse();
    for (const item of reversed) {
      if (!item || !item.id) continue;
      const itemIdStr = String(item.id);

      if (!globalKnownTicketIds.has(itemIdStr)) {
        globalKnownTicketIds.add(itemIdStr);
        globalKnownTicketStatuses.set(itemIdStr, item.status || 'Abierto');

        const remoteTicket = mapSupabaseRowToTicket(item);
        saveLocalTicket(remoteTicket);

        console.log('📡 Nuevo ticket detectado desde Supabase:', remoteTicket.title, '| Sucursal:', remoteTicket.reporter_name);
        notifySubscribersNewTicket(remoteTicket);
      } else {
        // Verificar si cambió el estado en Supabase
        const prevStatus = globalKnownTicketStatuses.get(itemIdStr);
        if (prevStatus && item.status && prevStatus !== item.status) {
          globalKnownTicketStatuses.set(itemIdStr, item.status);
          const remoteTicket = mapSupabaseRowToTicket(item);
          saveLocalTicket(remoteTicket);
          notifySubscribersStatusChange(itemIdStr, item.status, remoteTicket);
        }
      }
    }
  } catch (err) {}
}

function startCentralEngineIfNeeded() {
  if (isEngineStarted || typeof window === 'undefined') return;
  isEngineStarted = true;

  initGlobalKnownIds();

  // 1. BroadcastChannel entre pestañas
  if (channel) {
    channel.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'NEW_TICKET' && msg.ticket) {
        const t = msg.ticket;
        const idStr = String(t.db_id || t.id || '');
        if (idStr && globalKnownTicketIds.has(idStr)) return;
        saveLocalTicket(t);
        notifySubscribersNewTicket(t);
      } else if (msg.type === 'STATUS_CHANGED') {
        notifySubscribersStatusChange(msg.id, msg.status, msg.ticket);
      } else if (msg.type === 'TICKET_UPDATED' && msg.ticket) {
        notifySubscribersTicketUpdated(msg.ticket);
      } else if (msg.type === 'TICKET_DELETED') {
        notifySubscribersTicketUpdated({ id: msg.id, _deleted: true });
      }
    });
  }

  // 2. Storage Event (respaldo entre pestañas)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const tickets = JSON.parse(e.newValue);
        if (Array.isArray(tickets) && tickets.length > 0) {
          const newest = tickets[0];
          const key = String(newest.db_id || newest.id || '');
          if (key && !globalKnownTicketIds.has(key)) {
            notifySubscribersNewTicket(newest);
          }
        }
      } catch (err) {}
    }
  });

  // 3. Supabase Realtime (postgres_changes)
  try {
    supabase.channel('realtime:vigilancia_global_tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, async (payload) => {
        await initGlobalKnownIds();
        const p = payload?.new;
        if (!p || !p.id) return;
        const idStr = String(p.id);
        if (globalKnownTicketIds.has(idStr)) return;

        const remoteTicket = mapSupabaseRowToTicket(p);
        saveLocalTicket(remoteTicket);
        notifySubscribersNewTicket(remoteTicket);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => {
        const p = payload?.new;
        if (!p || !p.id) return;
        const idStr = String(p.id);
        globalKnownTicketStatuses.set(idStr, p.status || 'Abierto');
        const remoteTicket = mapSupabaseRowToTicket(p);
        saveLocalTicket(remoteTicket);
        notifySubscribersStatusChange(idStr, p.status, remoteTicket);
      })
      .subscribe();
  } catch (err) {}

  // 4. Polling constante cada 3 segundos (garantiza recepción en celulares y redes con firewall)
  setInterval(() => {
    pollSupabaseTickets();
  }, 3000);

  // 5. Al desbloquear el teléfono o volver a la pestaña, consultar de inmediato
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pollSupabaseTickets();
    }
  });
  window.addEventListener('focus', () => {
    pollSupabaseTickets();
  });
}

export function subscribeToTickets(onNewTicket, onStatusChange, onTicketUpdated) {
  startCentralEngineIfNeeded();

  const subscriber = { onNewTicket, onStatusChange, onTicketUpdated };
  activeSubscribers.add(subscriber);

  return () => {
    activeSubscribers.delete(subscriber);
  };
}

// Reenviar un ticket específico a Supabase y disparar aviso a los administradores
export async function resendTicketToSupabase(ticketId) {
  try {
    const local = getLocalTickets();
    let ticket = local.find(t => t.id === ticketId || t.db_id === ticketId);

    if (!ticket && isUuid(ticketId)) {
      try {
        const { data } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
        if (data) {
          ticket = mapSupabaseRowToTicket(data);
        }
      } catch (e) {}
    }

    if (!ticket) return { success: false, message: 'Ticket no encontrado' };

    const repName = ticket.reporter_name || ticket.user || ticket.zone || ticket.branch || 'Sucursal';
    const existingDbId = ticket.db_id || (isUuid(ticket.id) ? ticket.id : null);

    if (existingDbId) {
      // Verificar que realmente siga existiendo en Supabase
      const { data: verifyRow } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', existingDbId)
        .maybeSingle();

      if (verifyRow?.id) {
        await supabase
          .from('tickets')
          .update({ status: ticket.status || 'Abierto' })
          .eq('id', existingDbId);

        ticket.db_id = existingDbId;
        ticket.inDatabase = true;
        ticket.last_resend = new Date().toISOString();
        saveLocalTicket(ticket);

        if (channel) channel.postMessage({ type: 'NEW_TICKET', ticket });
        notifySubscribersNewTicket(ticket);
        return { success: true, db_id: existingDbId, alreadyExisted: true };
      }
    }

    // Insertar en Supabase
    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority || 'Media',
        status: ticket.status || 'Abierto',
        reporter_name: repName
      }])
      .select();

    if (error) {
      return { success: false, message: error.message };
    }

    if (data && data[0]) {
      ticket.db_id = data[0].id;
      ticket.inDatabase = true;
      ticket.last_resend = new Date().toISOString();
      globalKnownTicketIds.add(String(data[0].id));
      saveLocalTicket(ticket);

      if (channel) channel.postMessage({ type: 'NEW_TICKET', ticket });
      notifySubscribersNewTicket(ticket);
      return { success: true, db_id: data[0].id };
    }

    return { success: false, message: 'Sin respuesta de base de datos' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Reenviar todos los tickets pendientes a Supabase
export async function resendAllPendingTickets(branchFilter = null) {
  try {
    const local = getLocalTickets();
    const toResend = branchFilter && branchFilter !== 'all' && !['administración', 'johryan', 'johnny'].includes(branchFilter.toLowerCase())
      ? local.filter(t => 
          (t.zone && t.zone.toLowerCase().includes(branchFilter.toLowerCase())) || 
          (t.user && t.user.toLowerCase().includes(branchFilter.toLowerCase())) || 
          (t.reporter_name && t.reporter_name.toLowerCase().includes(branchFilter.toLowerCase())) ||
          (t.branch && t.branch.toLowerCase().includes(branchFilter.toLowerCase())))
      : local;

    if (toResend.length === 0) return { count: 0, success: true };

    let count = 0;
    for (const t of toResend) {
      const res = await resendTicketToSupabase(t.id);
      if (res.success) count++;
    }

    return { count, success: true };
  } catch (err) {
    return { count: 0, success: false, error: err.message };
  }
}
