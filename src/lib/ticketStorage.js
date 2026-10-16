import { supabase } from './supabase.js';

const STORAGE_KEY = 'vigilancia_local_tickets';
const CHANNEL_NAME = 'vigilancia_tickets_broadcast';

// Obtener canal de difusin entre pestaas y ventanas
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

function getTicketSignature(t) {
  const title = (t.title || '').trim().toLowerCase();
  const desc = (t.description || '').trim().toLowerCase();
  const rep = (t.reporter_name || t.user || t.zone || t.branch || '').trim().toLowerCase();
  return `${title}||${desc}||${rep}`;
}

export function deduplicateTickets(tickets) {
  if (!Array.isArray(tickets)) return [];
  const seenIds = new Set();
  const seenSigs = new Map();

  const result = [];
  for (const t of tickets) {
    if (!t) continue;
    const idKey = t.db_id || t.id;
    const sigKey = getTicketSignature(t);

    if (idKey && seenIds.has(idKey)) {
      continue;
    }

    if (seenSigs.has(sigKey)) {
      // Si ya vimos uno con la misma información, conservar el que tenga db_id
      const existing = seenSigs.get(sigKey);
      if (!existing.db_id && t.db_id) {
        // Reemplazar el que no tenía db_id con el que sí tiene
        const idx = result.indexOf(existing);
        if (idx !== -1) {
          result[idx] = t;
          seenSigs.set(sigKey, t);
        }
      }
      continue;
    }

    if (idKey) seenIds.add(idKey);
    seenSigs.set(sigKey, t);
    result.push(t);
  }
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
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const sig = getTicketSignature(ticket);
    const updated = [
      ticket,
      ...existing.filter(t => t.id !== ticket.id && (!ticket.db_id || t.db_id !== ticket.db_id) && getTicketSignature(t) !== sig)
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicateTickets(updated)));
  } catch (e) {}
}

export function updateLocalTicketStatus(id, newStatus) {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getLocalTickets();
    let updatedTicket = null;
    const updated = existing.map(t => {
      if (t.id === id) {
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
    
    if (channel && updatedTicket) {
      channel.postMessage({ type: 'STATUS_CHANGED', id, status: newStatus, ticket: updatedTicket });
    }

    if (typeof window !== 'undefined' && updatedTicket) {
      window.dispatchEvent(new CustomEvent('vigilancia:status_changed', { 
        detail: { id, status: newStatus, ticket: updatedTicket } 
      }));
    }

    // Actualizar tambin en Supabase si est disponible
    try {
      supabase.from('tickets').update({ status: newStatus }).eq('id', id).then(() => {}).catch(() => {});
    } catch(e) {}

    return updatedTicket;
  } catch (e) {
    return null;
  }
}

// Edicin completa de datos de ticket por el administrador (corregir errores de envo)
export function updateTicketData(id, fields) {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getLocalTickets();
    let updatedTicket = null;
    const updated = existing.map(t => {
      if (t.id === id) {
        updatedTicket = { ...t, ...fields };
        return updatedTicket;
      }
      return t;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (channel && updatedTicket) {
      channel.postMessage({ type: 'TICKET_UPDATED', id, ticket: updatedTicket });
    }

    if (typeof window !== 'undefined' && updatedTicket) {
      window.dispatchEvent(new CustomEvent('vigilancia:ticket_updated', {
        detail: { id, ticket: updatedTicket }
      }));
    }

    try {
      supabase.from('tickets').update({
        title: fields.title,
        description: fields.description,
        priority: fields.priority,
        status: fields.status,
      }).eq('id', id).then(() => {}).catch(() => {});
    } catch(e) {}

    return updatedTicket;
  } catch (e) {
    return null;
  }
}

export function deleteLocalTicket(id) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const updated = existing.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (channel) {
      channel.postMessage({ type: 'TICKET_DELETED', id });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vigilancia:ticket_deleted', { detail: { id } }));
    }
    try {
      supabase.from('tickets').delete().eq('id', id).then(() => {}).catch(() => {});
    } catch(e) {}
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
        const match = t.id.match(/INC-(\d{4})-(\d+)/);
        if (match && parseInt(match[1]) === year) {
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

  // 1. Evitar duplicados por doble clic o envíos seguidos idénticos (ventana de 60 segundos)
  const existingLocal = getLocalTickets();
  const oneMinuteAgo = Date.now() - 60 * 1000;
  const recentDuplicate = existingLocal.find(t => 
    t.title.trim().toLowerCase() === cleanTitle.toLowerCase() &&
    t.description.trim().toLowerCase() === cleanDesc.toLowerCase() &&
    (t.reporter_name || t.user || '').trim().toLowerCase() === cleanReporter.toLowerCase() &&
    new Date(t.created_at || t.rawDate || 0).getTime() > oneMinuteAgo
  );

  if (recentDuplicate) {
    console.warn('Ticket duplicado prevenido: ya existe un reporte idéntico creado hace instantes.');
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
    zone: branch || 'Sin especificar',
    category: category || 'General',
    user: cleanReporter,
    reporter_name: cleanReporter,
    image: image || null,
    image_name: imageName || null,
    date: displayDate,
    rawDate: nowIso,
    created_at: nowIso
  };

  // Guardar primero en local
  saveLocalTicket(ticketObj);

  if (channel) {
    channel.postMessage({ type: 'NEW_TICKET', ticket: ticketObj });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vigilancia:new_ticket', { detail: ticketObj }));
  }

  // Insertar en Supabase verificando primero que no exista uno idéntico en DB
  try {
    const { data: dbMatches } = await supabase
      .from('tickets')
      .select('id')
      .eq('title', ticketObj.title)
      .eq('reporter_name', ticketObj.reporter_name)
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbMatches && dbMatches.length > 0) {
      ticketObj.db_id = dbMatches[0].id;
      saveLocalTicket(ticketObj);
    } else {
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
        saveLocalTicket(ticketObj);
      }
    }
  } catch (err) {}

  return ticketObj;
}


// Sincronización automática de tickets locales creados mientras la base de datos estaba desconectada
export async function syncPendingLocalTickets() {
  if (typeof window === 'undefined') return;
  try {
    const local = getLocalTickets();
    if (!local || local.length === 0) return;

    let changed = false;
    for (const t of local) {
      if (!t.db_id) {
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
            changed = true;
          }
        } catch (err) {}
      }
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vigilancia:tickets_synced', { detail: { count: local.length } }));
      }
    }
  } catch (e) {}
}

