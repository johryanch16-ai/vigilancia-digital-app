import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, Edit2, Trash2, X, CheckCircle2, ShieldCheck, Search, Building } from 'lucide-react';
import { fetchAllZones, createZoneRecord, updateZoneRecord, deleteZoneRecord } from '../lib/zonesStorage';

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadZones();

    const handleUpdate = () => loadZones();
    window.addEventListener('vigilancia:zones_updated', handleUpdate);
    return () => window.removeEventListener('vigilancia:zones_updated', handleUpdate);
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadZones = async () => {
    setLoading(true);
    const data = await fetchAllZones();
    setZones(data || []);
    setLoading(false);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target);
    const name = formData.get('name')?.toString() || '';
    const address = formData.get('address')?.toString() || 'Sin dirección';
    const status = formData.get('status')?.toString() || 'Activa';

    if (!name.trim()) {
      alert("El nombre de la sucursal es obligatorio.");
      setIsSaving(false);
      return;
    }

    try {
      if (editingZone) {
        await updateZoneRecord(editingZone.id, { name: name.trim(), address: address.trim(), status });
        showNotification(`Sucursal "${name}" actualizada con éxito.`);
      } else {
        const res = await createZoneRecord({ name, address, status });
        if (res.success) {
          showNotification(`Sucursal "${name}" guardada con éxito.`);
        }
      }
      setIsModalOpen(false);
      setEditingZone(null);
      await loadZones();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteZone = async (id, zoneName) => {
    if (window.confirm(`¿Estás seguro de eliminar la zona "${zoneName}"?`)) {
      await deleteZoneRecord(id);
      showNotification(`Zona "${zoneName}" eliminada.`, 'info');
      await loadZones();
    }
  };

  const openEditModal = (zone) => {
    setEditingZone(zone);
    setIsModalOpen(true);
  };

  const filteredZones = zones.filter(z => 
    z.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Notificación Toast */}
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] bg-[#0f172a] border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)] rounded-xl px-4 py-3 flex items-center gap-3 text-white text-sm animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-cyan-400" /> Gestión de Zonas y Sucursales
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Administra las ubicaciones físicas y sucursales donde operan los equipos y se atienden incidencias.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button 
            onClick={() => { setEditingZone(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 border border-transparent rounded-xl text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva Zona / Sucursal
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0f172a] p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Total: <strong>{filteredZones.length}</strong> sucursales registradas</span>
        </div>
      </div>

      {/* Modal Crear / Editar Zona */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a1128]/85 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)}></div>
          <div className="relative bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-cyan-800/60 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-cyan-400" />
                {editingZone ? 'Editar Zona / Sucursal' : 'Nueva Zona / Sucursal'}
              </h3>
              <button 
                type="button" 
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveZone} autoComplete="off" className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre de la Sucursal *</label>
                <input 
                  required 
                  name="name" 
                  type="text" 
                  autoComplete="off"
                  defaultValue={editingZone?.name || ''}
                  placeholder="Ej. Farmacia CV-Ayarco" 
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Dirección Física o Referencia <span className="text-slate-500 font-normal">(Opcional)</span>
                </label>
                <input 
                  name="address" 
                  type="text" 
                  autoComplete="off"
                  defaultValue={editingZone?.address || ''}
                  placeholder="Ej. Curridabat, del cruce 200m este" 
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Estado</label>
                <select 
                  name="status"
                  defaultValue={editingZone?.status || 'Activa'}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                >
                  <option value="Activa">Activa</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Inactiva">Inactiva</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-800">
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all shadow-sm text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Guardando...' : (editingZone ? 'Actualizar Zona' : 'Guardar Zona')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Tabla de Zonas */}
      <div className="bg-[#0f172a] rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre de la Sucursal</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Dirección / Ref</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredZones.map((zone) => (
                <tr key={zone.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/50 text-cyan-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-white text-sm">{zone.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {zone.address || 'Sin dirección especificada'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                      zone.status === 'Activa' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                      zone.status === 'Mantenimiento' ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {zone.status || 'Activa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        className="p-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-900/20 cursor-pointer" 
                        title="Editar Sucursal"
                        onClick={() => openEditModal(zone)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/20 cursor-pointer" 
                        title="Eliminar Sucursal"
                        onClick={() => handleDeleteZone(zone.id, zone.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredZones.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-sm">
                    No se encontraron sucursales {searchTerm ? `con el término "${searchTerm}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
