import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketForm from './TicketForm';
import ClientPasswords from './ClientPasswords';
import { LogOut, Ticket, Lock, UserCircle, ChevronDown, Building2, CheckCircle2, Clock, AlertCircle, ListOrdered, X } from 'lucide-react';
import { subscribeToTickets, getLocalTickets } from './lib/ticketStorage';
import { playSuccessChime } from './lib/notificationAudio';

function AppClient() {
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState(null);
  const [clientName, setClientName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState('tickets'); // 'tickets', 'my_tickets', 'passwords'
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [resolvedNotice, setResolvedNotice] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  
  const menuRef = useRef(null);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const adminUser = localStorage.getItem('admin_user');
    const clientUserStr = localStorage.getItem('client_user');
    
    if (role === 'admin' && adminUser) {
      setIsAdmin(true);
      setClientName(adminUser || 'Administrador');
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

  // Cargar tickets de la sucursal actual
  const loadMyTickets = () => {
    if (!clientUser) return;
    const all = getLocalTickets();
    const filtered = all.filter(t => 
      (t.zone && t.zone.toLowerCase() === (clientUser.branch || clientUser.name || '').toLowerCase()) ||
      (t.user && t.user.toLowerCase() === (clientUser.name || clientUser.branch || '').toLowerCase()) ||
      (t.reporter_name && t.reporter_name.toLowerCase() === (clientUser.name || clientUser.branch || '').toLowerCase())
    );
    setMyTickets(filtered);
  };

  useEffect(() => {
    loadMyTickets();
  }, [clientUser]);

  // Escuchar notificaciones en tiempo real cuando un administrador resuelve el incidente
  useEffect(() => {
    if (!clientUser) return;

    const unsubscribe = subscribeToTickets(
      (newTicket) => {
        // Si la sucursal envió un ticket, refrescar lista
        loadMyTickets();
      },
      (updatedId, newStatus, ticketObj) => {
        loadMyTickets();

        // Notificar si la incidencia fue resuelta y pertenece a esta sucursal
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
              new Notification('✅ Incidencia Solucionada', {
                body: `Tu reporte #${updatedId} ha sido resuelto por soporte.`,
                icon: '/logo.jpg'
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const hasPasswords = (clientUser?.has_password_access && !clientUser?.branch) || isAdmin;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resuelto':
        return 'bg-emerald-950/60 text-emerald-400 border border-emerald-800';
      case 'En Progreso':
        return 'bg-blue-950/60 text-blue-400 border border-blue-800';
      case 'Archivado':
        return 'bg-slate-800 text-slate-400 border border-slate-700';
      default:
        return 'bg-orange-950/60 text-orange-400 border border-orange-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] py-4 sm:py-8 md:py-12 px-3 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Aviso Flotante de Incidencia Resuelta para la Sucursal */}
      {resolvedNotice && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#0f172a] border-2 border-emerald-500 rounded-2xl p-4 shadow-[0_0_35px_rgba(16,185,129,0.35)] animate-in slide-in-from-top-4 flex items-start gap-3 text-white">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <CheckCircle2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                ¡Incidencia Resuelta!
              </span>
              <button 
                onClick={() => setResolvedNotice(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">
              #{resolvedNotice.id}: <span className="font-normal text-slate-200">{resolvedNotice.title}</span>
            </h4>
            <p className="text-xs text-emerald-300/90 mt-1">
              El equipo de soporte técnico ha concluido y cerrado la atención de este caso.
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
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden p-0.5 shrink-0">
              <img src="/logo.jpg" alt="Vigilancia Digital" className="w-full h-full object-cover rounded-[14px]" />
            </div>
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight">
                Vigilancia Digital
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <p className="text-blue-300 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase">
                  Plataforma IT
                </p>
              </div>
            </div>
          </div>
          
          {/* Menu de Perfil y Navegación Sucursal */}
          <div className="relative w-full sm:w-auto flex items-center justify-end gap-2" ref={menuRef}>
            
            {/* Botón para alternar a Historial de mis tickets */}
            <button
              onClick={() => {
                loadMyTickets();
                setActiveView(activeView === 'my_tickets' ? 'tickets' : 'my_tickets');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${activeView === 'my_tickets' ? 'bg-cyan-600 text-white border-cyan-500 shadow-md' : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'}`}
            >
              <ListOrdered className="w-4 h-4 text-cyan-400" />
              <span>Mis Reportes ({myTickets.length})</span>
            </button>

            {/* Profile Dropdown */}
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 sm:p-2 sm:pr-4 bg-[#0f172a]/90 hover:bg-[#0f172a] border border-slate-700/60 rounded-xl transition-all shadow-lg backdrop-blur-md"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-inner shrink-0">
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sucursal</div>
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
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sucursal Conectada</div>
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
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${activeView === 'tickets' ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Ticket className="w-4 h-4" /> Nuevo Ticket
                  </button>

                  <button 
                    onClick={() => {
                      loadMyTickets();
                      setActiveView('my_tickets');
                      setIsProfileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${activeView === 'my_tickets' ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <ListOrdered className="w-4 h-4" /> Mis Incidencias
                  </button>
                  
                  {hasPasswords && (
                    <button 
                      onClick={() => {
                        setActiveView('passwords');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${activeView === 'passwords' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <Lock className="w-4 h-4" /> Mis Contraseñas
                    </button>
                  )}
                </div>

                <div className="p-2 border-t border-slate-800 bg-[#0a1128]/50">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-red-400 hover:bg-red-900/20 transition-colors"
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
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-cyan-400" />
                    Historial de Incidencias de {clientName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Consulte el estado en tiempo real de sus reportes despachados al equipo de soporte.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('tickets')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  + Nueva Incidencia
                </button>
              </div>

              {myTickets.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Esta sucursal aún no ha registrado incidencias.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {myTickets.map(ticket => (
                    <div key={ticket.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold text-xs sm:text-sm">#{ticket.id}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${getStatusBadge(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white mt-1">{ticket.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{ticket.description}</p>
                        <div className="text-[11px] text-slate-500 mt-1">{ticket.date} · {ticket.category}</div>
                      </div>

                      <div className="text-right shrink-0">
                        {ticket.status === 'Resuelto' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800">
                            <CheckCircle2 className="w-4 h-4" /> Solucionado
                          </span>
                        ) : ticket.status === 'En Progreso' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-800">
                            <Clock className="w-4 h-4" /> En Atención
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-950/40 px-3 py-1.5 rounded-xl border border-orange-800">
                            <AlertCircle className="w-4 h-4" /> Pendiente
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
    </div>
  );
}

export default AppClient;