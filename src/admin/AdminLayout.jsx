import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Tags, Settings, LogOut, Bell, Search, Menu, X, Monitor } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  // Escuchar eventos globales de SignalR emitidos desde el Dashboard
  useEffect(() => {
    const handleNewTicket = () => setNotifications(prev => prev + 1);
    window.addEventListener('signalr-new-ticket', handleNewTicket);
    return () => window.removeEventListener('signalr-new-ticket', handleNewTicket);
  }, []);

  const navigation = [
    { name: 'Dashboard', to: '/admin/tickets', icon: LayoutDashboard },
    { name: 'Equipos', to: '/admin/equipos', icon: Monitor },
    { name: 'Zonas y Sucursales', to: '/admin/zones', icon: MapPin },
    { name: 'Categorías', to: '/admin/categories', icon: Tags },
    { name: 'Configuración', to: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-slate-200 p-4">
          <button onClick={() => navigate('/admin/login')} className="flex-shrink-0 w-full group block text-slate-600 hover:text-slate-900">
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
        <header className="bg-white shadow-sm border-b border-slate-200 z-10">
          <div className="flex-1 flex justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex-1 flex items-center">
              <button className="md:hidden p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100">
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden md:flex ml-4 flex-1">
                <div className="relative w-full max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input type="text" placeholder="Buscar tickets, usuarios..." className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all" />
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6 gap-4">
              <button className="relative bg-white p-1 rounded-full text-slate-400 hover:text-slate-500 focus:outline-none">
                <Bell className="h-6 w-6" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
              <div className="relative flex items-center gap-2">
                <img className="h-8 w-8 rounded-full border border-slate-200" src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff" alt="" />
                <span className="hidden sm:block text-sm font-medium text-slate-700">Admin Support</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Principal (Renderiza las subrutas) */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
