import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketForm from './TicketForm';
import ClientPasswords from './ClientPasswords';
import { LogOut, Ticket, Lock, UserCircle, ChevronDown } from 'lucide-react';

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
      setClientName('Administrador');
    } else if (role === 'client' && clientUserStr) {
      try {
        const client = JSON.parse(clientUserStr);
        setClientName(client.name);
        setClientUser(client);
      } catch(e) {}
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Cerrar menú al hacer clic fuera
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
      navigate('/admin/tickets'); // If admin, just go back to admin
    } else {
      localStorage.removeItem('client_user');
      localStorage.removeItem('user_role');
      navigate('/');
    }
  };

  const hasPasswords = clientUser?.has_password_access || isAdmin;

  return (
    <div className="min-h-screen bg-[#0a1128] py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
        <div className="absolute top-40 -left-20 w-[500px] h-[500px] bg-cyan-500 rounded-full mix-blend-screen filter blur-[150px] opacity-15"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDB2NDBoNDBWMEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]"></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <header className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div 
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => setActiveView('tickets')}
          >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden p-0.5 shrink-0">
              <img src="/logo.jpg" alt="Vigilancia Digital" className="w-full h-full object-cover rounded-[14px]" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight">
                Vigilancia Digital
              </h1>
              <div className="flex items-center gap-2 mt-0.5 justify-center sm:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <p className="text-blue-300 text-xs sm:text-sm font-medium tracking-[0.15em] sm:tracking-[0.2em] uppercase">
                  Plataforma IT
                </p>
              </div>
            </div>
          </div>
          
          {/* Menú de Perfil */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 p-2 pr-4 bg-[#0f172a]/80 hover:bg-[#0f172a] border border-slate-700/50 rounded-full transition-all shadow-lg backdrop-blur-md"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center border border-cyan-400/30 shadow-inner">
                <UserCircle className="w-6 h-6 text-white opacity-80" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conectado como</div>
                <div className="text-sm font-bold text-white truncate max-w-[120px]">{clientName}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-800 sm:hidden">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conectado como</div>
                  <div className="text-sm font-bold text-white truncate">{clientName}</div>
                </div>
                
                <div className="p-2">
                  <button 
                    onClick={() => {
                      setActiveView('tickets');
                      setIsProfileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeView === 'tickets' ? 'bg-cyan-900/30 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Ticket className="w-4 h-4" /> Nuevo Ticket
                  </button>
                  
                  {hasPasswords && (
                    <button 
                      onClick={() => {
                        setActiveView('passwords');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeView === 'passwords' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <Lock className="w-4 h-4" /> Mis Contraseñas
                    </button>
                  )}
                </div>

                <div className="p-2 border-t border-slate-800 bg-[#0a1128]/50">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    {isAdmin ? 'Volver al Admin' : 'Cerrar Sesión'}
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main>
          {activeView === 'tickets' ? (
            <TicketForm />
          ) : (
            <ClientPasswords user={clientUser} />
          )}
        </main>
      </div>
    </div>
  );
}

export default AppClient;
