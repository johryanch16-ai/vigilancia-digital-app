import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Monitor, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  X, 
  ShieldCheck, 
  Smartphone,
  ExternalLink,
  Download
} from 'lucide-react';
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  getBrowserPermission, 
  requestBrowserPermission, 
  testNotification,
  isNotificationUser,
  isRunningAsInstalledApp,
  isIosDevice,
  canInstallPwaApp,
  promptInstallPwaApp,
  syncServiceWorkerMonitor
} from '../lib/notifications';

export default function NotificationSettingsModal({ isOpen, onClose, currentUser }) {
  const isAuthorized = isNotificationUser(currentUser);
  
  const [settings, setSettings] = useState(() => getNotificationSettings(currentUser));
  const [browserPermission, setBrowserPermission] = useState(getBrowserPermission());
  const [isInstalledApp, setIsInstalledApp] = useState(() => isRunningAsInstalledApp());
  const [canInstallApp, setCanInstallApp] = useState(() => canInstallPwaApp());
  const [testStatus, setTestStatus] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getNotificationSettings(currentUser);
      setSettings(current);
      setBrowserPermission(getBrowserPermission());
      setIsInstalledApp(isRunningAsInstalledApp());
      setCanInstallApp(canInstallPwaApp());
      setTestStatus(null);
      setSaveSuccess(false);
      syncServiceWorkerMonitor(currentUser);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveNotificationSettings(currentUser, next);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserPermission();
    setBrowserPermission(res);
    if (res === 'granted') {
      const next = { ...settings, desktop: true, enabled: true };
      setSettings(next);
      saveNotificationSettings(currentUser, next);
    }
  };

  const handleTest = async () => {
    setTestStatus('probando');
    try {
      const res = await testNotification(currentUser);
      setBrowserPermission(getBrowserPermission());
      if (res.success && res.notificationSent) {
        setTestStatus('ok');
      } else if (res.success && !res.notificationSent) {
        setTestStatus('audio_only');
      } else {
        setTestStatus('error');
      }
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>Avisos de Nuevos Tickets</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Exclusivo
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Configuración en tiempo real para administradores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Target User Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Usuario activo:</span>
              <strong className="text-white font-mono uppercase bg-slate-700/50 px-2 py-0.5 rounded text-cyan-300">
                {currentUser || 'Desconocido'}
              </strong>
            </div>
            <div className="text-[11px] text-slate-400">
              {isAuthorized ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Habilitado
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> No Autorizado
                </span>
              )}
            </div>
          </div>

          {!isAuthorized ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                Acceso Restringido
              </div>
              <p>
                Las alertas acústicas y de escritorio por creación de tickets están reservadas estrictamente para los supervisores generales (<strong>Johnny</strong> y <strong>Johryan</strong>).
              </p>
            </div>
          ) : (
            <>
              {/* Master Switch */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/90 to-slate-800/50 border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Activar Notificaciones de Tickets
                    {settings.enabled && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Recibir aviso sonoro y visual cada vez que se cree un nuevo reporte
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('enabled')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Individual Channels */}
              <div className={`space-y-3 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Canales de Alerta
                </div>

                {/* Sound Alert */}
                <div className="p-3.5 rounded-xl bg-slate-850 bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      {settings.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Sonido de Campana de Alerta</div>
                      <div className="text-[11px] text-slate-400">Emite un tono acústico inmediato al registrarse el ticket</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sound}
                    onChange={() => handleToggle('sound')}
                    className="w-4 h-4 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Desktop Push */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Notificación de Escritorio (Navegador)</div>
                      <div className="text-[11px] text-slate-400">
                        Aparece sobre otras ventanas aunque la pestaña esté en segundo plano
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.desktop}
                    onChange={() => handleToggle('desktop')}
                    className="w-4 h-4 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Floating In-App Toast */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Aviso Flotante en Pantalla</div>
                      <div className="text-[11px] text-slate-400">Banner destacado con sucursal y prioridad</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.floating}
                    onChange={() => handleToggle('floating')}
                    className="w-4 h-4 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Vibration (for mobile) */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Vibración Háptica (Celular)</div>
                      <div className="text-[11px] text-slate-400">Vibra el dispositivo móvil si es compatible</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.vibration}
                    onChange={() => handleToggle('vibration')}
                    className="w-4 h-4 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Browser / App Permission Box */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <div className="text-slate-300 font-medium">
                      {isInstalledApp ? 'Permiso en la App Instalada:' : 'Permiso en Dispositivo / Navegador:'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Estado: <span className={`font-bold ${browserPermission === 'granted' ? 'text-emerald-400' : browserPermission === 'denied' ? 'text-red-400' : 'text-amber-400'}`}>
                        {browserPermission === 'granted' ? 'Concedido (Listo en App y Navegador)' : browserPermission === 'denied' ? 'Bloqueado en ajustes' : 'Pendiente de autorizar'}
                      </span>
                    </div>
                  </div>
                  {browserPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Autorizar
                    </button>
                  )}
                </div>

                {/* Estado de Modo App Instalada (PWA) */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    Modo Aplicación (PWA):
                  </span>
                  {isInstalledApp ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> App Instalada Activa (1er y 2do plano)
                    </span>
                  ) : canInstallApp ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await promptInstallPwaApp();
                        setIsInstalledApp(isRunningAsInstalledApp());
                        setCanInstallApp(canInstallPwaApp());
                      }}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Instalar como App
                    </button>
                  ) : isIosDevice() ? (
                    <span className="text-cyan-300 font-medium text-right">
                      En iPhone: Toca <strong>Compartir → Agregar a inicio</strong>
                    </span>
                  ) : (
                    <span className="text-slate-300 font-semibold">
                      Compatible (Service Worker Activo)
                    </span>
                  )}
                </div>
              </div>

              {/* Test Button */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testStatus === 'probando'}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {testStatus === 'probando' ? 'Probando...' : 'Probar Notificación y Sonido Ahora'}
                </button>
              </div>

              {testStatus === 'ok' && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Notificación enviada a tu teléfono/pantalla y sonido reproducido con éxito!</span>
                </div>
              )}

              {testStatus === 'audio_only' && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Sonó la alerta, pero para que aparezca el mensaje escrito en tu teléfono debes tocar <strong>Autorizar</strong> arriba o habilitar las notificaciones del sitio en el candado del navegador.</span>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>No se pudo emitir la alerta. Revisa los permisos del navegador.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {saveSuccess && <span className="text-emerald-400 font-semibold">Configuración guardada</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
