import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Filter, 
  X, 
  ShieldCheck, 
  Tag, 
  Calendar, 
  User, 
  AlignLeft, 
  Check,
  Camera,
  Download,
  Maximize2
} from 'lucide-react';
import { BRANCH_NAMES } from '../lib/branches.js';
import { getLocalTickets, updateTicketData, deleteLocalTicket } from '../lib/ticketStorage.js';
import { supabase } from '../lib/supabase.js';

export default function AdminBranchTickets() {
  const [tickets, setTickets] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL'); // 'ALL' o nombre de sucursal
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Formulario de edicin
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    priority: 'Media',
    category: '',
    zone: '',
    status: 'Abierto'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchTickets = async () => {
    const local = getLocalTickets();
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, zones(name), categories(name)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedRemote = data.map(t => ({
          id: t.id ? t.id.toString() : 'TKT-' + Math.random().toString(36).substring(2, 6),
          displayId: (t.id || '').toString(),
          title: t.title,
          description: t.description,
          status: t.status || 'Abierto',
          priority: t.priority || 'Media',
          zone: t.zones?.name || t.zone || 'Sucursal',
          category: t.categories?.name || t.category || 'General',
          user: t.reporter_name || 'Sucursal',
          image: t.image || null,
          date: new Date(t.created_at || Date.now()).toLocaleString(),
          rawDate: t.created_at
        }));

        const combined = [...local];
        mappedRemote.forEach(rem => {
          if (!combined.some(c => c.id === rem.id)) {
            combined.push(rem);
          }
        });
        setTickets(combined);
        return;
      }
    } catch(e) {}

    setTickets(local);
  };

  const handleOpenEdit = (ticket) => {
    setEditingTicket(ticket);
    setEditFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      priority: ticket.priority || 'Media',
      category: ticket.category || 'General',
      zone: ticket.zone || '',
      status: ticket.status || 'Abierto'
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingTicket) return;

    const updated = updateTicketData(editingTicket.id, editFormData);
    if (updated) {
      setTickets(prev => prev.map(t => t.id === editingTicket.id ? { ...t, ...editFormData } : t));
      showToast(`Incidencia #${editingTicket.id} corregida y guardada exitosamente.`);
    }
    setEditingTicket(null);
  };

  const handleDelete = (id) => {
    if (window.confirm(`Est seguro de eliminar el ticket #${id}? Esta accin lo remover de la lista.`)) {
      deleteLocalTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      showToast(`Ticket #${id} eliminado.`);
    }
  };

  const handleQuickStatus = (id, newStatus) => {
    const updated = updateTicketData(id, { status: newStatus });
    if (updated) {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      showToast(`Estado de #${id} actualizado a "${newStatus}"`);
    }
  };

  // Conteo de tickets por sucursal
  const getBranchCount = (branchName) => {
    return tickets.filter(t => 
      (t.zone && t.zone.toLowerCase() === branchName.toLowerCase()) ||
      (t.user && t.user.toLowerCase() === branchName.toLowerCase())
    ).length;
  };

  // Filtrar tickets segn sucursal y buscador
  const filteredTickets = tickets.filter(t => {
    if (selectedBranch !== 'ALL') {
      const matchBranch = (t.zone && t.zone.toLowerCase() === selectedBranch.toLowerCase()) ||
                          (t.user && t.user.toLowerCase() === selectedBranch.toLowerCase());
      if (!matchBranch) return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.id && t.id.toLowerCase().includes(term)) ||
      (t.title && t.title.toLowerCase().includes(term)) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.zone && t.zone.toLowerCase().includes(term))
    );
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Crtica': case 'Critica': return 'bg-red-950/60 text-red-400 border border-red-800';
      case 'Alta': return 'bg-orange-950/60 text-orange-400 border border-orange-800';
      case 'Media': return 'bg-blue-950/60 text-blue-400 border border-blue-800';
      default: return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Resuelto': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'En Progreso': return <Clock className="w-4 h-4 text-blue-400" />;
      default: return <AlertCircle className="w-4 h-4 text-orange-400" />;
    }
  };

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
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            Tickets por Sucursal y Edicin Administrativa
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
            Seleccione una sucursal para revisar sus incidencias con evidencia fotogrfica, corregir errores o resolver casos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTickets}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:bg-[#0a1128] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Sincronizar
          </button>
        </div>
      </div>

      {/* Selector de Sucursales (Pestaas horizontales rpidas) */}
      <div className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedBranch('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
              selectedBranch === 'ALL'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg'
                : 'bg-[#0f172a] text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <span>Todas las Cuentas</span>
            <span className="px-2 py-0.5 rounded-md text-[11px] bg-black/30 font-mono">
              {tickets.length}
            </span>
          </button>

          {BRANCH_NAMES.map(branchName => {
            const count = getBranchCount(branchName);
            const isSelected = selectedBranch === branchName;
            return (
              <button
                key={branchName}
                onClick={() => setSelectedBranch(branchName)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg'
                    : 'bg-[#0f172a] text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <span>{branchName}</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                  count > 0 
                    ? (isSelected ? 'bg-black/30 text-white' : 'bg-cyan-950 text-cyan-300 font-bold') 
                    : 'bg-slate-900 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador dentro de la sucursal seleccionada */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Buscar en ${selectedBranch === 'ALL' ? 'todas las cuentas' : selectedBranch}...`} 
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-700 rounded-xl bg-[#0f172a] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Lista de Tickets de la Sucursal */}
      <div className="space-y-3 sm:space-y-4">
        {filteredTickets.map((ticket) => (
          <div 
            key={ticket.id}
            className="bg-[#0f172a] rounded-2xl border border-slate-800 p-4 sm:p-5 hover:border-slate-700 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono text-cyan-400 font-bold text-xs sm:text-sm">
                  #{ticket.id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${getPriorityBadge(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  {getStatusIcon(ticket.status)} {ticket.status}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  {ticket.zone}
                </span>
                {ticket.image && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                    <Camera className="w-3 h-3" /> Foto adjunta
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white tracking-tight">
                {ticket.title}
              </h3>
              
              <p className="text-xs sm:text-sm text-slate-300 mt-1 line-clamp-2 leading-relaxed bg-[#0a1128]/60 p-2.5 rounded-xl border border-slate-800/80">
                {ticket.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-2">
                <span>Categora: <span className="text-slate-400 font-medium">{ticket.category}</span></span>
                <span></span>
                <span>Reportado por: <span className="text-slate-400 font-medium">{ticket.user}</span></span>
                <span></span>
                <span>Fecha: <span className="text-slate-400 font-medium">{ticket.date}</span></span>
              </div>
            </div>

            {/* Acciones del Administrador: Ver Foto, Editar, Cambiar Estado, Eliminar */}
            <div className="flex flex-wrap md:flex-col items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
              <div className="flex items-center gap-2">
                {ticket.image && (
                  <button
                    onClick={() => setViewingPhoto({ image: ticket.image, title: ticket.title, id: ticket.id })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-bold transition-all shadow-sm"
                    title="Ver evidencia fotogrfica de la incidencia"
                  >
                    <Camera className="w-3.5 h-3.5" /> Ver Foto
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(ticket)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-cyan-300 border border-blue-700/50 rounded-xl text-xs font-bold transition-all shadow-sm"
                  title="Editar datos de la incidencia (corregir errores)"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(ticket.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-800/50 rounded-xl text-xs font-bold transition-all shadow-sm"
                  title="Eliminar este ticket"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>

              {/* Botones de cambio rpido de estado */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleQuickStatus(ticket.id, 'En Progreso')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${ticket.status === 'En Progreso' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  Atendiendo
                </button>
                <button
                  onClick={() => handleQuickStatus(ticket.id, 'Resuelto')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${ticket.status === 'Resuelto' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-emerald-300'}`}
                >
                  <Check className="w-3 h-3" /> Resolver
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-sm font-medium">
            No hay incidencias registradas para la cuenta seleccionada.
          </div>
        )}
      </div>

      {/* Modal de Edicin para el Administrador */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  Editar Incidencia #{editingTicket.id}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Modifique cualquier dato ingresado errneamente por la sucursal.
                </p>
              </div>
              <button onClick={() => setEditingTicket(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Foto si existe en el ticket editado */}
              {editingTicket.image && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={editingTicket.image} alt="Evidencia" className="w-12 h-12 object-cover rounded-lg border border-slate-700" />
                    <div>
                      <span className="text-xs font-bold text-white block">Foto adjunta incluida</span>
                      <span className="text-[11px] text-slate-400">Evidencia proporcionada por el usuario</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingPhoto({ image: editingTicket.image, title: editingTicket.title, id: editingTicket.id })}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-1"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Ampliar
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Punto de Operacin / Cuenta *</label>
                <select
                  value={editFormData.zone}
                  onChange={(e) => setEditFormData({ ...editFormData, zone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  {BRANCH_NAMES.map(b => (
                    <option key={b} value={b} className="bg-slate-900">{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asunto Principal *</label>
                <input 
                  type="text" 
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Severidad *</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="Baja" className="bg-slate-900">Baja</option>
                    <option value="Media" className="bg-slate-900">Media</option>
                    <option value="Alta" className="bg-slate-900">Alta</option>
                    <option value="Crtica" className="bg-slate-900">Crtica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estado *</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="Abierto" className="bg-slate-900">Abierto (Pendiente)</option>
                    <option value="En Progreso" className="bg-slate-900">En Progreso (Atendiendo)</option>
                    <option value="Resuelto" className="bg-slate-900">Resuelto (Concluido)</option>
                    <option value="Archivado" className="bg-slate-900">Archivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Lnea de Servicio / Categora *</label>
                <input 
                  type="text" 
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bitcora de Observaciones / Descripcin *</label>
                <textarea 
                  rows="4"
                  required
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-y leading-relaxed"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-cyan-500/25"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lightbox para Visualizar Foto de la Incidencia */}
      {viewingPhoto && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-5xl max-h-[92vh] w-full bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a1128]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" /> Evidencia de #{viewingPhoto.id}: {viewingPhoto.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingPhoto.image}
                  download={`evidencia_${viewingPhoto.id}.jpg`}
                  className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar
                </a>
                <button 
                  onClick={() => setViewingPhoto(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center bg-black/70 overflow-auto max-h-[80vh]">
              <img src={viewingPhoto.image} alt="Evidencia completa" className="max-w-full max-h-[78vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
