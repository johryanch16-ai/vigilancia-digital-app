import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, MoreVertical, CheckCircle2, Clock, AlertCircle, X, MapPin, Tag, Calendar, User, MessageSquare, AlignLeft, Archive, Trash2, Shield, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminBitacora() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : '';
  const navigate = useNavigate();

  useEffect(() => {
    if (adminUser !== 'Johryan') {
      navigate('/admin/tickets'); // Redirect unauthorized users
    } else {
      fetchTickets();
    }
  }, [adminUser, navigate]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, zones(name), categories(name), equipos(name)')
      .eq('status', 'Archivado')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const mapped = data.map(t => ({
        id: t.id,
        displayId: t.id.substring(0, 8).toUpperCase(),
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        zone: t.zones?.name || 'Sin zona',
        category: t.categories?.name || 'Sin categoría',
        equipo: t.equipos?.name || 'Ninguno',
        user: t.reporter_name,
        date: new Date(t.created_at).toLocaleString(),
        rawDate: t.created_at
      }));
      setTickets(mapped);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Crítica': return 'bg-red-100 text-red-700 font-bold';
      case 'Alta': return 'bg-orange-100 text-orange-700 font-bold';
      case 'Media': return 'bg-blue-100 text-blue-700 font-bold';
      default: return 'bg-slate-100 text-slate-700 font-bold';
    }
  };

  const getStatusIcon = (status) => {
    return <Archive className="w-4 h-4 text-slate-500" />;
  };

  const handleRestoreTicket = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas restaurar este ticket? Volverá al Centro de Control principal.')) {
      const { error } = await supabase.from('tickets').update({ status: 'Abierto' }).eq('id', id);
      if (!error) {
        setTickets(tickets.filter(t => t.id !== id));
        setToastMessage(`Ticket ${id.substring(0,8)} restaurado exitosamente.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  const handleDeletePermanent = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('¡ATENCIÓN! ¿Estás totalmente seguro de eliminar este ticket permanentemente? Esta acción NO se puede deshacer.')) {
      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (!error) {
        setTickets(tickets.filter(t => t.id !== id));
        setToastMessage(`Ticket ${id.substring(0,8)} destruido permanentemente.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen pb-24 bg-red-50/10">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0a1128] border border-blue-500/30 text-white px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.3)] animate-in slide-in-from-top-10 flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8 border-b border-red-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-red-900 tracking-tight flex items-center gap-2">
            <Archive className="w-6 h-6 text-red-600" />
            Bitácora Privada - Archivo Secreto
          </h1>
          <p className="mt-1 text-sm text-red-700 font-medium">Registro histórico de tickets eliminados. Acceso exclusivo para Dirección (Johryan).</p>
        </div>
      </div>

      {/* Ticket Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Ticket</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Prioridad</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Zona / CategorÃ­a</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 text-sm">TKT-{ticket.displayId}</div>
                  <div className="text-slate-500 text-sm mt-0.5 truncate max-w-[200px]">{ticket.title}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(ticket.status)}
                    <span className="text-sm font-bold text-slate-700">{ticket.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-700">{ticket.zone}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{ticket.category}</div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-500">
                  {ticket.date.split(',')[0]}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button 
                    onClick={(e) => handleRestoreTicket(ticket.id, e)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Restaurar a Centro de Control"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => handleDeletePermanent(ticket.id, e)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar Permanentemente"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                  No se encontraron tickets en esta vista.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Slide-over para Detalle de Ticket */}
      {selectedTicket && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0a1128]/80 backdrop-blur-md transition-opacity" onClick={() => setSelectedTicket(null)}></div>
          
          <div className="relative w-full max-w-2xl h-full bg-[#0a1128] border-l border-blue-500/20 shadow-[0_0_50px_rgba(37,99,235,0.15)] flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            {/* Glow decorativo de borde superior */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-blue-600"></div>

            {/* Header del Modal */}
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-start bg-white/5">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">{selectedTicket.id}</h2>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getPriorityBadge(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5">
                    {getStatusIcon(selectedTicket.status)} {selectedTicket.status}
                  </span>
                </div>
                <p className="text-base font-medium text-slate-400">{selectedTicket.title}</p>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="bg-white/5 rounded-xl p-2.5 hover:bg-white/10 transition-colors text-slate-400 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              
              {/* Meta info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Punto Operativo</p>
                    <p className="text-sm text-slate-200 font-semibold">{selectedTicket.zone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><Tag className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">CategorÃ­a</p>
                    <p className="text-sm text-slate-200 font-semibold">{selectedTicket.category}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><User className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Emisor</p>
                    <p className="text-sm text-slate-200 font-semibold">{selectedTicket.user}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Calendar className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Timestamp</p>
                    <p className="text-sm text-slate-200 font-semibold">{selectedTicket.date}</p>
                  </div>
                </div>
              </div>

              {/* DescripciÃ³n */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-slate-500" /> Registro del Incidente
                </h3>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-sm text-slate-300 leading-relaxed font-mono">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Historial / Chat */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" /> BitÃ¡cora de Soporte
                </h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-gradient-to-b before:from-blue-500/50 before:via-white/10 before:to-transparent">
                  
                  {/* Nota 1 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0a1128] border border-blue-500 text-blue-400 font-bold text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      S1
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white/5 p-5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">IngenierÃ­a Nivel 1</span>
                        <span className="text-xs font-medium text-slate-500">Hace 2 min</span>
                      </div>
                      <p className="text-sm text-slate-400">AnÃ¡lisis inicial completado. Dispositivo fuera de red. Escalamiento a cuadrilla en sitio en proceso.</p>
                    </div>
                  </div>

                  {/* Nueva Nota Input */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group mt-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0a1128] border border-white/10 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      +
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white/5 p-2 rounded-2xl border border-white/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all flex items-center">
                      <input type="text" placeholder="AÃ±adir nota cifrada a la bitÃ¡cora..." className="w-full px-3 py-2 text-sm outline-none bg-transparent text-slate-200 placeholder-slate-500" />
                      <button className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
            
            {/* Footer Actions */}
            <div className="p-6 border-t border-white/5 bg-white/5 flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Estado Operativo</label>
                <select 
                  id="status-select"
                  defaultValue={selectedTicket.status}
                  className="w-full bg-[#0a1128] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="Abierto">ðŸ”´ Triage Pendiente (Abierto)</option>
                  <option value="En Progreso">ðŸ”µ OperaciÃ³n en Curso</option>
                  <option value="Resuelto">ðŸŸ¢ MisiÃ³n Cumplida (Resolver)</option>
                </select>
              </div>
              <button 
                onClick={() => {
                  const newStatus = document.getElementById('status-select').value;
                  const cleanStatus = newStatus.replace(/ðŸŸ¢ |ðŸ”µ |ðŸ”´ |Triage Pendiente \(|\)|OperaciÃ³n en Curso|MisiÃ³n Cumplida \(/g, '').replace('Resolver)', 'Resuelto').replace('Abierto)', 'Abierto').replace('En Curso', 'En Progreso').trim();
                  
                  // Mapeo seguro
                  let finalStatus = 'Abierto';
                  if(newStatus.includes('Progreso') || newStatus.includes('Curso')) finalStatus = 'En Progreso';
                  if(newStatus.includes('Resuelto') || newStatus.includes('Cumplida')) finalStatus = 'Resuelto';

                  setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: finalStatus } : t));
                  setToastMessage(`Sistema: Ticket ${selectedTicket.id} actualizado a ${finalStatus}`);
                  setTimeout(() => setToastMessage(null), 3000);
                  setSelectedTicket(null);
                }}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] self-end"
              >
                Actualizar Estado
              </button>
            </div>

          </div>
        </div>, document.body
      )}

    </div>
  );
}
