import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  MapPin, 
  Tag, 
  Calendar, 
  User, 
  MessageSquare, 
  AlignLeft, 
  Archive, 
  Trash2, 
  Shield, 
  Key, 
  Eye, 
  EyeOff,
  Building2,
  RefreshCw,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { decryptPassword } from '../lib/crypto';
import { getLocalTickets, subscribeToTickets, updateLocalTicketStatus } from '../lib/ticketStorage';

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all'); // all, open, critical, archived
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : '';

  // Vault states
  const [vaultPasswords, setVaultPasswords] = useState(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultError, setVaultError] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    fetchTickets();

    // Suscribirse a nuevos tickets en tiempo real
    const unsubscribe = subscribeToTickets(
      (newTicket) => {
        setTickets(prev => {
          const exists = prev.some(t => t.id === newTicket.id);
          if (exists) return prev;
          return [newTicket, ...prev];
        });
        showToast(`🚨 Nuevo ticket recibido de: ${newTicket.zone || newTicket.user}`);
      },
      (updatedId, newStatus) => {
        setTickets(prev => prev.map(t => t.id === updatedId ? { ...t, status: newStatus } : t));
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTickets = async () => {
    // 1. Obtener tickets locales inmediatos
    const local = getLocalTickets();
    
    // 2. Intentar combinar con Supabase si está disponible
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, zones(name), categories(name), equipos(name)')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const mappedRemote = data.map(t => ({
          id: t.id ? t.id.toString() : 'TKT-' + Math.random().toString(36).substring(2, 6),
          displayId: (t.id || '').toString().substring(0, 8).toUpperCase(),
          title: t.title,
          description: t.description,
          status: t.status || 'Abierto',
          priority: t.priority || 'Media',
          zone: t.zones?.name || t.zone || 'Sucursal',
          category: t.categories?.name || t.category || 'General',
          equipo: t.equipos?.name || 'Ninguno',
          user: t.reporter_name || 'Sucursal',
          date: new Date(t.created_at || Date.now()).toLocaleString(),
          rawDate: t.created_at
        }));

        // Combinar sin duplicados
        const combined = [...local];
        mappedRemote.forEach(rem => {
          if (!combined.some(c => c.id === rem.id || c.title === rem.title && c.rawDate === rem.rawDate)) {
            combined.push(rem);
          }
        });
        setTickets(combined);
        return;
      }
    } catch (e) {
      console.warn('Conexión con Supabase no disponible. Usando tickets locales en tiempo real.');
    }

    setTickets(local);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Crítica':
      case 'Critica':
        return 'bg-red-950/40 text-red-400 border border-red-800 font-bold';
      case 'Alta':
        return 'bg-orange-950/40 text-orange-400 border border-orange-800 font-bold';
      case 'Media':
        return 'bg-blue-950/40 text-blue-400 border border-blue-800 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700 font-bold';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Crítica':
      case 'Critica':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'Alta':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'Media':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Abierto': return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'En Progreso': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'Resuelto': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'Archivado': return <Archive className="w-4 h-4 text-slate-400" />;
      default: return null;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'archived') return t.status === 'Archivado';
    if (t.status === 'Archivado') return false;
    if (filter === 'open') return t.status === 'Abierto';
    if (filter === 'critical') return t.priority === 'Crítica' || t.priority === 'Critica';
    return true;
  });

  const handleUpdateStatus = async (id, newStatus, e) => {
    if (e) e.stopPropagation();
    updateLocalTicketStatus(id, newStatus);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
    }
    try {
      await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
    } catch (err) {}
    showToast(`Estado de ticket actualizado a "${newStatus}"`);
  };

  const handleDeleteTicket = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Desea enviar este ticket al archivo?')) {
      handleUpdateStatus(id, 'Archivado');
    }
  };

  const handleOpenVault = async () => {
    if (!selectedTicket || !selectedTicket.user) return;
    setLoadingVault(true);
    setVaultError(null);
    setVaultPasswords(null);
    setVisiblePasswords({});

    try {
      const { data: users, error: userError } = await supabase
        .from('users_client')
        .select('*')
        .ilike('name', selectedTicket.user)
        .limit(1);

      if (userError || !users || users.length === 0) {
        setVaultError("Esta cuenta de sucursal opera únicamente en modo reporte de tickets.");
        setLoadingVault(false);
        return;
      }

      const client = users[0];
      if (!client.has_password_access) {
        setVaultError("Esta sucursal no tiene bóveda de contraseñas asignada.");
        setLoadingVault(false);
        return;
      }

      const { data: passwords, error: passError } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('user_id', client.id)
        .order('created_at', { ascending: false });

      if (passError || !passwords || passwords.length === 0) {
        setVaultPasswords([]);
      } else {
        const decrypted = passwords.map(p => {
          let plain = "Error de desencriptado";
          try {
            plain = decryptPassword(p.encrypted_password);
          } catch(e) {}
          return { ...p, decrypted: plain };
        });
        setVaultPasswords(decrypted);
      }
    } catch (error) {
      setVaultError("No fue posible consultar la bóveda en este momento.");
    } finally {
      setLoadingVault(false);
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto min-h-screen pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#0f172a] border border-cyan-500/40 text-white px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-in slide-in-from-top-6 flex items-center gap-3">
          <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-xs sm:text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Centro de Control de Incidencias
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
            Monitoreo en tiempo real para Administradores ({adminUser || 'Johryan & Johnny'}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTickets}
            className="flex items-center gap-2 px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:bg-[#0a1128] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Sincronizar
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide text-xs sm:text-sm">
        <button 
          onClick={() => setFilter('all')} 
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${filter === 'all' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:text-white'}`}
        >
          Todos ({tickets.filter(t => t.status !== 'Archivado').length})
        </button>
        <button 
          onClick={() => setFilter('open')} 
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${filter === 'open' ? 'bg-orange-600 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:text-white'}`}
        >
          Abiertos ({tickets.filter(t => t.status === 'Abierto').length})
        </button>
        <button 
          onClick={() => setFilter('critical')} 
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${filter === 'critical' ? 'bg-red-600 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:text-white'}`}
        >
          Críticos ({tickets.filter(t => (t.priority === 'Crítica' || t.priority === 'Critica') && t.status !== 'Archivado').length})
        </button>
      </div>

      {/* Listado de Tickets */}
      <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        
        {/* Vista Tabla Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]/70">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">ID / Incidencia</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Punto de Operación</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Severidad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
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
                    <div className="font-bold text-white text-sm">#{ticket.displayId || ticket.id}</div>
                    <div className="text-slate-300 text-sm mt-0.5 font-medium truncate max-w-[260px]">{ticket.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{ticket.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-400">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span>{ticket.zone || 'Sucursal'}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Por: {ticket.user}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <span className="text-sm font-bold text-slate-300">{ticket.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">
                    {ticket.date}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleUpdateStatus(ticket.id, ticket.status === 'Resuelto' ? 'Abierto' : 'Resuelto', e)}
                        className={`p-2 rounded-lg transition-colors ${ticket.status === 'Resuelto' ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'}`}
                        title="Marcar como Resuelto"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteTicket(ticket.id, e)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Archivar"
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
                    No hay incidencias registradas en este momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil / Tablet en Tarjetas */}
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
                    <span className="text-xs font-bold text-cyan-400 font-mono">#{ticket.displayId || ticket.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base mt-1 line-clamp-2">
                    {ticket.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={(e) => handleUpdateStatus(ticket.id, ticket.status === 'Resuelto' ? 'Abierto' : 'Resuelto', e)}
                    className={`p-2 rounded-xl transition-colors ${ticket.status === 'Resuelto' ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 hover:text-emerald-400 bg-slate-800/80'}`}
                    title="Cambiar estado"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{ticket.zone || 'Sucursal'}</span>
                  <span className="text-slate-500 font-normal">({ticket.user})</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(ticket.status)}
                  <span className="font-medium text-slate-300">{ticket.status}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex justify-between items-center">
                <span>{ticket.category}</span>
                <span>{ticket.date}</span>
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-medium text-sm">
              No hay incidencias registradas en este momento.
            </div>
          )}
        </div>
      </div>

      {/* Slide-over / Modal Detalle de Incidencia */}
      {selectedTicket && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
            onClick={() => { setSelectedTicket(null); setVaultPasswords(null); setVaultError(null); }}
          ></div>
          
          <div className="relative w-full max-w-xl h-full bg-[#0a1128] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            {/* Glow superior */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"></div>

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
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                    {getStatusIcon(selectedTicket.status)} {selectedTicket.status}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-300 line-clamp-2">
                  {selectedTicket.title}
                </h3>
              </div>
              <button 
                onClick={() => { setSelectedTicket(null); setVaultPasswords(null); setVaultError(null); }}
                className="bg-slate-800/80 rounded-xl p-2 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              
              {/* Botones de acción rápida sobre el estado */}
              <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Cambiar Estado de la Incidencia:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {['Abierto', 'En Progreso', 'Resuelto'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedTicket.id, st)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all ${selectedTicket.status === st ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Línea de Servicio</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{selectedTicket.category}</p>
                </div>

                <div className="p-3.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reportado Por</span>
                  </div>
                  <p className="text-sm font-bold text-slate-200">{selectedTicket.user}</p>
                </div>

                <div className="p-3.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registro</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-300">{selectedTicket.date}</p>
                </div>
              </div>

              {/* Bitácora de Observaciones */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-cyan-400" /> Detalle y Observaciones
                </h4>
                <div className="bg-[#0f172a] p-4 sm:p-5 rounded-xl border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedTicket.description}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0f172a] flex justify-between gap-3">
              <button
                onClick={(e) => {
                  handleDeleteTicket(selectedTicket.id, e);
                  setSelectedTicket(null);
                }}
                className="px-4 py-2.5 bg-red-950/40 border border-red-800 text-red-400 rounded-xl text-xs sm:text-sm font-bold hover:bg-red-900/40 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Archivar
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

    </div>
  );
}