export function subscribeToTickets(onNewTicket, onStatusChange, onTicketUpdated) {
  const handlers = [];

  // BroadcastChannel
  if (channel) {
    const bcHandler = (event) => {
      if (event.data?.type === 'NEW_TICKET' && onNewTicket) {
        onNewTicket(event.data.ticket);
      }
      if (event.data?.type === 'STATUS_CHANGED' && onStatusChange) {
        onStatusChange(event.data.id, event.data.status, event.data.ticket);
      }
      if (event.data?.type === 'TICKET_UPDATED' && (onTicketUpdated || onStatusChange)) {
        if (onTicketUpdated) onTicketUpdated(event.data.ticket);
        if (onStatusChange) onStatusChange(event.data.id, event.data.ticket.status, event.data.ticket);
      }
      if (event.data?.type === 'TICKET_DELETED' && onTicketUpdated) {
        if (onTicketUpdated) onTicketUpdated({ id: event.data.id, _deleted: true });
      }
    };
    channel.addEventListener('message', bcHandler);
    handlers.push(() => channel.removeEventListener('message', bcHandler));
  }

  // CustomEvents
  if (typeof window !== 'undefined') {
    const ceNewHandler = (event) => {
      if (event.detail && onNewTicket) {
        onNewTicket(event.detail);
      }
    };
    window.addEventListener('vigilancia:new_ticket', ceNewHandler);
    handlers.push(() => window.removeEventListener('vigilancia:new_ticket', ceNewHandler));

    const ceStatusHandler = (event) => {
      if (event.detail && onStatusChange) {
        onStatusChange(event.detail.id, event.detail.status, event.detail.ticket);
      }
    };
    window.addEventListener('vigilancia:status_changed', ceStatusHandler);
    handlers.push(() => window.removeEventListener('vigilancia:status_changed', ceStatusHandler));

    const ceUpdateHandler = (event) => {
      if (event.detail && onTicketUpdated) {
        onTicketUpdated(event.detail.ticket);
      }
    };
    window.addEventListener('vigilancia:ticket_updated', ceUpdateHandler);
    handlers.push(() => window.removeEventListener('vigilancia:ticket_updated', ceUpdateHandler));

    // Storage Event (otra pestaa)
    const storageHandler = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const tickets = JSON.parse(e.newValue);
          if (tickets.length > 0 && onNewTicket) {
            onNewTicket(tickets[0]);
          }
        } catch(err) {}
      }
    };
    window.addEventListener('storage', storageHandler);
    handlers.push(() => window.removeEventListener('storage', storageHandler));
  }

  // Supabase Realtime (si est en lnea)
  try {
    const subChannel = supabase.channel('realtime:tickets_shared')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => {
        if (payload?.new && onStatusChange) {
          onStatusChange(payload.new.id, payload.new.status, payload.new);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        if (payload?.new && onNewTicket) {
          const remoteTicket = {
            id: payload.new.id ? payload.new.id.toString() : getNextTicketNumber(),
            displayId: (payload.new.id || '').toString(),
            title: payload.new.title || payload.new.subject || 'Incidencia',
            description: payload.new.description || '',
            priority: payload.new.priority || 'Media',
            status: payload.new.status || 'Abierto',
            zone: payload.new.zone || 'Sucursal',
            category: payload.new.category || 'General',
            user: payload.new.reporter_name || payload.new.client_name || 'Sucursal',
            image: payload.new.image || null,
            date: new Date(payload.new.created_at || Date.now()).toLocaleString(),
            rawDate: payload.new.created_at || new Date().toISOString()
          };
          saveLocalTicket(remoteTicket);
          onNewTicket(remoteTicket);
        }
      })
      .subscribe();

    handlers.push(() => supabase.removeChannel(subChannel));
  } catch (err) {}

  return () => {
    handlers.forEach(cleanup => cleanup());
  };
}


