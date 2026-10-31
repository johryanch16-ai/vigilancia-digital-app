import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Bell, 
  Shield, 
  Mail, 
  Volume2, 
  Monitor, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  getBrowserPermission, 
  requestBrowserPermission, 
  testNotification,
  isNotificationUser,
  NOTIFICATION_USERS
} from '../lib/notifications';

export default function AdminSettings() {
  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : '';
  const isAuthorized = isNotificationUser(adminUser);

  const [notifConfig, setNotifConfig] = useState(() => getNotificationSettings(adminUser));
  const [browserPermission, setBrowserPermission] = useState(getBrowserPermission());
  const [testStatus, setTestStatus] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setNotifConfig(getNotificationSettings(adminUser));
    setBrowserPermission(getBrowserPermission());
  }, [adminUser]);

  const handleToggle = (key) => {
    const next = { ...notifConfig, [key]: !notifConfig[key] };
    setNotifConfig(next);
    saveNotificationSettings(adminUser, next);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserPermission();
    setBrowserPermission(res);
    if (res === 'granted') {
      const next = { ...notifConfig, desktop: true, enabled: true };
      setNotifConfig(next);
      saveNotificationSettings(adminUser, next);
    }
  };

  const handleTest = async () => {
    setTestStatus('probando');
    try {
      const res = await testNotification(adminUser);
      if (res.success) {
        setTestStatus('ok');
      } else {
        setTestStatus('error');
      }
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus(null), 3500);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" /> Configuración Global
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Ajustes de alertas de tickets en tiempo real, notificaciones del sistema y parámetros de servicio.
        </p>
      </div>

      {/* TARJETA ESPECIAL: Avisos en Tiempo Real para Johnny y Johryan */}
      <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-cyan-500/30 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-900/30 via-cyan-900/20 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Avisos de Creación de Tickets</h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Johnny y Johryan
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Emisión de alertas acústicas y visuales en tiempo real cuando cualquier sucursal reporte una incidencia.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sesión actual:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
              {adminUser || 'Admin'}
            </span>
            {isAuthorized ? (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Habilitado
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> No Autorizado
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!isAuthorized ? (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300 text-sm">Avisos de tickets restringidos</p>
                <p className="mt-1">
                  Por directiva del sistema, las notificaciones acústicas y de escritorio inmediatas para nuevos tickets están configuradas únicamente para los supervisores <strong>Johnny</strong> y <strong>Johryan</strong>.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Interruptor Principal */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Activar Notificaciones de Nuevos Tickets
                    {notifConfig.enabled && (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Recibe aviso inmediato en este dispositivo cuando entre cualquier ticket al sistema.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('enabled')}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifConfig.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Canales */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${notifConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {/* Sonido */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Alerta Sonora Acústica</div>
                      <div className="text-[11px] text-slate-400">Tono de alerta al crearse una incidencia</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.sound}
                    onChange={() => handleToggle('sound')}
                    className="w-5 h-5 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Notificación de Escritorio */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Notificación de Escritorio</div>
                      <div className="text-[11px] text-slate-400">Pop-up del navegador en segundo plano</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.desktop}
                    onChange={() => handleToggle('desktop')}
                    className="w-5 h-5 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Aviso Flotante */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Banner Flotante en Pantalla</div>
                      <div className="text-[11px] text-slate-400">Aviso en la esquina superior con detalles</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.floating}
                    onChange={() => handleToggle('floating')}
                    className="w-5 h-5 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Vibración */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Vibración en Dispositivos Móviles</div>
                      <div className="text-[11px] text-slate-400">Vibración táctil si el celular lo soporta</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.vibration}
                    onChange={() => handleToggle('vibration')}
                    className="w-5 h-5 text-cyan-500 rounded bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Permisos de Navegador & Prueba */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs space-y-1">
                  <div className="text-slate-300 font-semibold">Permiso de Notificaciones en este Navegador:</div>
                  <div className="text-slate-400">
                    Estado actual: <span className={`font-bold ${browserPermission === 'granted' ? 'text-emerald-400' : browserPermission === 'denied' ? 'text-red-400' : 'text-amber-400'}`}>
                      {browserPermission === 'granted' ? 'Autorizado (Listo)' : browserPermission === 'denied' ? 'Bloqueado por el navegador' : 'Pendiente por autorizar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {browserPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Autorizar Permiso
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testStatus === 'probando'}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {testStatus === 'probando' ? 'Probando...' : 'Probar Notificación Ahora'}
                  </button>
                </div>
              </div>

              {testStatus === 'ok' && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Alerta emitida correctamente! El sonido y la notificación de prueba fueron ejecutados.</span>
                </div>
              )}

              {saveSuccess && (
                <div className="text-right text-xs text-emerald-400 font-semibold animate-in fade-in">
                  ✓ Configuración actualizada en tiempo real
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Otras Configuraciones de Sistema */}
      <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Canales Complementarios</h2>
            <p className="text-xs text-slate-400">Correos electrónicos e integraciones externas</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Alertas por Correo Electrónico</p>
              <p className="text-xs text-slate-400">Enviar un email cuando se cree un ticket Crítico o Alto.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div>
              <p className="text-sm font-bold text-white">Integración con WhatsApp (Próximamente)</p>
              <p className="text-xs text-slate-400">Notificar al cliente vía WhatsApp cuando su ticket sea Resuelto.</p>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed opacity-50">
              <input type="checkbox" disabled className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Seguridad y SLA */}
      <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Seguridad y SLA</h2>
            <p className="text-xs text-slate-400">Tiempos máximos de respuesta a incidencias</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Tiempo de Respuesta Objetivo (SLA Crítico)</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                defaultValue={15} 
                className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" 
              />
              <span className="text-sm text-slate-400 font-medium">Minutos</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex justify-end">
          <button 
            type="button"
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" /> Guardar Parámetros
          </button>
        </div>
      </div>
    </div>
  );
}
