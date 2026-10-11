import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, MapPin, Tags, Settings, LogOut, Bell, Search, Menu, X, Monitor, Archive, Users, ExternalLink, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { subscribeToTickets } from '../lib/ticketStorage';
import { playNotificationSound } from '../lib/notificationAudio';
import Logo from '../components/Logo';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [latestAlert, setLatestAlert] = useState(null);

  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : '';

  // Verificación de seguridad
  useEffect(() => {
    if (!adminUser || localStorage.getItem('user_role') !== 'admin') {
      navigate('/');
    }
  }, [navigate, adminUser]);

  // Solicitar permiso de notificaciones de escritorio
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Escuchar tickets en tiempo real (Vía BroadcastChannel, eventos locales y Supabase)
  useEffect(() => {
    const unsubscribe = subscribeToTickets((newTicket) => {
      setNotifications(prev => prev + 1);
      playNotificationSound();

      const branchName = newTicket.zone || newTicket.user || 'Sucursal';
      setLatestAlert({
        id: newTicket.id,
        branch: branchName,
        title: newTicket.title,
        priority: newTicket.priority
      });

      setTimeout(() => {
        setLatestAlert(prev => (prev?.id === newTicket.id ? null : prev));
      }, 7000);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`🚨 Incidencia en ${branchName}`, {
          body: `Asunto: ${newTicket.title}\nSeveridad: ${newTicket.priority || 'Media'}`,
          icon: '/logo.svg'
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const navigation = [
    { name: 'Dashboard', to: '/admin/tickets', icon: LayoutDashboard },
    { name: 'Tickets por Sucursal', to: '/admin/branch-tickets', icon: Building2 },
    { name: 'Bitácora y Concluidos', to: '/admin/bitacora', icon: Archive },
    { name: 'Usuarios Sucursales', to: '/admin/users', icon: Users },
    { name: 'Equipos', to: '/admin/equipos', icon: Monitor },
    { name: 'Zonas y Sucursales', to: '/admin/zones', icon: MapPin },
    { name: 'Categorías', to: '/admin/categories', icon: Tags },
    { name: 'Configuración', to: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a1128] flex flex-col md:flex-row font-sans">
      
      {/* Toast Alert Flotante para Johryan y Johnny */}
      {latestAlert && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#0f172a] border-2 border-red-500/60 rounded-2xl p-4 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-in slide-in-from-top-4 flex items-start gap-3 text-white">
          <div className="p-2 bg-red-500/20 text-red-400 rounded-xl shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-800">
                ¡Nueva Incidencia!
              </span>
              <button 
                onClick={() => setLatestAlert(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-sm font-bold text-white mt-1 truncate">
              {latestAlert.branch}: <span className="font-normal text-slate-200">{latestAlert.title}</span>
            </h4>
            <div className="flex items-center gap-2 mt-2">
              <button 
                onClick={() => {
                  setLatestAlert(null);
                  navigate('/admin/tickets');
                }}
                className="text-xs font-bold px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Ver en Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        
        {/* Header con Logo Profesional Vectorial */}
        <div className="h-20 flex items-center px-5 border-b border-slate-800">
          <Logo variant="sidebar" subtitle="S.A." />
        </div>

        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-2 flex-1 px-4 space-y-1.5">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex-shrink-0 border-t border-slate-800 p-4 space-y-3 bg-[#0a1128]/50">
          <button 
            onClick={() => navigate('/cliente')} 
            className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-xl transition-all text-sm font-medium cursor-pointer"
          >
            <div className="flex items-center">
              <ExternalLink className="h-4 w-4 mr-2.5 text-cyan-400" />
              <span>Ver Formulario Ticket</span>
            </div>
          </button>
          
          <button 
            onClick={() => {
              localStorage.removeItem('admin_user');
              localStorage.removeItem('user_role');
              navigate('/');
            }} 
            className="w-full flex items-center px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-xl transition-all text-sm font-medium cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <header className="bg-[#0f172a]/95 backdrop-blur-md shadow-sm border-b border-slate-800 z-20 shrink-0">
          <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
            
            {/* Left: Hamburger & Brand / Title */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none cursor-pointer"
                aria-label="Abrir Menú"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="md:hidden">
                <Logo variant="sidebar" className="scale-90 origin-left" subtitle="S.A." />
              </div>
            </div>

            {/* Right: Notifications & Current Admin */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={() => setNotifications(0)}
                title={notifications > 0 ? `${notifications} incidencias nuevas (clic para limpiar)` : 'Sin notificaciones pendientes'}
                className="relative bg-slate-800/80 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-[#0f172a] animate-bounce">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Admin Badge */}
              <div className="flex items-center gap-2.5 px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                  {adminUser ? adminUser.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-black">Administrador</div>
                  <div className="text-xs font-bold text-white leading-tight">{adminUser || 'Admin'}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 flex z-50 md:hidden" role="dialog" aria-modal="true">
            <div 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-[#0f172a] border-r border-slate-800 z-10 shadow-2xl">
              <div className="flex items-center justify-between px-5 mb-5 pb-4 border-b border-slate-800">
                <Logo variant="sidebar" subtitle="Panel Control" />
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center px-3.5 py-3 text-sm font-medium rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-md'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                ))}
              </div>

              <div className="border-t border-slate-800 p-4 space-y-2 bg-[#0a1128]">
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/cliente');
                  }} 
                  className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4 mr-3 text-cyan-400" /> Formulario Incidencias
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('admin_user');
                    localStorage.removeItem('user_role');
                    navigate('/');
                  }} 
                  className="w-full flex items-center px-3 py-2.5 text-sm font-bold text-red-400 hover:bg-red-950/20 rounded-xl cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-3" /> Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-routes Content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