// Reenviar un ticket específico a Supabase evitando duplicados
export async function resendTicketToSupabase(ticketId) {
  try {
    const local = getLocalTickets();
    let ticket = local.find(t => t.id === ticketId || t.db_id === ticketId);

    if (!ticket) {
      try {
        const { data } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
        if (data) {
          ticket = {
            id: data.id,
            db_id: data.id,
            title: data.title,
            description: data.description,
            priority: data.priority || 'Media',
            status: data.status || 'Abierto',
            reporter_name: data.reporter_name,
            user: data.reporter_name,
            zone: data.reporter_name,
            date: data.created_at ? new Date(data.created_at).toLocaleString() : new Date().toLocaleString()
          };
        }
      } catch (e) {}
    }

    if (!ticket) return { success: false, message: 'Ticket no encontrado' };

    // Si ya tiene db_id, YA EXISTE en Supabase: NO HACER INSERT NUEVO!
    if (ticket.db_id) {
      try {
        await supabase
          .from('tickets')
          .update({ status: ticket.status || 'Abierto' })
          .eq('id', ticket.db_id);
      } catch (err) {}

      ticket.last_resend = new Date().toISOString();
      saveLocalTicket(ticket);

      if (channel) channel.postMessage({ type: 'NEW_TICKET', ticket });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vigilancia:new_ticket', { detail: ticket }));
      }
      return { success: true, db_id: ticket.db_id, alreadyExisted: true };
    }

    // Si no tiene db_id, verificar si ya existe en Supabase antes de insertar
    const repName = ticket.reporter_name || ticket.user || ticket.zone || ticket.branch || 'Sucursal';
    const { data: existingInDb } = await supabase
      .from('tickets')
      .select('id')
      .eq('title', ticket.title)
      .eq('reporter_name', repName)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingInDb && existingInDb.length > 0) {
      ticket.db_id = existingInDb[0].id;
      ticket.last_resend = new Date().toISOString();
      saveLocalTicket(ticket);

      if (channel) channel.postMessage({ type: 'NEW_TICKET', ticket });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vigilancia:new_ticket', { detail: ticket }));
      }
      return { success: true, db_id: existingInDb[0].id, alreadyExisted: true };
    }

    // Únicamente si no existe en absoluto en Supabase se hace insert
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
      ticket.last_resend = new Date().toISOString();
      saveLocalTicket(ticket);

      if (channel) channel.postMessage({ type: 'NEW_TICKET', ticket });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vigilancia:new_ticket', { detail: ticket }));
      }
      return { success: true, db_id: data[0].id };
    }

    return { success: false, message: 'Sin respuesta de base de datos' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Reenviar todos los tickets evitando inserciones duplicadas
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
      try {
        if (!t.db_id) {
          // Chequear primero si ya existe en Supabase
          const rep = t.reporter_name || t.user || t.zone || t.branch || 'Sucursal';
          const { data: exists } = await supabase
            .from('tickets')
            .select('id')
            .eq('title', t.title)
            .eq('reporter_name', rep)
            .limit(1);

          if (exists && exists.length > 0) {
            t.db_id = exists[0].id;
          } else {
            const { data, error } = await supabase
              .from('tickets')
              .insert([{
                title: t.title,
                description: t.description,
                priority: t.priority || 'Media',
                status: t.status || 'Abierto',
                reporter_name: rep
              }])
              .select();

            if (!error && data && data[0]) {
              t.db_id = data[0].id;
            }
          }
        }
        t.last_resend = new Date().toISOString();
        if (channel) channel.postMessage({ type: 'NEW_TICKET', ticket: t });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vigilancia:new_ticket', { detail: t }));
        }
        count++;
      } catch (e) {}
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicateTickets(local)));
    return { count, success: true };
  } catch (err) {
    return { count: 0, success: false, error: err.message };
  }
}
