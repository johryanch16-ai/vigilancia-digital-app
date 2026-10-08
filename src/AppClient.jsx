import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketForm from './TicketForm';
import ClientPasswords from './ClientPasswords';
import { LogOut, Ticket, Lock, UserCircle, ChevronDown, Building2 } from 'lucide-react';

function AppClient() {
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState(null);
  const [clientName, setClientName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState('tickets');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
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

  // Solo administradores o usuarios expresamente con acceso a contraseñas ven la bóveda
  const hasPasswords = (clientUser?.has_password_access && !clientUser?.branch) || isAdmin;

  return (
    <div className="min-h-screen bg-[#0a1128] py-4 sm:py-8 md:py-12 px-3 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-20"></div>
        <div className="absolute top-40 -left-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-cyan-500 rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-15"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDB2NDBoNDBWMEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]"></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5">
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
          
          {/* Menu de Perfil / Usuario */}
          <div className="relative w-full sm:w-auto flex justify-end" ref={menuRef}>
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 p-1.5 sm:p-2 sm:pr-4 bg-[#0f172a]/90 hover:bg-[#0f172a] border border-slate-700/60 rounded-xl sm:rounded-full transition-all shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center border border-cyan-400/30 shadow-inner shrink-0">
                  <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-90" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conectado como</div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[180px]">
                    {clientName || 'Usuario'}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-full sm:w-60 bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-800 bg-[#0a1128]/70">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sucursal / Usuario</div>
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${activeView === 'tickets' ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Ticket className="w-4 h-4" /> Nuevo Ticket de Incidencia
                  </button>
                  
                  {hasPasswords && (
                    <button 
                      onClick={() => {
                        setActiveView('passwords');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${activeView === 'passwords' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <Lock className="w-4 h-4" /> Mis Contraseñas
                    </button>
                  )}
                </div>

                <div className="p-2 border-t border-slate-800 bg-[#0a1128]/50">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-red-400 hover:bg-red-900/20 transition-colors"
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
          ) : (
            <ClientPasswords user={clientUser} />
          )}
        </main>
      </div>
    </div>
  );
}

export default AppClient;