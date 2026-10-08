import { supabase } from './supabase.js';

const STORAGE_KEY = 'vigilancia_local_tickets';
const CHANNEL_NAME = 'vigilancia_tickets_broadcast';

// Obtener canal de difusión entre pestañas y ventanas
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

export function getLocalTickets() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalTicket(ticket) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const updated = [ticket, ...existing.filter(t => t.id !== ticket.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export function updateLocalTicketStatus(id, newStatus) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const updated = existing.map(t => t.id === id ? { ...t, status: newStatus } : t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (channel) {
      channel.postMessage({ type: 'STATUS_CHANGED', id, status: newStatus });
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

export async function createTicket({ title, description, priority, branch, category, reporterName }) {
  const generatedId = getNextTicketNumber();
  const nowIso = new Date().toISOString();
  const displayDate = new Date().toLocaleString();

  const ticketObj = {
    id: generatedId,
    displayId: generatedId,
    title: title.trim(),
    description: description.trim(),
    priority: priority || 'Media',
    status: 'Abierto',
    zone: branch || 'Sin especificar',
    category: category || 'General',
    user: reporterName || branch || 'Sucursal',
    reporter_name: reporterName || branch || 'Sucursal',
    date: displayDate,
    rawDate: nowIso,
    created_at: nowIso
  };

  // 1. Guardar en almacenamiento local inmediato
  saveLocalTicket(ticketObj);

  // 2. Notificar vía canal entre pestañas locales
  if (channel) {
    channel.postMessage({ type: 'NEW_TICKET', ticket: ticketObj });
  }

  // 3. Disparar evento personalizado en la ventana actual
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vigilancia:new_ticket', { detail: ticketObj }));
  }

  // 4. Intentar guardar en Supabase (si el backend está activo)
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        title: ticketObj.title,
        description: ticketObj.description,
        priority: ticketObj.priority,
        status: 'Abierto',
        reporter_name: ticketObj.user
      }])
      .select();

    if (!error && data && data[0]) {
      ticketObj.db_id = data[0].id;
    }
  } catch (err) {
    console.warn('Supabase offline o en pausa. Ticket guardado localmente en tiempo real:', err);
  }

  return ticketObj;
}

export function subscribeToTickets(onNewTicket, onStatusChange) {
  const handlers = [];

  // BroadcastChannel
  if (channel) {
    const bcHandler = (event) => {
      if (event.data?.type === 'NEW_TICKET' && onNewTicket) {
        onNewTicket(event.data.ticket);
      }
      if (event.data?.type === 'STATUS_CHANGED' && onStatusChange) {
        onStatusChange(event.data.id, event.data.status);
      }
    };
    channel.addEventListener('message', bcHandler);
    handlers.push(() => channel.removeEventListener('message', bcHandler));
  }

  // CustomEvent
  if (typeof window !== 'undefined') {
    const ceHandler = (event) => {
      if (event.detail && onNewTicket) {
        onNewTicket(event.detail);
      }
    };
    window.addEventListener('vigilancia:new_ticket', ceHandler);
    handlers.push(() => window.removeEventListener('vigilancia:new_ticket', ceHandler));

    // Storage Event (otra pestaña)
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

  // Supabase Realtime (si está en línea)
  try {
    const subChannel = supabase.channel('realtime:tickets_shared')
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