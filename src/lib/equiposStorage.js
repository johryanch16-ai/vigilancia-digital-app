import { supabase } from './supabase';
import { getLocalZones } from './zonesStorage';

const STORAGE_KEY = 'vigilancia_local_equipos';

function getDefaultEquipos() {
  const zones = getLocalZones();
  const sabana = zones.find(z => z.name.toLowerCase().includes('sabana')) || zones[0];
  const rohrmoser = zones.find(z => z.name.toLowerCase().includes('rohrmoser')) || zones[1] || zones[0];

  return [
    {
      id: 'eq-default-1',
      name: 'PC-CAJA-01',
      type: 'Computadora',
      description: 'Dell Optiplex 3080 - Caja Principal',
      ip: '192.168.1.101',
      zone_id: sabana?.id || 'zone-default-1',
      zones: { name: sabana?.name || 'Farmacia CV-Sabana' },
      status: 'Activo',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'eq-default-2',
      name: 'SRV-MONITOR-01',
      type: 'Servidor',
      description: 'Servidor NVR Hikvision 16 canales',
      ip: '192.168.1.200',
      zone_id: rohrmoser?.id || 'zone-default-2',
      zones: { name: rohrmoser?.name || 'Farmacia CV-Rohrmoser' },
      status: 'Activo',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];
}

export function getLocalEquipos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultEquipos();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = getDefaultEquipos();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return parsed;
  } catch (e) {
    return getDefaultEquipos();
  }
}

export function saveLocalEquipos(equipos, notify = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipos));
    if (notify) {
      window.dispatchEvent(new CustomEvent('vigilancia:equipos_updated', { detail: { equipos } }));
    }
  } catch (e) {}
}

export async function fetchAllEquipos() {
  // Retornar de inmediato los locales enriquecidos
  const localEquipos = getLocalEquipos();
  const zones = getLocalZones();
  const zonesMap = new Map(zones.map(z => [z.id, z.name]));

  const enrichedLocals = localEquipos.map(eq => ({
    ...eq,
    zones: eq.zones || { name: zonesMap.get(eq.zone_id) || 'Sin asignar' }
  }));

  try {
    // Si Supabase no responde en 1200ms, abortar para no trabar la interfaz
    const supabasePromise = supabase
      .from('equipos')
      .select('*, zones(name)')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout Supabase')), 1200)
    );

    const { data, error } = await Promise.race([supabasePromise, timeoutPromise]);

    if (!error && Array.isArray(data) && data.length > 0) {
      const mergedMap = new Map();
      data.forEach(eq => {
        const enriched = {
          ...eq,
          zones: eq.zones || { name: zonesMap.get(eq.zone_id) || 'Sin asignar' }
        };
        mergedMap.set(eq.id.toString(), enriched);
      });

      localEquipos.forEach(eq => {
        const key = eq.id.toString();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, eq);
        }
      });

      const merged = Array.from(mergedMap.values());
      saveLocalEquipos(merged, false);
      return merged;
    }
  } catch (err) {
    // Modo offline resiliente silencioso
  }

  return enrichedLocals;
}

export async function createEquipoRecord(payload) {
  const zones = getLocalZones();
  const selectedZone = zones.find(z => z.id === payload.zone_id) || zones[0];

  const newEquipo = {
    id: 'eq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: payload.name.trim(),
    type: payload.type || 'Computadora',
    description: payload.description || '',
    ip: payload.ip || '',
    zone_id: payload.zone_id || selectedZone?.id || '',
    zones: { name: selectedZone?.name || 'Sin asignar' },
    status: payload.status || 'Activo',
    created_at: new Date().toISOString()
  };

  const current = getLocalEquipos();
  const updated = [newEquipo, ...current];
  saveLocalEquipos(updated, true);

  let remoteSynced = false;
  try {
    const remotePayload = {
      name: newEquipo.name,
      type: newEquipo.type,
      description: newEquipo.description,
      ip: newEquipo.ip,
      zone_id: newEquipo.zone_id,
      status: newEquipo.status
    };

    const insertPromise = supabase
      .from('equipos')
      .insert([remotePayload])
      .select('*, zones(name)');

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout Supabase')), 1200)
    );

    const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

    if (!error && data && data[0]) {
      remoteSynced = true;
      const syncedUpdated = updated.map(e => e.id === newEquipo.id ? { ...data[0], zones: data[0].zones || newEquipo.zones } : e);
      saveLocalEquipos(syncedUpdated, false);
      return { success: true, equipo: data[0], remoteSynced: true };
    }
  } catch (err) {
    // Si falla remoto, continúa guardado localmente de forma segura
  }

  return { success: true, equipo: newEquipo, remoteSynced };
}

export async function updateEquipoRecord(id, updates) {
  const current = getLocalEquipos();
  const zones = getLocalZones();
  let updatedEquipo = null;

  const updated = current.map(eq => {
    if (eq.id === id) {
      const zoneId = updates.zone_id !== undefined ? updates.zone_id : eq.zone_id;
      const zoneObj = zones.find(z => z.id === zoneId);
      updatedEquipo = { 
        ...eq, 
        ...updates,
        zones: { name: zoneObj?.name || eq.zones?.name || 'Sin asignar' }
      };
      return updatedEquipo;
    }
    return eq;
  });

  saveLocalEquipos(updated, true);

  try {
    const updatePromise = supabase.from('equipos').update(updates).eq('id', id);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1200));
    await Promise.race([updatePromise, timeoutPromise]);
  } catch (err) {}

  return updatedEquipo;
}

export async function deleteEquipoRecord(id) {
  const current = getLocalEquipos();
  const updated = current.filter(eq => eq.id !== id);
  saveLocalEquipos(updated, true);

  try {
    const deletePromise = supabase.from('equipos').delete().eq('id', id);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1200));
    await Promise.race([deletePromise, timeoutPromise]);
  } catch (err) {}

  return true;
}

export function findEquipoByScannedCode(codeString, equiposList = null) {
  if (!codeString || typeof codeString !== 'string') return null;
  const raw = codeString.trim();
  const list = equiposList || getLocalEquipos();

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.id) {
        const found = list.find(e => e.id?.toString() === parsed.id.toString());
        if (found) return found;
      }
      if (parsed.n) {
        const found = list.find(e => e.name?.toLowerCase().trim() === parsed.n.toLowerCase().trim());
        if (found) return found;
      }
    } catch (e) {}
  }

  const byId = list.find(e => e.id?.toString().toLowerCase() === raw.toLowerCase());
  if (byId) return byId;

  const byName = list.find(e => e.name?.toLowerCase().trim() === raw.toLowerCase());
  if (byName) return byName;

  const byIp = list.find(e => (e.ip || e.ip_address)?.trim() === raw);
  if (byIp) return byIp;

  const partial = list.find(e => 
    e.name?.toLowerCase().includes(raw.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(raw.toLowerCase())) ||
    (e.id && e.id.toString().includes(raw))
  );

  return partial || null;
}
