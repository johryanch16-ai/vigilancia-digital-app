import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Building2, 
  Tag, 
  Calendar, 
  User, 
  AlignLeft, 
  X, 
  RefreshCw,
  ShieldCheck,
  Eye,
  Filter,
  Camera,
  Download,
  Maximize2
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { getLocalTickets, updateLocalTicketStatus, deleteLocalTicket } from '../lib/ticketStorage.js';

export default function AdminBitacora() {
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'resuelto', 'archivado'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : '';

  useEffect(() => {
    fetchArchivedTickets();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchArchivedTickets = async () => {
    const local = getLocalTickets();
    const localArchived = local.filter(t => t.status === 'Archivado' || t.status === 'Resuelto');

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, zones(name), categories(name)')
        .in('status', ['Archivado', 'Resuelto'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedRemote = data.map(t => ({
          id: t.id ? t.id.toString() : 'TKT-' + Math.random().toString(36).substring(2, 6),
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority || 'Media',
          zone: t.zones?.name || t.zone || 'Sucursal',
          category: t.categories?.name || t.category || 'General',
          user: t.reporter_name || 'Sucursal',
          image: t.image || null,
          date: new Date(t.created_at || Date.now()).toLocaleString(),
          rawDate: t.created_at
        }));

        const combined = [...localArchived];
        mappedRemote.forEach(rem => {
          if (!combined.some(c => c.id === rem.id)) {
            combined.push(rem);
          }
        });
        setTickets(combined);
        return;
      }
    } catch (err) {}

    setTickets(localArchived);
  };

  const handleRestore = async (id, e) => {
    if (e) e.stopPropagation();
    updateLocalTicketStatus(id, 'Abierto');
    setTickets(prev => prev.filter(t => t.id !== id));
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket(null);
    }
    showToast(`Incidencia #${id} restaurada al tablero de casos activos.`);
  };

  const handleDeletePermanent = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Desea purgar definitivamente la incidencia #${id} de la bitcora histrica?`)) {
      deleteLocalTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket(null);
      }
      showToast(`Incidencia #${id} eliminada permanentemente.`);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Crtica': case 'Critica': return 'bg-red-950/60 text-red-400 border border-red-800';
      case 'Alta': return 'bg-orange-950/60 text-orange-400 border border-orange-800';
      case 'Media': return 'bg-blue-950/60 text-blue-400 border border-blue-800';
      default: return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterType === 'resuelto' && t.status !== 'Resuelto') return false;
    if (filterType === 'archivado' && t.status !== 'Archivado') return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.id && t.id.toLowerCase().includes(term)) ||
      (t.title && t.title.toLowerCase().includes(term)) ||
      (t.zone && t.zone.toLowerCase().includes(term)) ||
      (t.user && t.user.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto min-h-screen pb-24 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#0f172a] border border-cyan-500/40 text-white px-5 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-6 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-xs sm:text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Archive className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            Bitcora de Incidencias Concluidas y Archivo
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
            Historial de casos resueltos y archivados por el equipo administrativo ({adminUser || 'Johryan & Johnny'}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchArchivedTickets}
            className="flex items-center gap-2 px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:bg-[#0a1128] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Actualizar
          </button>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cdigo #INC, cuenta o asunto..." 
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-700 rounded-xl bg-[#0f172a] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'all' ? 'bg-cyan-600 text-white shadow-md' : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:text-white'}`}
          >
            Todos ({tickets.length})
          </button>
          <button
            onClick={() => setFilterType('resuelto')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterType === 'resuelto' ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:text-white'}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluidos ({tickets.filter(t => t.status === 'Resuelto').length})
          </button>
          <button
            onClick={() => setFilterType('archivado')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterType === 'archivado' ? 'bg-slate-700 text-white shadow-md' : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:text-white'}`}
          >
            <Archive className="w-3.5 h-3.5" /> Archivados ({tickets.filter(t => t.status === 'Archivado').length})
          </button>
        </div>
      </div>

      {/* Tabla y Tarjetas de Incidencias */}
      <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]/70">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Cdigo / Asunto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Punto de Operacin</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Severidad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha Registro</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTickets.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className="hover:bg-[#0a1128]/80 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-cyan-400 text-sm">#{ticket.id}</div>
                    <div className="text-white text-sm font-semibold mt-0.5 max-w-[280px] truncate">{ticket.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{ticket.category}</span>
                      {ticket.image && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                          <Camera className="w-3 h-3" /> Foto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                      <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{ticket.zone || 'Sucursal'}</span>
                    </div>
                    <div className="text-xs text-slate-400">Por: {ticket.user}</div>
                  </td>
                  <td className="px-6 py-4">
                    {ticket.status === 'Resuelto' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        <Archive className="w-3.5 h-3.5" /> Archivado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getPriorityBadge(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                    {ticket.date}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleRestore(ticket.id, e)}
                        className="p-2 text-cyan-400 hover:bg-cyan-950/40 rounded-lg transition-colors border border-cyan-800/40"
                        title="Restaurar a Activos"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePermanent(ticket.id, e)}
                        className="p-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-800/40"
                        title="Eliminar Permanente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                    No se encontraron incidencias en el archivo histrico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Cards View */}
        <div className="lg:hidden divide-y divide-slate-800">
          {filteredTickets.map((ticket) => (
            <div 
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="p-4 hover:bg-[#0a1128] transition-colors cursor-pointer flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">#{ticket.id}</span>
                    {ticket.status === 'Resuelto' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                        Concluido
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Archivado
                      </span>
                    )}
                    {ticket.image && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                        Foto
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base mt-1 line-clamp-2">
                    {ticket.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleRestore(ticket.id, e)}
                    className="p-2 text-cyan-400 bg-slate-800/90 rounded-xl border border-slate-700"
                    title="Restaurar"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeletePermanent(ticket.id, e)}
                    className="p-2 text-red-400 bg-slate-800/90 rounded-xl border border-slate-700"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{ticket.zone}</span>
                </div>
                <span>{ticket.date}</span>
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-medium text-sm">
              No se encontraron incidencias en el archivo histrico.
            </div>
          )}
        </div>
      </div>

      {/* Modal / Slide-over para Detalle de Incidencia Histrica */}
      {selectedTicket && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedTicket(null)}
          ></div>
          
          <div className="relative w-full max-w-xl h-full bg-[#0a1128] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-500"></div>

            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex justify-between items-start bg-[#0f172a]">
              <div className="min-w-0 pr-3">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white font-mono">
                    #{selectedTicket.id}
                  </h2>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${getPriorityBadge(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg ${selectedTicket.status === 'Resuelto' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                  {selectedTicket.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="bg-slate-800/80 rounded-xl p-2 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              
              {/* Grid de Metadatos */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-cyan-400 mb-1">
                    <Building2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Punto Operativo</span>
                  </div>
                  <p className="text-sm font-bold text-white">{selectedTicket.zone}</p>
                </div>

                <div className="p-3.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-blue-400 mb-1">
                    <Tag className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lnea de Servicio</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{selectedTicket.category}</p>
                </div>

                <div className="p-3.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emisor</span>
                  </div>
                  <p className="text-sm font-bold text-slate-200">{selectedTicket.user}</p>
                </div>

                <div className="p-3.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-300">{selectedTicket.date}</p>
                </div>
              </div>

              {/* Bitcora de Observaciones */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-cyan-400" /> Detalle Registrado
                </h4>
                <div className="bg-[#0f172a] p-4 sm:p-5 rounded-xl border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Evidencia Fotogrfica si existe */}
              {selectedTicket.image && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" /> Evidencia Fotogrfica
                    </span>
                  </h4>
                  <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-3 space-y-2">
                    <div 
                      onClick={() => setLightboxImage(selectedTicket.image)}
                      className="relative max-h-60 w-full rounded-lg overflow-hidden bg-black/60 flex items-center justify-center cursor-pointer group"
                    >
                      <img src={selectedTicket.image} alt="Evidencia" className="max-h-60 object-contain group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                        <Maximize2 className="w-4 h-4 text-cyan-300" /> Ver en grande
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <a
                        href={selectedTicket.image}
                        download={`evidencia_${selectedTicket.id}.jpg`}
                        className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0f172a] flex justify-between gap-3">
              <button
                onClick={(e) => handleRestore(selectedTicket.id, e)}
                className="px-4 py-2.5 bg-cyan-950/40 border border-cyan-800 text-cyan-400 rounded-xl text-xs sm:text-sm font-bold hover:bg-cyan-900/40 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Restaurar Caso
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Lightbox */}
      {lightboxImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[92vh] w-full bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a1128]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" /> Evidencia Fotogrfica
              </span>
              <button 
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center bg-black/70 overflow-auto max-h-[80vh]">
              <img src={lightboxImage} alt="Evidencia completa" className="max-w-full max-h-[78vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
