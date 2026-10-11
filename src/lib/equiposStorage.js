import { supabase } from './supabase';
import { getLocalZones } from './zonesStorage';

const STORAGE_KEY = 'vigilancia_local_equipos';

/**
 * Genera un código QR / Código de inventario único y predecible.
 * Ej: VD-SABANA-PC-CAJA-01 o VD-EQ-4F29
 */
export function generateEquipoQRCode(name, zoneName, id = null) {
  const cleanZone = (zoneName || 'SUC')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/FARMACIA\s*/g, '')
    .replace(/CV-/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'GEN';

  const cleanName = (name || 'EQUIPO')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 16);

  // Si tenemos un id existente o creamos uno corto único
  const suffix = id ? id.toString().replace(/^eq-/, '').slice(-4).toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VD-${cleanZone}-${cleanName}`;
}

function getDefaultEquipos() {
  const zones = getLocalZones();
  const sabana = zones.find(z => z.name.toLowerCase().includes('sabana')) || zones[0];
  const rohrmoser = zones.find(z => z.name.toLowerCase().includes('rohrmoser')) || zones[1] || zones[0];

  return [
    {
      id: 'eq-default-1',
      qr_code: 'VD-SABANA-PC-CAJA-01',
      name: 'PC-CAJA-01',
      type: 'Computadora',
      description: 'Dell Optiplex 3080 - Caja Principal',
      ip: '192.168.1.101',
      zone_id: sabana?.id || 'suc-cv-sabana',
      zones: { name: sabana?.name || 'Farmacia CV-Sabana' },
      status: 'Activo',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'eq-default-2',
      qr_code: 'VD-ROHRMOSER-SRV-MONITOR-01',
      name: 'SRV-MONITOR-01',
      type: 'Servidor',
      description: 'Servidor NVR Hikvision 16 canales',
      ip: '192.168.1.200',
      zone_id: rohrmoser?.id || 'suc-cv-rohrmoser',
      zones: { name: rohrmoser?.name || 'Farmacia CV-Rohrmoser' },
      status: 'Activo',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];
}

/**
 * Filtro estricto anti-duplicados guiado por el código QR / Código único de activo.
 * Si existen varios registros con el mismo código QR o con el mismo nombre en la misma sucursal,
 * se conserva únicamente uno unificado para que jamás se vean duplicados.
 */
export function deduplicateEquipos(list) {
  if (!Array.isArray(list)) return [];
  
  const seenQR = new Set();
  const seenNameZone = new Set();
  const seenId = new Set();
  const result = [];

  for (const eq of list) {
    if (!eq || typeof eq !== 'object') continue;

    // Asegurar que tenga un qr_code válido
    const qrCode = (eq.qr_code || eq.code || '').toString().trim().toUpperCase() || 
                   generateEquipoQRCode(eq.name, eq.zones?.name || eq.zone_id, eq.id);

    const normalizedEq = {
      ...eq,
      qr_code: qrCode
    };

    const qrKey = qrCode.toLowerCase();
    const idKey = (eq.id || '').toString().toLowerCase();
    const nameZoneKey = `${(eq.name || '').trim().toLowerCase()}__${(eq.zone_id || '').toString().trim().toLowerCase()}`;

    // Si ya vimos este equipo por código QR, ID o por nombre en la sucursal, ignorar duplicado
    if (qrKey && seenQR.has(qrKey)) continue;
    if (idKey && seenId.has(idKey)) continue;
    if (eq.name && eq.zone_id && seenNameZone.has(nameZoneKey)) continue;

    if (qrKey) seenQR.add(qrKey);
    if (idKey) seenId.add(idKey);
    if (eq.name && eq.zone_id) seenNameZone.add(nameZoneKey);

    result.push(normalizedEq);
  }

  return result;
}

export function getLocalEquipos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = deduplicateEquipos(getDefaultEquipos());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = deduplicateEquipos(getDefaultEquipos());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }

    // Limpiar duplicados automáticamente si los hubiera
    const deduplicated = deduplicateEquipos(parsed);
    if (deduplicated.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch (e) {
    return deduplicateEquipos(getDefaultEquipos());
  }
}

export function saveLocalEquipos(equipos, notify = true) {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = deduplicateEquipos(equipos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    if (notify) {
      window.dispatchEvent(new CustomEvent('vigilancia:equipos_updated', { detail: { equipos: cleaned } }));
    }
  } catch (e) {}
}

export async function fetchAllEquipos() {
  // Retornar de inmediato los locales enriquecidos y deduplicados
  const localEquipos = getLocalEquipos();
  const zones = getLocalZones();
  const zonesMap = new Map(zones.map(z => [z.id, z.name]));

  const enrichedLocals = localEquipos.map(eq => ({
    ...eq,
    zones: eq.zones || { name: zonesMap.get(eq.zone_id) || 'Sin asignar' },
    qr_code: eq.qr_code || generateEquipoQRCode(eq.name, eq.zones?.name || zonesMap.get(eq.zone_id), eq.id)
  }));

  try {
    const supabasePromise = supabase
      .from('equipos')
      .select('*, zones(name)')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout Supabase')), 1200)
    );

    const { data, error } = await Promise.race([supabasePromise, timeoutPromise]);

    if (!error && Array.isArray(data) && data.length > 0) {
      const enrichedRemote = data.map(eq => ({
        ...eq,
        zones: eq.zones || { name: zonesMap.get(eq.zone_id) || 'Sin asignar' },
        qr_code: eq.qr_code || generateEquipoQRCode(eq.name, eq.zones?.name || zonesMap.get(eq.zone_id), eq.id)
      }));

      // Unir remoto con local evitando cualquier duplicado
      const combined = deduplicateEquipos([...enrichedRemote, ...enrichedLocals]);
      saveLocalEquipos(combined, false);
      return combined;
    }
  } catch (err) {
    // Modo offline resiliente silencioso
  }

  return enrichedLocals;
}

export async function createEquipoRecord(payload) {
  const zones = getLocalZones();
  const selectedZone = zones.find(z => z.id === payload.zone_id) || zones[0];
  const current = getLocalEquipos();

  // Generar código QR de activo único
  const generatedQR = payload.qr_code?.trim() || generateEquipoQRCode(payload.name, selectedZone?.name);

  // Verificar si ya existe un equipo con ese código QR o con el mismo nombre en la sucursal
  const existingIndex = current.findIndex(e => {
    const sameQR = e.qr_code && e.qr_code.toUpperCase() === generatedQR.toUpperCase();
    const sameNameZone = e.name?.toLowerCase().trim() === payload.name.toLowerCase().trim() && 
                         (e.zone_id === payload.zone_id || e.zones?.name === selectedZone?.name);
    return sameQR || sameNameZone;
  });

  if (existingIndex !== -1) {
    // Si ya existe, ACTUALIZARLO en vez de duplicarlo
    const existing = current[existingIndex];
    const updatedEquipo = {
      ...existing,
      ...payload,
      qr_code: generatedQR,
      zone_id: payload.zone_id || existing.zone_id,
      zones: { name: selectedZone?.name || existing.zones?.name || 'Sin asignar' }
    };
    current[existingIndex] = updatedEquipo;
    saveLocalEquipos(current, true);
    return { success: true, equipo: updatedEquipo, isUpdated: true };
  }

  const newEquipo = {
    id: 'eq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    qr_code: generatedQR,
    name: payload.name.trim(),
    type: payload.type || 'Computadora',
    description: payload.description || '',
    ip: payload.ip || '',
    zone_id: payload.zone_id || selectedZone?.id || '',
    zones: { name: selectedZone?.name || 'Sin asignar' },
    status: payload.status || 'Activo',
    created_at: new Date().toISOString()
  };

  const updated = deduplicateEquipos([newEquipo, ...current]);
  saveLocalEquipos(updated, true);

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
      const syncedUpdated = updated.map(e => e.id === newEquipo.id ? { 
        ...data[0], 
        qr_code: generatedQR,
        zones: data[0].zones || newEquipo.zones 
      } : e);
      saveLocalEquipos(syncedUpdated, false);
      return { success: true, equipo: { ...data[0], qr_code: generatedQR }, remoteSynced: true };
    }
  } catch (err) {}

  return { success: true, equipo: newEquipo, remoteSynced: false };
}

export async function updateEquipoRecord(id, updates) {
  const current = getLocalEquipos();
  const zones = getLocalZones();
  let updatedEquipo = null;

  const updated = current.map(eq => {
    if (eq.id === id || (updates.qr_code && eq.qr_code === updates.qr_code)) {
      const zoneId = updates.zone_id !== undefined ? updates.zone_id : eq.zone_id;
      const zoneObj = zones.find(z => z.id === zoneId);
      updatedEquipo = { 
        ...eq, 
        ...updates,
        qr_code: updates.qr_code || eq.qr_code || generateEquipoQRCode(updates.name || eq.name, zoneObj?.name || eq.zones?.name),
        zones: { name: zoneObj?.name || eq.zones?.name || 'Sin asignar' }
      };
      return updatedEquipo;
    }
    return eq;
  });

  const cleaned = deduplicateEquipos(updated);
  saveLocalEquipos(cleaned, true);

  try {
    const updatePromise = supabase.from('equipos').update(updates).eq('id', id);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1200));
    await Promise.race([updatePromise, timeoutPromise]);
  } catch (err) {}

  return updatedEquipo;
}

export async function deleteEquipoRecord(id) {
  const current = getLocalEquipos();
  const updated = current.filter(eq => eq.id !== id && eq.qr_code !== id);
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

  // 1. Si es formato JSON del QR
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.qr || parsed.qr_code) {
        const qrTarget = (parsed.qr || parsed.qr_code).toString().toUpperCase();
        const found = list.find(e => e.qr_code?.toUpperCase() === qrTarget);
        if (found) return found;
      }
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

  // 2. Coincidencia exacta por Código QR
  const byQR = list.find(e => e.qr_code?.toUpperCase() === raw.toUpperCase());
  if (byQR) return byQR;

  // 3. Coincidencia exacta por ID
  const byId = list.find(e => e.id?.toString().toLowerCase() === raw.toLowerCase());
  if (byId) return byId;

  // 4. Coincidencia exacta por Nombre
  const byName = list.find(e => e.name?.toLowerCase().trim() === raw.toLowerCase());
  if (byName) return byName;

  // 5. Coincidencia por IP
  const byIp = list.find(e => (e.ip || e.ip_address)?.trim() === raw);
  if (byIp) return byIp;

  // 6. Búsqueda parcial tolerante
  const partial = list.find(e => 
    (e.qr_code && e.qr_code.toUpperCase().includes(raw.toUpperCase())) ||
    (e.name && e.name.toLowerCase().includes(raw.toLowerCase())) || 
    (e.description && e.description.toLowerCase().includes(raw.toLowerCase())) ||
    (e.id && e.id.toString().includes(raw))
  );

  return partial || null;
}
