import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Plus, Edit2, Trash2, Server, X, QrCode, Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminEquipos() {
  const [equipos, setEquipos] = useState([]);
  const [zones, setZones] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showQR, setShowQR] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Computadora',
    description: '',
    ip: '',
    zone_id: '',
    status: 'Activo'
  });

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'Computadora', description: '', ip: '', zone_id: '', status: 'Activo' });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (equipo) => {
    setFormData({
      name: equipo.name,
      type: equipo.type || 'Computadora',
      description: equipo.description || '',
      ip: equipo.ip_address || '',
      zone_id: equipo.zone_id || '',
      status: equipo.status || 'Activo'
    });
    setEditingId(equipo.id);
    setIsModalOpen(true);
  };

  const handleSaveEquipo = async (e) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      type: formData.type,
      description: formData.description,
      ip_address: formData.ip,
      zone_id: formData.zone_id,
      status: formData.status
    };

    if (editingId) {
      const { error } = await supabase.from('equipos').update(payload).eq('id', editingId);
      if (error) alert("Error: " + error.message);
    } else {
      const { error } = await supabase.from('equipos').insert([payload]);
      if (error) alert("Error: " + error.message);
    }

    fetchEquipos();
    resetForm();
  };

  const handleDeleteEquipo = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este equipo permanentemente?")) {
      const { error } = await supabase.from('equipos').delete().eq('id', id);
      if (!error) {
        setEquipos(equipos.filter(e => e.id !== id));
      } else {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  const printQR = () => {
    const printContent = document.getElementById('qr-print-area');
    const windowPrint = window.open('', '', 'width=800,height=600');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Imprimir QR de Equipo</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .label { text-align: center; border: 2px solid #000; padding: 20px; border-radius: 10px; width: 300px; }
            h2 { margin: 0 0 5px 0; font-size: 20px; }
            p { margin: 0 0 15px 0; font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <div class="label">
            <h2>${showQR?.name}</h2>
            <p>${showQR?.type} - Z: ${showQR?.zones?.name || 'NA'}</p>
            ${printContent.innerHTML}
            <p style="margin-top: 15px; font-size: 10px;">ID: ${showQR?.id}</p>
          </div>
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Monitor className="w-7 h-7 text-cyan-400" />
            Inventario de Equipos
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">Gestiona el hardware, genera QR y asigna a sucursales.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all gap-2"
          >
            <Plus className="w-4 h-4" />
            Registrar Equipo
          </button>
        </div>
      </div>

      {/* Modal QR */}
      {showQR && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Código QR
              </h3>
              <button onClick={() => setShowQR(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <div id="qr-print-area" className="bg-white p-4 rounded-xl">
                <QRCodeSVG 
                  value={JSON.stringify({ id: showQR.id, n: showQR.name, t: showQR.type })} 
                  size={200}
                  level={"H"}
                  includeMargin={true}
                />
              </div>
              <h4 className="mt-4 font-bold text-lg text-white">{showQR.name}</h4>
              <p className="text-slate-400 text-sm mb-6">{showQR.type}</p>
              
              <div className="flex w-full gap-3">
                <button onClick={printQR} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center gap-2 font-bold transition-colors border border-slate-700">
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Formulario */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-cyan-900/50">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-cyan-400" /> : <Monitor className="w-5 h-5 text-cyan-400" />}
                {editingId ? 'Editar Equipo' : 'Registrar Equipo'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEquipo} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Identificador / Nombre *</label>
                <input required name="name" value={formData.name} onChange={handleChange} type="text" placeholder="Ej. PC-CAJA-04" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Tipo de Equipo *</label>
                <select required name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                  <option>Computadora</option>
                  <option>Servidor</option>
                  <option>Cámara de Seguridad</option>
                  <option>Impresora</option>
                  <option>Router / Switch</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-1">Descripción / Marca / Modelo</label>
                <input name="description" value={formData.description} onChange={handleChange} type="text" placeholder="Ej. Dell Optiplex 3080, i5, 8GB RAM" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Dirección IP (Opcional)</label>
                <input name="ip" value={formData.ip} onChange={handleChange} type="text" placeholder="192.168.x.x" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none text-white focus:border-cyan-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Sucursal / Zona *</label>
                <select required name="zone_id" value={formData.zone_id} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                  <option value="">Selecciona una zona...</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-1">Estado</label>
                <select required name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                  <option>Activo</option>
                  <option>Mantenimiento</option>
                  <option>Inactivo</option>
                </select>
              </div>
              
              <div className="md:col-span-2 pt-4 flex gap-3 justify-end border-t border-slate-800 mt-2">
                <button type="button" onClick={resetForm} className="px-5 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  {editingId ? 'Actualizar' : 'Guardar'} Equipo
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Lista de Equipos */}
      <div className="bg-[#0f172a] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Equipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Red / IP</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Sucursal / Zona</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {equipos.map((equipo) => (
                <tr key={equipo.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 text-cyan-400 rounded-lg border border-slate-700">
                        {equipo.type === 'Servidor' ? <Server className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{equipo.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{equipo.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-md border border-cyan-800">
                      {equipo.ip_address || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {equipo.zones?.name || 'Sin asignar'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                      equipo.status === 'Activo' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                      equipo.status === 'Mantenimiento' ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-red-900/30 text-red-400 border-red-800'
                    }`}>
                      {equipo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button onClick={() => setShowQR(equipo)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100 md:opacity-100" title="Código QR">
                      <QrCode className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleEditClick(equipo)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100 md:opacity-100" title="Editar">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteEquipo(equipo.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100 md:opacity-100" title="Eliminar">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-800">
          {equipos.map((equipo) => (
            <div key={equipo.id} className="p-4 hover:bg-slate-800/50 transition-colors flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 text-cyan-400 rounded-lg border border-slate-700">
                    {equipo.type === 'Servidor' ? <Server className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{equipo.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{equipo.type}</div>
                  </div>
                </div>
                <div className="flex gap-1 -mr-2">
                  <button onClick={() => setShowQR(equipo)} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg transition-colors">
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEditClick(equipo)} className="p-2 text-blue-400 bg-blue-900/20 hover:bg-blue-900/40 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteEquipo(equipo.id)} className="p-2 text-red-400 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-800">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-mono">{equipo.ip_address || 'N/A'}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{equipo.zones?.name || 'Sin asignar'}</span>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded border ${
                  equipo.status === 'Activo' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                  equipo.status === 'Mantenimiento' ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-red-900/30 text-red-400 border-red-800'
                }`}>
                  {equipo.status}
                </span>
              </div>
            </div>
          ))}
          {equipos.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-medium">
              No hay equipos registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
