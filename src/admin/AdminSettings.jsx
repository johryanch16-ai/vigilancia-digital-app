import React from 'react';
import { Settings, Save, Bell, Shield, Mail } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" /> Configuración Global
        </h1>
        <p className="mt-1 text-sm text-slate-500">Ajustes del sistema, notificaciones y parámetros de seguridad.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Bell className="w-5 h-5" /></div>
          <h2 className="text-lg font-bold text-slate-900">Notificaciones y Alertas</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Alertas por Correo Electrónico</p>
              <p className="text-xs text-slate-500">Enviar un email cuando se cree un ticket Crítico o Alto.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-900">Integración con WhatsApp (Próximamente)</p>
              <p className="text-xs text-slate-500">Notificar al cliente vía WhatsApp cuando su ticket sea Resuelto.</p>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed opacity-50">
              <input type="checkbox" disabled className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Shield className="w-5 h-5" /></div>
          <h2 className="text-lg font-bold text-slate-900">Seguridad y SLA</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tiempo de Respuesta Objetivo (SLA Crítico)</label>
            <div className="flex items-center gap-3">
              <input type="number" defaultValue={15} className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              <span className="text-sm text-slate-500 font-medium">Minutos</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Save className="w-4 h-4" /> Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
