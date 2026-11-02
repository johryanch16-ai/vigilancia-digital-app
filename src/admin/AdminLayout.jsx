import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Tags,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Archive,
  Users,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  Download,
  QrCode
} from 'lucide-react';
import { subscribeToTickets, syncPendingLocalTickets } from '../lib/ticketStorage';
import Logo from '../components/Logo';
import {
  isNotificationUser,
  getNotificationSettings,
  saveNotificationSettings,
  getBrowserPermission,
  requestBrowserPermission,
  triggerTicketAlert,
  testNotification,
  ensureServiceWorkerRegistration,
  syncServiceWorkerMonitor,
  clearInstalledAppBadge,
  isRunningAsInstalledApp,
  canInstallPwaApp,
  promptInstallPwaApp
} from '../lib/notifications';
import NotificationSettingsModal from '../components/NotificationSettingsModal';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [latestAlert, setLatestAlert] = useState(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [canInstallApp, setCanInstallApp] = useState(() => canInstallPwaApp());
  const [isInstalledApp, setIsInstalledApp] = useState(() => isRunningAsInstalledApp());

  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : '';
  const isAuthorizedAdmin = isNotificationUser(adminUser);
  const [notifSettings, setNotifSettings] = useState(() => getNotificationSettings(adminUser));
  const [browserPermission, setBrowserPermission] = useState(() => getBrowserPermission());

  // Verificación de seguridad e inicialización de Service Worker para App instalada
  useEffect(() => {
    if (!adminUser || localStorage.getItem('user_role') !== 'admin') {
      navigate('/');
      return;
    }
    ensureServiceWorkerRegistration().then(() => {
      syncServiceWorkerMonitor(adminUser);
    });
    syncPendingLocalTickets();
  }, [navigate, adminUser]);

  // Actualizar configuración y estado de instalación de App cuando cambie
  useEffect(() => {
    const refreshConfig = () => {
      setNotifSettings(getNotificationSettings(adminUser));
      setBrowserPermission(getBrowserPermission());
      setCanInstallApp(canInstallPwaApp());
      setIsInstalledApp(isRunningAsInstalledApp());
      syncServiceWorkerMonitor(adminUser);
    };
    refreshConfig();
    window.addEventListener('vigilancia:notif_settings_changed', refreshConfig);
    window.addEventListener('vigilancia:pwa_install_available', refreshConfig);
    window.addEventListener('vigilancia:pwa_installed', refreshConfig);
    window.addEventListener('focus', refreshConfig);
    return () => {
      window.removeEventListener('vigilancia:notif_settings_changed', refreshConfig);
      window.removeEventListener('vigilancia:pwa_install_available', refreshConfig);
      window.removeEventListener('vigilancia:pwa_installed', refreshConfig);
      window.removeEventListener('focus', refreshConfig);
    };
  }, [adminUser, isNotifModalOpen]);

  // Escuchar tickets en tiempo real (Vía motor centralizado: Supabase Realtime, Polling 3s, BroadcastChannel)
  useEffect(() => {
    const unsubscribe = subscribeToTickets((newTicket) => {
      setNotifications(prev => prev + 1);

      // Solo para Johnny y Johryan con alertas activadas
      if (isAuthorizedAdmin) {
        triggerTicketAlert(newTicket, adminUser);

        const currentSettings = getNotificationSettings(adminUser);
        if (currentSettings.enabled && currentSettings.floating) {
          const branchName = newTicket.zone || newTicket.branch || newTicket.reporter_name || newTicket.user || 'Sucursal';
          setLatestAlert({
            id: newTicket.id,
            branch: branchName,
            title: newTicket.title,
            priority: newTicket.priority
          });

          setTimeout(() => {
            setLatestAlert(prev => (prev?.id === newTicket.id ? null : prev));
          }, 10000);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [adminUser, isAuthorizedAdmin]);

  const handleQuickEnablePhoneNotifications = async () => {
    const perm = await requestBrowserPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      const updated = {
        ...getNotificationSettings(adminUser),
        enabled: true,
        sound: true,
        desktop: true,
        floating: true,
        vibration: true
      };
      saveNotificationSettings(adminUser, updated);
      setNotifSettings(updated);
      await testNotification(adminUser);
    } else {
      setIsNotifModalOpen(true);
    }
  };

  const isFullyActive = notifSettings.enabled && browserPermission === 'granted';

  const navigation = [
    { name: 'Incidencias', to: '/admin/tickets', icon: ShieldAlert },
    { name: 'Sucursales', to: '/admin/branches', icon: Building2 },
    { name: 'Equipos y QR', to: '/admin/equipos', icon: QrCode },
    { name: 'Sistemas', to: '/admin/categories', icon: Tags },
    { name: 'Zonas / Ubicaciones', to: '/admin/zones', icon: MapPin },
    { name: 'Usuarios', to: '/admin/users', icon: Users },
    { name: 'Histórico', to: '/admin/history', icon: Archive },
    { name: 'Configuración', to: '/admin/settings', icon: Settings },
  ];

  const mobileBottomTabs = [
    { name: 'Incidencias', to: '/admin/tickets', icon: ShieldAlert },
    { name: 'Sucursales', to: '/admin/branches', icon: Building2 },
    { name: 'Equipos QR', to: '/admin/equipos', icon: QrCode },
    { name: 'Histórico', to: '/admin/history', icon: Archive },
  ];

  return (
    <div className="flex h-[100dvh] bg-[#070d19] font-sans text-slate-100 overflow-hidden safe-top">

      {/* Floating In-App Banner for new ticket alerts */}
      {latestAlert && (
        <div
          onClick={() => {
            navigate('/admin/tickets');
            setLatestAlert(null);
          }}
          className="fixed top-16 right-3 left-3 sm:left-auto sm:right-6 z-50 sm:max-w-sm p-3.5 sm:p-4 rounded-2xl bg-[#0f172a]/95 border-2 border-cyan-500/80 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md cursor-pointer animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 truncate">
                🚨 Nuevo Ticket: {latestAlert.branch}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLatestAlert(null);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-1.5 text-sm font-semibold text-slate-100 line-clamp-1">
            {latestAlert.title}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Prioridad: <strong className="text-amber-400 uppercase">{latestAlert.priority || 'Media'}</strong></span>
            <span className="text-cyan-300 underline font-medium">Ver incidencia &rarr;</span>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-[#0f172a] border-r border-slate-800 shrink-0">
        <div className="h-20 flex items-center px-5 border-b border-slate-800">
          <Logo variant="sidebar" subtitle="S.A." />
        </div>

        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-2 flex-1 px-4 space-y-1.5">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${isActive
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
          <div className="flex justify-between items-center h-14 sm:h-16 px-3 sm:px-6 lg:px-8 gap-2">

            {/* Left: Hamburger & Brand / Title */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 focus:outline-none cursor-pointer shrink-0"
                aria-label="Abrir Menú"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="md:hidden min-w-0">
                <Logo variant="sidebar" className="scale-90 origin-left" subtitle="S.A." />
              </div>
            </div>

            {/* Right: Notification Controls & Current Admin */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

              {/* Botón para Instalar como App (PWA) si el dispositivo lo soporta y aún no está instalada */}
              {canInstallApp && !isInstalledApp && (
                <button
                  type="button"
                  onClick={async () => {
                    await promptInstallPwaApp();
                    setCanInstallApp(canInstallPwaApp());
                    setIsInstalledApp(isRunningAsInstalledApp());
                  }}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md cursor-pointer transition-all active:scale-95"
                  title="Instalar Vigilancia Digital como Aplicación en este dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}

              {/* Botón de Activación / Configuración de Notificaciones (Johnny & Johryan) */}
              {isAuthorizedAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (browserPermission === 'default') {
                      handleQuickEnablePhoneNotifications();
                    } else {
                      setIsNotifModalOpen(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer border ${isFullyActive
                      ? 'bg-slate-800/90 border-cyan-500/40 text-cyan-300 hover:bg-slate-700/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-amber-950/60 border-amber-500/60 text-amber-300 hover:bg-amber-900/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                    }`}
                  title="Configurar y activar notificaciones de tickets en este dispositivo"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isFullyActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`}></span>
                  <span className="hidden sm:inline">
                    {isFullyActive ? 'Notificaciones Activas' : 'Activar Avisos en este Dispositivo'}
                  </span>
                  <span className="sm:hidden">
                    {isFullyActive ? 'Alertas ON' : 'Activar'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  clearInstalledAppBadge();
                  if (notifications > 0) {
                    setNotifications(0);
                    navigate('/admin/tickets');
                  } else if (isAuthorizedAdmin) {
                    setIsNotifModalOpen(true);
                  }
                }}
                title={notifications > 0 ? `${notifications} incidencias nuevas (clic para ver)` : 'Ajustes de alertas'}
                className="relative bg-slate-800/80 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700/60"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-[#0f172a] animate-bounce">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Admin Badge */}
              <div className="flex items-center gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-inner shrink-0">
                  {adminUser ? adminUser.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-black">Administrador</div>
                  <div className="text-xs font-bold text-white leading-tight">{adminUser || 'Admin'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso directo en móvil/navegador si aún falta autorizar el permiso del sistema en este teléfono */}
          {isAuthorizedAdmin && browserPermission !== 'granted' && (
            <div className="bg-gradient-to-r from-amber-950/90 via-cyan-950/90 to-blue-950/90 border-t border-amber-500/40 px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start sm:items-center gap-2 text-amber-200 font-medium">
                <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-snug">
                  {browserPermission === 'denied'
                    ? 'Permiso de notificaciones bloqueado. Actívalo en el icono del candado de la barra de dirección.'
                    : 'Para recibir avisos de nuevos tickets en tu celular, autoriza las notificaciones:'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {browserPermission === 'default' && (
                  <button
                    type="button"
                    onClick={handleQuickEnablePhoneNotifications}
                    className="flex-1 sm:flex-initial justify-center px-3 py-1.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black rounded-lg shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Permitir Ahora</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsNotifModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg border border-slate-600 cursor-pointer text-center"
                >
                  Probar
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Mobile Sidebar Overlay Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 flex z-50 md:hidden" role="dialog" aria-modal="true">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            <div className="relative flex-1 flex flex-col max-w-[280px] w-full pt-4 pb-4 bg-[#0f172a] border-r border-slate-800 z-10 shadow-2xl safe-top safe-bottom">
              <div className="flex items-center justify-between px-4 mb-4 pb-3 border-b border-slate-800">
                <Logo variant="sidebar" subtitle="Panel Control" />
                <button
                  type="button"
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
                    end={item.end}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center px-3.5 py-3 text-sm font-medium rounded-xl transition-all ${isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="mr-3 h-5 w-5 shrink-0" />
                    {item.name}
                  </NavLink>
                ))}
              </div>

              <div className="border-t border-slate-800 p-3.5 space-y-1.5 bg-[#0a1128]">
                {isAuthorizedAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsNotifModalOpen(true);
                    }}
                    className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-cyan-300 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    <Bell className="h-4 w-4 mr-3 text-cyan-400 shrink-0" /> Alertas de Tickets
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/cliente');
                  }}
                  className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4 mr-3 text-cyan-400 shrink-0" /> Formulario Incidencias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('admin_user');
                    localStorage.removeItem('user_role');
                    navigate('/');
                  }}
                  className="w-full flex items-center px-3 py-2.5 text-sm font-bold text-red-400 hover:bg-red-950/20 rounded-xl cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-3 shrink-0" /> Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-routes Content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Barra de Navegación Inferior Fija para Celulares (md:hidden) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800 px-2 pt-1.5 pb-safe flex items-center justify-around shadow-[0_-8px_25px_rgba(0,0,0,0.5)]">
          {mobileBottomTabs.map((tab) => {
            const isActive = location.pathname === tab.to || (tab.to === '/admin/tickets' && location.pathname === '/admin');
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[64px] ${
                  isActive
                    ? 'text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-cyan-500/15' : ''}`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{tab.name}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-white font-medium min-w-[64px] cursor-pointer"
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Más</span>
          </button>
        </nav>
      </div>

      {/* Modal de Configuración y Activación de Notificaciones */}
      <NotificationSettingsModal
        isOpen={isNotifModalOpen}
        onClose={() => {
          setIsNotifModalOpen(false);
          setNotifSettings(getNotificationSettings(adminUser));
          setBrowserPermission(getBrowserPermission());
        }}
        currentUser={adminUser}
      />
    </div>
  );
}
