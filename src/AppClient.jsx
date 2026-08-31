import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketForm from './TicketForm';
import ClientPasswords from './ClientPasswords';
import { Shield, Cctv, LogOut, ArrowLeft, Ticket, Lock } from 'lucide-react';

function AppClient() {
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState(null);
  const [clientName, setClientName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const adminUser = localStorage.getItem('admin_user');
    const clientUserStr = localStorage.getItem('client_user');
    
    if (role === 'admin' && adminUser) {
      setIsAdmin(true);
      setClientName('Administrador');
      // Admin might want to test the UI, but doesn't have an ID for passwords
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
        <header className="mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden p-0.5 shrink-0">
              <img src="/logo.jpg" alt="Vigilancia Digital" className="w-full h-full object-cover rounded-[14px]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight">
                Vigilancia Digital S.A.
              </h1>
              <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <p className="text-blue-300 text-sm font-medium tracking-[0.2em] uppercase">
                  Plataforma de Operaciones IT
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center sm:items-end gap-2">
            <span className="text-slate-400 text-sm font-medium">Hola, <span className="text-cyan-400">{clientName}</span></span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-sm font-medium text-white transition-colors shadow-sm"
            >
              {isAdmin ? <ArrowLeft className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
              {isAdmin ? 'Volver al Admin' : 'Cerrar Sesión'}
            </button>
          </div>
        </header>

        {/* Navegación por pestañas (solo si tiene acceso a contraseñas) */}
        {hasPasswords && (
          <div className="flex justify-center sm:justify-start gap-2 mb-8 bg-[#0f172a]/80 p-1.5 rounded-xl border border-slate-700/50 w-fit mx-auto sm:mx-0 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'tickets' 
                  ? 'bg-cyan-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4" />
              Soporte / Tickets
            </button>
            <button
              onClick={() => setActiveTab('passwords')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'passwords' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Lock className="w-4 h-4" />
              Mis Contraseñas
            </button>
          </div>
        )}

        <main>
          {activeTab === 'tickets' ? (
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
