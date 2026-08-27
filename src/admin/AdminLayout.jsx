import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Tags, Settings, LogOut, Bell, Search, Menu, X, Monitor, Archive } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : '';

  // Verificación de seguridad
  useEffect(() => {
    if (!adminUser) {
      navigate('/acceso-privado-vd');
    }
  }, [navigate, adminUser]);

  // Escuchar eventos globales de SignalR emitidos desde el Dashboard
  useEffect(() => {
    const handleNewTicket = () => setNotifications(prev => prev + 1);
    window.addEventListener('signalr-new-ticket', handleNewTicket);
    return () => window.removeEventListener('signalr-new-ticket', handleNewTicket);
  }, []);

  let navigation = [
    { name: 'Dashboard', to: '/admin/tickets', icon: LayoutDashboard },
    { name: 'Equipos', to: '/admin/equipos', icon: Monitor },
    { name: 'Zonas y Sucursales', to: '/admin/zones', icon: MapPin },
    { name: 'Categorías', to: '/admin/categories', icon: Tags },
    { name: 'Configuración', to: '/admin/settings', icon: Settings },
  ];

  if (adminUser === 'Johryan') {
    navigation.push({ name: 'Bitácora Privada', to: '/admin/bitacora', icon: Archive, isDanger: true });
  }

  return (
    <div className="min-h-screen bg-[#0a1128] flex">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-slate-900 border-r border-slate-800">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
            <div>
              <h1 className="font-extrabold text-white tracking-tight leading-tight">Vigilancia<br/><span className="text-blue-400">Digital S.A.</span></h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-2 flex-1 px-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? (item.isDanger ? 'bg-red-900/50 text-red-400 border border-red-900' : 'bg-blue-600 text-white')
                      : (item.isDanger ? 'text-red-500 hover:bg-red-950/30 hover:text-red-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white')
                  }`
                }
              >
                <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${item.isDanger ? 'text-red-500' : ''}`} />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-slate-700 p-4">
          <button 
            onClick={() => {
              localStorage.removeItem('admin_user');
              navigate('/');
            }} 
            className="flex-shrink-0 w-full group block text-slate-400 hover:text-white"
          >
            <div className="flex items-center">
              <div>
                <LogOut className="inline-block h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Cerrar Sesión</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-[#0f172a] shadow-sm border-b border-slate-700 z-10">
          <div className="flex-1 flex justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex-1 flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-md text-slate-400 hover:text-slate-400 hover:bg-slate-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden md:flex ml-4 flex-1">
                <div className="relative w-full max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input type="text" placeholder="Buscar tickets, usuarios..." className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-lg leading-5 bg-[#0a1128] placeholder-slate-400 focus:outline-none focus:bg-[#0f172a] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all" />
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6 gap-4">
              <button className="relative bg-[#0f172a] p-1 rounded-full text-slate-400 hover:text-slate-400 focus:outline-none">
                <Bell className="h-6 w-6" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
              <div className="relative flex items-center gap-2">
                <img className="h-8 w-8 rounded-full border border-slate-700" src={`https://ui-avatars.com/api/?name=${adminUser || 'Admin'}&background=0D8ABC&color=fff`} alt="" />
                <span className="hidden sm:block text-sm font-medium text-slate-300">{adminUser || 'Admin Support'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 flex z-40 md:hidden" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-slate-600 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsMobileMenuOpen(false)}></div>

            <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-slate-900 border-r border-slate-800">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex-shrink-0 flex items-center px-4 gap-3 mb-5">
                <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                <div>
                  <h1 className="font-extrabold text-white tracking-tight leading-tight">Vigilancia<br/><span className="text-blue-400">Digital S.A.</span></h1>
                </div>
              </div>
              <div className="mt-5 flex-1 h-0 overflow-y-auto">
                <nav className="px-2 space-y-1">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center px-3 py-2.5 text-base font-medium rounded-lg transition-colors ${
                          isActive
                            ? (item.isDanger ? 'bg-red-900/50 text-red-400 border border-red-900' : 'bg-blue-600 text-white')
                            : (item.isDanger ? 'text-red-500 hover:bg-red-950/30 hover:text-red-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white')
                        }`
                      }
                    >
                      <item.icon className={`mr-4 flex-shrink-0 h-6 w-6 ${item.isDanger ? 'text-red-500' : ''}`} />
                      {item.name}
                    </NavLink>
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-slate-800 p-4">
                <button 
                  onClick={() => {
                    localStorage.removeItem('admin_user');
                    navigate('/');
                  }} 
                  className="flex-shrink-0 group block w-full text-left"
                >
                  <div className="flex items-center">
                    <div>
                      <img className="inline-block h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${adminUser || 'Admin'}&background=0D8ABC&color=fff`} alt="" />
                    </div>
                    <div className="ml-3">
                      <p className="text-base font-medium text-white">{adminUser || 'Admin'}</p>
                      <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 flex items-center gap-1 mt-0.5">
                        <LogOut className="h-4 w-4" /> Cerrar sesión
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="flex-shrink-0 w-14" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        )}

        {/* Contenido Principal (Renderiza las subrutas) */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
