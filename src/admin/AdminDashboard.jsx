import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, MoreVertical, CheckCircle2, Clock, AlertCircle, X, MapPin, Tag, Calendar, User, MessageSquare, AlignLeft, Archive, Trash2, Shield, Key, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { decryptPassword } from '../lib/crypto';

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
  }, []);

  const fetchTickets = async () => {
    // In a real app we would join with zones, categories, equipos, etc.
    const { data, error } = await supabase
      .from('tickets')
      .select('*, zones(name), categories(name), equipos(name)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Map to frontend expected format
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
      default: return 'bg-slate-100 text-slate-300 font-bold';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Abierto': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'En Progreso': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Resuelto': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Archivado': return <Archive className="w-4 h-4 text-slate-400" />;
      default: return null;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'archived') return t.status === 'Archivado';
    
    // Si no estamos en archivados, ocultar siempre los archivados
    if (t.status === 'Archivado') return false;

    if (filter === 'open') return t.status === 'Abierto';
    if (filter === 'critical') return t.priority === 'Crítica';
    return true; // all
  });

  const handleDeleteTicket = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de enviar este ticket a la Bitácora (Archivo)?')) {
      const { error } = await supabase.from('tickets').update({ status: 'Archivado' }).eq('id', id);
      if (!error) {
        setTickets(tickets.map(t => t.id === id ? { ...t, status: 'Archivado' } : t));
        setToastMessage(`Ticket ${id.substring(0,8)} archivado.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  const handleOpenVault = async () => {
    if (!selectedTicket || !selectedTicket.user) return;
    
    setLoadingVault(true);
    setVaultError(null);
    setVaultPasswords(null);
    setVisiblePasswords({});

    try {
      // 1. Fetch user by name to check permissions
      const { data: users, error: userError } = await supabase
        .from('users_client')
        .select('*')
        .ilike('name', selectedTicket.user)
        .limit(1);

      if (userError) throw userError;
      
      if (!users || users.length === 0) {
        setVaultError("Cliente no encontrado en la base de datos.");
        setLoadingVault(false);
        return;
      }

      const client = users[0];

      if (!client.has_password_access) {
        setVaultError("Este cliente no tiene la Bóveda de Contraseñas habilitada.");
        setLoadingVault(false);
        return;
      }

      // 2. Fetch passwords
      const { data: passwords, error: passError } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('user_id', client.id)
        .order('created_at', { ascending: false });

      if (passError) throw passError;

      if (!passwords || passwords.length === 0) {
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
      console.error(error);
      setVaultError("Error al cargar la bóveda.");
    } finally {
      setLoadingVault(false);
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0a1128] border border-blue-500/30 text-white px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.3)] animate-in slide-in-from-top-10 flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Centro de Control de Tickets</h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">Gestión en tiempo real de las solicitudes de los clientes.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-[#0a1128] shadow-sm transition-colors">
            <Filter className="w-4 h-4" /> Filtros Avanzados
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === 'all' ? 'bg-[#0a1128] text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 border border-slate-700 hover:bg-[#0a1128]'}`}>
          Todos Activos
        </button>
        <button onClick={() => setFilter('open')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === 'open' ? 'bg-[#0a1128] text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 border border-slate-700 hover:bg-[#0a1128]'}`}>
          Abiertos
        </button>
        <button onClick={() => setFilter('critical')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === 'critical' ? 'bg-[#0a1128] text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 border border-slate-700 hover:bg-[#0a1128]'}`}>
          Críticos
        </button>
      </div>

      {/* Ticket Table */}
      <div className="bg-[#0f172a] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Ticket</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Zona / Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
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
                    <div className="font-bold text-white text-sm">TKT-{ticket.displayId}</div>
                    <div className="text-slate-400 text-sm mt-0.5 truncate max-w-[200px]">{ticket.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <span className="text-sm font-bold text-slate-300">{ticket.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-300">{ticket.zone}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{ticket.category}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-400 whitespace-nowrap">
                    {ticket.date.split(',')[0]}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => handleDeleteTicket(ticket.id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                      title="Eliminar (Mandar a Bitácora)"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                    No se encontraron tickets en esta vista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-800">
          {filteredTickets.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)}
              className="p-4 hover:bg-[#0a1128] transition-colors cursor-pointer flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-white text-sm">TKT-{ticket.displayId}</div>
                  <div className="text-slate-400 text-sm mt-1">{ticket.title}</div>
                </div>
                <button 
                  onClick={(e) => handleDeleteTicket(ticket.id, e)}
                  className="p-2 -mr-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold text-slate-300 bg-slate-100 flex items-center gap-1.5">
                  {getStatusIcon(ticket.status)}
                  {ticket.status}
                </span>
              </div>
              
              <div className="text-xs text-slate-400 flex justify-between items-center mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{ticket.zone}</span>
                </div>
                <div className="font-medium text-slate-400">
                  {ticket.date.split(',')[0]}
                </div>
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-medium">
              No se encontraron tickets en esta vista.
            </div>
          )}
        </div>
      </div>

      {/* Modal / Slide-over para Detalle de Ticket */}
      {selectedTicket && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden flex justify-end" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0a1128]/80 backdrop-blur-md transition-opacity" onClick={() => { setSelectedTicket(null); setVaultPasswords(null); setVaultError(null); }}></div>
          
          <div className="relative w-full max-w-2xl h-full bg-[#0a1128] border-l border-blue-500/20 shadow-[0_0_50px_rgba(37,99,235,0.15)] flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            {/* Glow decorativo de borde superior */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-blue-600"></div>

            {/* Header del Modal */}
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-start bg-[#0f172a]/5">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">{selectedTicket.id}</h2>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getPriorityBadge(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#0f172a]/10 text-slate-300 border border-white/10 flex items-center gap-1.5">
                    {getStatusIcon(selectedTicket.status)} {selectedTicket.status}
                  </span>
                </div>
                <p className="text-base font-medium text-slate-400">{selectedTicket.title}</p>
              </div>
              <button 
                onClick={() => { setSelectedTicket(null); setVaultPasswords(null); setVaultError(null); }}
                className="bg-[#0f172a]/5 rounded-xl p-2.5 hover:bg-[#0f172a]/10 transition-colors text-slate-400 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              
              {/* Meta info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-[#0f172a]/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Punto Operativo</p>
                    <p className="text-sm text-slate-200 font-semibold">{selectedTicket.zone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-[#0f172a]/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><Tag className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Categoría</p>
                    <p className="text-sm text-slate-200 font-semibold">{selectedTicket.category}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-[#0f172a]/5 rounded-2xl border border-white/5 relative group">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><User className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Emisor</p>
                    <p className="text-sm text-slate-200 font-semibold truncate">{selectedTicket.user}</p>
                    <button
                      onClick={handleOpenVault}
                      disabled={loadingVault}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold rounded-lg hover:from-blue-500 hover:to-cyan-500 shadow-md transition-all"
                    >
                      <Key className="w-3.5 h-3.5" />
                      {loadingVault ? 'Verificando...' : 'Ver Bóveda'}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-[#0f172a]/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Calendar className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Timestamp</p>
                    <p className="text-sm text-slate-200 font-semibold">{selectedTicket.date}</p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-slate-400" /> Registro del Incidente
                </h3>
                <div className="bg-[#0f172a]/5 p-6 rounded-2xl border border-white/5 text-sm text-slate-300 leading-relaxed font-mono">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Bóveda (Renderizado Condicional) */}
              {(vaultPasswords || vaultError) && (
                <div className="mb-8 p-6 rounded-2xl border border-blue-500/30 bg-blue-900/10 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-[0.1em] flex items-center gap-2">
                      <Key className="w-5 h-5" /> Bóveda de: {selectedTicket.user}
                    </h3>
                    <button 
                      onClick={() => { setVaultPasswords(null); setVaultError(null); }}
                      className="p-1 hover:bg-blue-900/40 rounded-lg text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {vaultError && (
                    <div className="p-4 bg-red-900/20 border border-red-500/20 text-red-400 text-sm rounded-xl">
                      {vaultError}
                    </div>
                  )}

                  {vaultPasswords && vaultPasswords.length === 0 && (
                    <div className="p-4 bg-[#0a1128] border border-white/5 text-slate-400 text-sm rounded-xl text-center">
                      El cliente tiene habilitada la Bóveda pero no ha guardado ninguna contraseña aún.
                    </div>
                  )}

                  {vaultPasswords && vaultPasswords.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vaultPasswords.map(p => (
                        <div key={p.id} className="p-4 bg-[#0a1128] border border-blue-500/20 rounded-xl relative group">
                          <h4 className="text-sm font-bold text-white mb-2">{p.service_name}</h4>
                          {p.email && (
                            <div className="text-xs text-slate-400 mb-1 flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-blue-400" /> {p.email}
                            </div>
                          )}
                          <div className="flex gap-2 items-center mt-3">
                            <div className="flex-1 px-3 py-2 bg-[#0f172a] rounded-lg border border-slate-700 text-sm font-mono text-cyan-400">
                              {visiblePasswords[p.id] ? p.decrypted : '••••••••••••'}
                            </div>
                            <button
                              onClick={() => togglePasswordVisibility(p.id)}
                              className="p-2 text-slate-400 hover:text-white bg-[#0f172a] border border-slate-700 rounded-lg"
                            >
                              {visiblePasswords[p.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Historial / Chat */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" /> Bitácora de Soporte
                </h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-gradient-to-b before:from-blue-500/50 before:via-white/10 before:to-transparent">
                  
                  {/* Nota 1 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0a1128] border border-blue-500 text-blue-400 font-bold text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      S1
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-[#0f172a]/5 p-5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">Ingeniería Nivel 1</span>
                        <span className="text-xs font-medium text-slate-400">Hace 2 min</span>
                      </div>
                      <p className="text-sm text-slate-400">Análisis inicial completado. Dispositivo fuera de red. Escalamiento a cuadrilla en sitio en proceso.</p>
                    </div>
                  </div>

                  {/* Nueva Nota Input */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group mt-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0a1128] border border-white/10 text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      +
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-[#0f172a]/5 p-2 rounded-2xl border border-white/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all flex items-center">
                      <input type="text" placeholder="Añadir nota cifrada a la bitácora..." className="w-full px-3 py-2 text-sm outline-none bg-transparent text-slate-200 placeholder-slate-500" />
                      <button className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
            
            {/* Footer Actions */}
            <div className="p-6 border-t border-white/5 bg-[#0f172a]/5 flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Estado Operativo</label>
                <select 
                  id="status-select"
                  defaultValue={selectedTicket.status}
                  className="w-full bg-[#0a1128] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="Abierto">🔴 Triage Pendiente (Abierto)</option>
                  <option value="En Progreso">🔵 Operación en Curso</option>
                  <option value="Resuelto">🟢 Misión Cumplida (Resolver)</option>
                </select>
              </div>
              <button 
                onClick={() => {
                  const newStatus = document.getElementById('status-select').value;
                  const cleanStatus = newStatus.replace(/🟢 |🔵 |🔴 |Triage Pendiente \(|\)|Operación en Curso|Misión Cumplida \(/g, '').replace('Resolver)', 'Resuelto').replace('Abierto)', 'Abierto').replace('En Curso', 'En Progreso').trim();
                  
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
