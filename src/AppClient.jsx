import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketForm from './TicketForm';
import ClientPasswords from './ClientPasswords';
import { LogOut, RefreshCw, Ticket, Lock, UserCircle, ChevronDown, Building2, CheckCircle2, Clock, AlertCircle, ListOrdered, X, Camera, Download, Maximize2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { subscribeToTickets, getLocalTickets, deduplicateTickets, syncPendingLocalTickets, resendTicketToSupabase, resendAllPendingTickets } from './lib/ticketStorage';
import { playSuccessChime } from './lib/notificationAudio';
import Logo from './components/Logo';

function AppClient() {
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState(null);
  const [clientName, setClientName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState('tickets'); // 'tickets', 'my_tickets', 'passwords'
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [resolvedNotice, setResolvedNotice] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [clientLightboxPhoto, setClientLightboxPhoto] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendSuccessId, setResendSuccessId] = useState(null);
  const [resendingAll, setResendingAll] = useState(false);
  const [resendNotice, setResendNotice] = useState(null);

  const handleResendSingle = async (ticketId) => {
    setResendingId(ticketId);
    setResendNotice(null);
    const result = await resendTicketToSupabase(ticketId);
    setResendingId(null);
    if (result.success) {
      setResendSuccessId(ticketId);
      setResendNotice('✅ ¡Ticket reenviado exitosamente a Johryan y Johnny!');
      loadMyTickets();
      setTimeout(() => setResendSuccessId(null), 4000);
      setTimeout(() => setResendNotice(null), 5000);
    } else {
      setResendNotice('⚠️ Error al reenviar: ' + (result.message || 'Verifique la conexión'));
    }
  };

  const handleResendAll = async () => {
    const branchName = clientUser?.branch || clientUser?.name || '';
    setResendingAll(true);
    setResendNotice(null);
    const result = await resendAllPendingTickets(branchName);
    setResendingAll(false);
    loadMyTickets();
    if (result.success) {
      setResendNotice(`✅ ¡Se reenviaron ${result.count} reporte(s) a Johryan y Johnny exitosamente!`);
      setTimeout(() => setResendNotice(null), 6000);
    } else {
      setResendNotice('⚠️ Error al reenviar reportes');
    }
  };

  
  const menuRef = useRef(null);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const adminUser = localStorage.getItem('admin_user');
    const clientUserStr = localStorage.getItem('client_user');
    
    if (role === 'admin' && adminUser) {
      setIsAdmin(true);
      setClientName(adminUser || 'Administrador');
      setClientUser({ name: adminUser, branch: 'Administración', role: 'admin' });
    } else if (role === 'client' && clientUserStr) {
      try {
        const client = JSON.parse(clientUserStr);
        setClientName(client.name || client.branch || 'Sucursal');
        setClientUser(client);
      } catch(e) {}
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Cargar todos los tickets combinando almacenamiento local y base de datos Supabase
  const [ticketFilterMode, setTicketFilterMode] = useState('all'); // 'all' o 'mine'
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [totalAllTickets, setTotalAllTickets] = useState(0);

  const loadMyTickets = async (forcedMode = null) => {
    const activeMode = forcedMode !== null ? forcedMode : ticketFilterMode;
    setIsLoadingTickets(true);
    
    // 1. Obtener del almacenamiento local
    const local = getLocalTickets();
    
    // 2. Obtener de Supabase para ver todos los reportes de todas las sucursales
    let remote = [];
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && Array.isArray(data)) {
        remote = data.map(t => ({
          id: t.id ? t.id.toString() : 'REMOTE-' + Math.random(),
          db_id: t.id,
          title: t.title || 'Incidencia',
          description: t.description || '',
          priority: t.priority || 'Media',
          status: t.status || 'Abierto',
          branch: t.reporter_name || 'Sucursal',
          reporter_name: t.reporter_name || 'Sucursal',
          user: t.reporter_name || 'Sucursal',
          zone: t.reporter_name || 'Sucursal',
          category: t.category_id || 'General',
          date: t.created_at ? new Date(t.created_at).toLocaleString() : 'Fecha no registrada',
          inDatabase: true
        }));
      }
    } catch (e) {}

    // Combinar y desduplicar estrictamente por contenido e ID
    const combined = deduplicateTickets([...local, ...remote]);

    setTotalAllTickets(combined.length);

    // Filtrar según la pestaña activa ('all' o 'mine')
    const branchName = (clientUser?.branch || clientUser?.name || '').toLowerCase();
    const isUserAdmin = isAdmin || clientUser?.role === 'admin' || ['johryan', 'johnny', 'administración'].includes(branchName);

    let result = combined;
    if (activeMode === 'mine' && !isUserAdmin && branchName) {
      result = combined.filter(t => 
        (t.branch && t.branch.toLowerCase().includes(branchName)) ||
        (t.user && t.user.toLowerCase().includes(branchName)) ||
        (t.zone && t.zone.toLowerCase().includes(branchName)) ||
        (t.reporter_name && t.reporter_name.toLowerCase().includes(branchName))
      );
    }

    setMyTickets(result);
    setIsLoadingTickets(false);
  };

  useEffect(() => {
    syncPendingLocalTickets();
    loadMyTickets();
  }, [clientUser]);

  // Escuchar notificaciones en tiempo real cuando un administrador resuelve el incidente
  useEffect(() => {
    if (!clientUser) return;

    const unsubscribe = subscribeToTickets(
      (newTicket) => {
        loadMyTickets();
      },
      (updatedId, newStatus, ticketObj) => {
        loadMyTickets();

        if (newStatus === 'Resuelto') {
          const userBranch = (clientUser.branch || clientUser.name || '').toLowerCase();
          const ticketBranch = ((ticketObj?.zone || ticketObj?.user || '')).toLowerCase();
          
          if (!ticketBranch || ticketBranch.includes(userBranch) || userBranch.includes(ticketBranch)) {
            playSuccessChime();

            setResolvedNotice({
              id: updatedId,
              title: ticketObj?.title || 'Reporte de incidencia'
            });

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification('Incidencia Solucionada', {
                body: `Tu reporte #${updatedId} ha sido resuelto por soporte.`,
                icon: '/logo.svg'
              });
            }
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [clientUser]);

  // Cerrar menu al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    if (isAdmin) {
      navigate('/admin/tickets');
    } else {
      localStorage.removeItem('client_user');
      localStorage.removeItem('user_role');
      navigate('/');
    }
  };

  const hasPasswords = clientUser?.has_password_access;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resuelto':
        return 'bg-emerald-950/60 text-emerald-400 border border-emerald-800';
      case 'En Progreso':
        return 'bg-blue-950/60 text-blue-400 border border-blue-800';
      default:
        return 'bg-orange-950/60 text-orange-400 border border-orange-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] text-white p-3 sm:p-6 lg:p-8 font-sans relative overflow-x-hidden">
      
      {/* Toast de Notificación cuando se Resuelve Incidencia */}
      {resolvedNotice && (
        <div className="fixed top-5 right-5 left-5 sm:left-auto sm:w-96 z-50 bg-[#0f172a] border-2 border-emerald-500/60 rounded-2xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-in slide-in-from-top-4 flex items-start gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <CheckCircle2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                ¡Incidencia Solucionada!
              </span>
              <button 
                onClick={() => setResolvedNotice(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-sm font-bold text-white mt-1 truncate">
              Ticket #{resolvedNotice.id}: <span className="font-normal text-slate-300">{resolvedNotice.title}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              El equipo de soporte técnico ha concluido este caso.
            </p>
          </div>
        </div>
      )}

      {/* Background decorations */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-20"></div>
        <div className="absolute top-40 -left-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-cyan-500 rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-15"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDB2NDBoNDBWMEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]"></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5">
          <div 
            className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:opacity-90 transition-opacity" 
            onClick={() => setActiveView('tickets')}
          >
            <Logo variant="sidebar" subtitle="Plataforma IT" />
          </div>
          
          {/* Menu de Perfil y Navegación */}
          <div className="relative w-full sm:w-auto flex items-center justify-end gap-2" ref={menuRef}>
            
            {/* Botón para alternar a Historial de mis tickets */}
            <button
              onClick={() => {
                loadMyTickets();
                setActiveView(activeView === 'my_tickets' ? 'tickets' : 'my_tickets');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                activeView === 'my_tickets' 
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md' 
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <ListOrdered className="w-4 h-4 text-cyan-400" />
              <span>Historial de Reportes ({totalAllTickets || myTickets.length})</span>
            </button>

            {/* Profile Dropdown */}
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 sm:p-2 sm:pr-4 bg-[#0f172a]/90 hover:bg-[#0f172a] border border-slate-700/60 rounded-xl transition-all shadow-lg backdrop-blur-md cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-inner shrink-0">
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cuenta Conectada</div>
                <div className="text-xs font-bold text-white truncate max-w-[120px]">
                  {clientName}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 shrink-0 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-800 bg-[#0a1128]/70">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cuenta Actual</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate">{clientName}</span>
                  </div>
                </div>
                
                <div className="p-2 space-y-1">
                  <button 
                    onClick={() => {
                      setActiveView('tickets');
                      setIsProfileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${activeView === 'tickets' ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Ticket className="w-4 h-4" /> Nuevo Ticket
                  </button>

                  <button 
                    onClick={() => {
                      loadMyTickets();
                      setActiveView('my_tickets');
                      setIsProfileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${activeView === 'my_tickets' ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <ListOrdered className="w-4 h-4" /> Mis Incidencias
                  </button>
                  
                  {hasPasswords && (
                    <button 
                      onClick={() => {
                        setActiveView('passwords');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${activeView === 'passwords' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <Lock className="w-4 h-4" /> Mis Contraseñas
                    </button>
                  )}
                </div>

                <div className="p-2 border-t border-slate-800 bg-[#0a1128]/50">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-red-400 hover:bg-red-900/20 transition-colors cursor-pointer"
                  >
                    <span>{isAdmin ? 'Volver al Admin' : 'Cerrar Sesión'}</span>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main>
          {activeView === 'tickets' ? (
            <TicketForm currentUser={clientUser} />
          ) : activeView === 'my_tickets' ? (
            <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/80 p-5 sm:p-7">
              {/* Encabezado y Acciones */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-cyan-400" />
                    <span>Todos los Reportes de Incidencias ({myTickets.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Visualice todos los reportes generados. Si algún ticket no aparece en soporte, use el botón <strong className="text-cyan-300">Reenviar</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Botón Refrescar */}
                  <button
                    type="button"
                    onClick={() => loadMyTickets()}
                    disabled={isLoadingTickets}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                    title="Actualizar lista desde Supabase"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? 'animate-spin text-cyan-400' : ''}`} />
                    <span className="hidden sm:inline">Refrescar</span>
                  </button>

                  {/* Botón Reenviar Todos */}
                  <button
                    type="button"
                    onClick={handleResendAll}
                    disabled={resendingAll}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    title="Reenviar todos los reportes pendientes a Johryan y Johnny"
                  >
                    <Ticket className={`w-4 h-4 ${resendingAll ? 'animate-pulse' : ''}`} />
                    <span>{resendingAll ? 'Reenviando a Soporte...' : 'Reenviar todos a Soporte'}</span>
                  </button>

                  {/* Botón Nueva Incidencia */}
                  <button
                    onClick={() => setActiveView('tickets')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    + Nueva Incidencia
                  </button>
                </div>
              </div>

              {/* Pestañas de Filtro si aplica */}
              <div className="flex items-center gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setTicketFilterMode('all');
                    loadMyTickets('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${ticketFilterMode === 'all' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  Todos los Reportes ({totalAllTickets || myTickets.length})
                </button>
                {!isAdmin && clientUser?.branch && (
                  <button
                    type="button"
                    onClick={() => {
                      setTicketFilterMode('mine');
                      loadMyTickets('mine');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${ticketFilterMode === 'mine' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    Solo {clientUser?.branch || clientUser?.name}
                  </button>
                )}
              </div>

              {resendNotice && (
                <div className="mb-4 p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 text-xs font-semibold flex items-center justify-between shadow-lg">
                  <span>{resendNotice}</span>
                  <button type="button" onClick={() => setResendNotice(null)} className="text-cyan-400 hover:text-white ml-2 text-sm font-bold">×</button>
                </div>
              )}

              {isLoadingTickets && myTickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span>Cargando reportes del sistema...</span>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
                  <p className="text-slate-400 text-sm font-medium">No hay reportes registrados actualmente.</p>
                  <p className="text-slate-500 text-xs mt-1">Los reportes creados por cualquier sucursal aparecerán aquí con su estado y botón de reenvío.</p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setActiveView('tickets')}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      + Crear Primer Ticket
                    </button>
                    <button
                      onClick={() => loadMyTickets()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                    >
                      🔄 Buscar de Nuevo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {myTickets.map(ticket => (
                    <div key={ticket.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-800/20 px-3 rounded-xl transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold text-xs sm:text-sm">#{ticket.displayId || ticket.id.substring(0, 8)}</span>
                          
                          {/* Sucursal / Reportante */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                            <Building2 className="w-3 h-3 text-cyan-400" />
                            {ticket.reporter_name || ticket.branch || ticket.user || 'Sucursal'}
                          </span>

                          {/* Estado de resolución */}
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${getStatusBadge(ticket.status)}`}>
                            {ticket.status}
                          </span>

                          {/* Estado en Base de Datos */}
                          {ticket.db_id || ticket.inDatabase ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> En Base de Datos
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded-md animate-pulse">
                              <Clock className="w-3 h-3" /> Pendiente de Envío
                            </span>
                          )}

                          {ticket.image && (
                            <button
                              type="button"
                              onClick={() => setClientLightboxPhoto(ticket.image)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-md hover:bg-cyan-900 transition-colors cursor-pointer"
                            >
                              <Camera className="w-3 h-3" /> Ver Foto
                            </button>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white">{ticket.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{ticket.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                          <span>{ticket.date}</span>
                          {ticket.category && <span>• {ticket.category}</span>}
                          {ticket.priority && (
                            <span>• Prioridad: <strong className="text-slate-400">{ticket.priority}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Botón Reenviar en vivo */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleResendSingle(ticket.id)}
                          disabled={resendingId === ticket.id}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-md ${
                            resendSuccessId === ticket.id
                              ? 'bg-emerald-600 text-white border border-emerald-500'
                              : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-700/80'
                          }`}
                          title="Reenviar este reporte a Johryan y Johnny en Supabase"
                        >
                          <Ticket className={`w-3.5 h-3.5 ${resendingId === ticket.id ? 'animate-spin' : ''}`} />
                          <span>
                            {resendingId === ticket.id 
                              ? 'Reenviando...' 
                              : resendSuccessId === ticket.id 
                                ? '¡Reenviado a Soporte!' 
                                : 'Reenviar a Soporte'}
                          </span>
                        </button>

                        {ticket.status === 'Resuelto' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-800">
                            <CheckCircle2 className="w-4 h-4" /> Solucionado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ClientPasswords user={clientUser} />
          )}
        </main>
      </div>

      {/* Lightbox para cliente */}
      {clientLightboxPhoto && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setClientLightboxPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a1128]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" /> Foto Adjunta de la Incidencia
              </span>
              <button 
                onClick={() => setClientLightboxPhoto(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/60 overflow-auto max-h-[75vh]">
              <img src={clientLightboxPhoto} alt="Evidencia completa" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AppClient;
