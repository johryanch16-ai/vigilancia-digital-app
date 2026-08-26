import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Plus, Edit2, Trash2, Server, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminEquipos() {
  const [equipos, setEquipos] = useState([]);
  const [zones, setZones] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchEquipos();
    fetchZones();
  }, []);

  const fetchEquipos = async () => {
    const { data, error } = await supabase.from('equipos').select('*, zones(name)').order('created_at', { ascending: false });
    if (!error) setEquipos(data);
  };

  const fetchZones = async () => {
    const { data, error } = await supabase.from('zones').select('id, name');
    if (!error) setZones(data);
  };

  const handleAddEquipo = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const ip = formData.get('ip') || 'DHCP';
    const zone_id = formData.get('zone_id');

    const { data, error } = await supabase.from('equipos').insert([{ name, ip, zone_id, status: 'Operativo' }]).select('*, zones(name)');

    if (!error) {
      setEquipos([data[0], ...equipos]);
      setIsModalOpen(false);
    } else {
      alert("Error al crear equipo: " + error.message);
    }
  };

  const handleDeleteEquipo = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este equipo?")) {
      const { error } = await supabase.from('equipos').delete().eq('id', id);
      if (!error) {
        setEquipos(equipos.filter(e => e.id !== id));
      } else {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Monitor className="w-6 h-6 text-blue-600" /> Inventario de Equipos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra las computadoras y servidores para asociarlos a los reportes de incidentes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Registrar Equipo
          </button>
        </div>
      </div>

      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-[#0a1128]/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Equipo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddEquipo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Equipo</label>
                <input required name="name" type="text" placeholder="Ej. PC-CAJA-04" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Dirección IP <span className="text-slate-400 font-normal">(Opcional)</span></label>
                <input name="ip" type="text" placeholder="192.168.x.x" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Sucursal / Zona</label>
                <select required name="zone_id" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Selecciona una zona...</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Guardar Equipo</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Equipo</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección IP</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sucursal / Zona</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado Actual</th>
              <th className="px-6 py-4 relative"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {equipos.map((equipo) => (
              <tr key={equipo.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                      {equipo.name.startsWith('SRV') ? <Server className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-bold text-slate-900">{equipo.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    {equipo.ip}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {equipo.zones?.name || 'Sin asignar'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    equipo.status === 'Operativo' ? 'bg-emerald-100 text-emerald-800' : 
                    equipo.status === 'Falla de Red' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {equipo.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Editar" onClick={() => alert('Edición en desarrollo')}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Eliminar" onClick={() => handleDeleteEquipo(equipo.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
