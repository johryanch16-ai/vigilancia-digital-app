import { supabase } from './supabase';
import { BRANCH_ACCOUNTS } from './branches';

const STORAGE_KEY = 'vigilancia_local_zones';

// Generar zonas por defecto basadas en las cuentas de sucursales oficiales
function getDefaultZones() {
  return BRANCH_ACCOUNTS.map((branch, index) => ({
    id: branch.id || `zone-default-${index + 1}`,
    name: branch.name,
    address: branch.phone ? `Tel: ${branch.phone}` : 'Sucursal Activa',
    status: 'Activa',
    created_at: new Date(Date.now() - (BRANCH_ACCOUNTS.length - index) * 3600000).toISOString()
  }));
}

export function getLocalZones() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultZones();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = getDefaultZones();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return parsed;
  } catch (e) {
    return getDefaultZones();
  }
}

export function saveLocalZones(zones) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
    window.dispatchEvent(new CustomEvent('vigilancia:zones_updated', { detail: { zones } }));
  } catch (e) {}
}

export async function fetchAllZones() {
  const localZones = getLocalZones();
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mergedMap = new Map();
      data.forEach(z => mergedMap.set(z.name.toLowerCase().trim(), z));
      localZones.forEach(z => {
        const key = z.name.toLowerCase().trim();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, z);
        }
      });
      const merged = Array.from(mergedMap.values());
      saveLocalZones(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase no disponible para zonas, usando almacenamiento local seguro:', err.message);
  }
  return localZones;
}

export async function createZoneRecord({ name, address, status = 'Activa' }) {
  const trimmedName = name.trim();
  const trimmedAddress = address?.trim() || 'Sin dirección';

  const newZone = {
    id: 'zone-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    name: trimmedName,
    address: trimmedAddress,
    status,
    created_at: new Date().toISOString()
  };

  const current = getLocalZones();
  const updated = [newZone, ...current.filter(z => z.name.toLowerCase() !== trimmedName.toLowerCase())];
  saveLocalZones(updated);

  let remoteSynced = false;
  try {
    const { data, error } = await supabase
      .from('zones')
      .insert([{ name: trimmedName, address: trimmedAddress, status }])
      .select();

    if (!error && data && data[0]) {
      remoteSynced = true;
      const syncedUpdated = updated.map(z => z.id === newZone.id ? data[0] : z);
      saveLocalZones(syncedUpdated);
      return { success: true, zone: data[0], remoteSynced: true };
    }
  } catch (err) {
    console.warn('Supabase no disponible al crear zona, guardada localmente:', err.message);
  }

  return { success: true, zone: newZone, remoteSynced };
}

export async function updateZoneRecord(id, updates) {
  const current = getLocalZones();
  let updatedZone = null;
  const updated = current.map(z => {
    if (z.id === id) {
      updatedZone = { ...z, ...updates };
      return updatedZone;
    }
    return z;
  });
  saveLocalZones(updated);

  try {
    await supabase.from('zones').update(updates).eq('id', id);
  } catch (err) {
    console.warn('Supabase no disponible al actualizar zona:', err.message);
  }

  return updatedZone;
}

export async function deleteZoneRecord(id) {
  const current = getLocalZones();
  const updated = current.filter(z => z.id !== id);
  saveLocalZones(updated);

  try {
    await supabase.from('zones').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase no disponible al eliminar zona:', err.message);
  }

  return true;
}
