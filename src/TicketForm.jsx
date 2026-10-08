import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Tags, 
  AlertTriangle, 
  Type, 
  AlignLeft, 
  Send, 
  X, 
  Cpu,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { BRANCH_NAMES } from './lib/branches';
import { createTicket } from './lib/ticketStorage';

const TicketForm = ({ currentUser }) => {
  // Inicializar sucursal automáticamente según el usuario conectado
  const defaultBranch = currentUser?.branch || currentUser?.name || '';

  const [formData, setFormData] = useState({
    branch: defaultBranch,
    category: '',
    priority: 'Media',
    title: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);

  useEffect(() => {
    if (currentUser?.branch) {
      setFormData(prev => ({ ...prev, branch: currentUser.branch }));
    }
  }, [currentUser]);

  const categories = [
    { id: 'camaras', name: 'Mantenimiento de Circuito Cerrado / Cámaras' },
    { id: 'software', name: 'Soporte de Software y ERP' },
    { id: 'redes', name: 'Redes, Enlaces e Infraestructura' },
    { id: 'hardware', name: 'Falla de Equipo / Hardware de Punto' },
    { id: 'acceso', name: 'Control de Acceso / Alarmas de Seguridad' },
    { id: 'otro', name: 'Otro Requerimiento Técnico Especial' },
  ];

  const priorities = [
    { id: 'Baja', label: 'Baja', color: 'bg-slate-800 text-slate-300 border-slate-600 ring-slate-400 hover:bg-slate-700/80' },
    { id: 'Media', label: 'Media', color: 'bg-blue-900/30 text-blue-400 border-blue-700 ring-blue-500 hover:bg-blue-900/50' },
    { id: 'Alta', label: 'Alta', color: 'bg-orange-900/30 text-orange-400 border-orange-700 ring-orange-500 hover:bg-orange-900/50' },
    { id: 'Crítica', label: 'Crítica', color: 'bg-red-900/30 text-red-400 border-red-700 ring-red-500 hover:bg-red-900/50' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      branch: defaultBranch,
      category: '',
      priority: 'Media',
      title: '',
      description: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch || !formData.category || !formData.title || !formData.description) {
      alert('Por favor complete todos los campos obligatorios (*)');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find(c => c.id === formData.category)?.name || formData.category;
      
      const created = await createTicket({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        branch: formData.branch,
        category: selectedCat,
        reporterName: currentUser?.name || currentUser?.branch || formData.branch
      });

      setSuccessTicket(created);
      handleReset();
    } catch (err) {
      console.error('Error al registrar ticket:', err);
      alert('Ocurrió un error al despachar la incidencia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700/80 overflow-hidden relative">
      {/* Decorative top tech border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
      
      {/* Form Header */}
      <div className="px-5 sm:px-8 py-5 sm:py-7 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-[#0a1128]/60">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            Nuevo Ticket de Incidencia
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Complete el registro técnico para asignar el equipo de ingeniería correspondiente.
          </p>
        </div>
        <span className="bg-blue-500/10 text-cyan-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold tracking-widest uppercase shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" /> B2B Portal
        </span>
      </div>

      {/* Alerta de Ticket Creado Exitosamente */}
      {successTicket && (
        <div className="m-4 sm:m-6 p-4 sm:p-5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white">
                ¡Incidencia Registrada Exitosamente! #{successTicket.id}
              </h4>
              <p className="text-xs sm:text-sm text-emerald-300/90 mt-0.5">
                Los administradores (Johryan y Johnny) han recibido la alerta en tiempo real en la central de monitoreo.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessTicket(null)}
            className="text-xs font-bold px-3 py-1.5 bg-emerald-800/40 hover:bg-emerald-800/70 text-emerald-200 border border-emerald-600/40 rounded-lg transition-colors self-end sm:self-auto"
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
        
        {/* Sección 01: Información General */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-cyan-400 font-bold text-xs">01</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest">
              Contexto Operativo
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Punto de Operación (Sucursal) */}
            <div className="relative group">
              <label htmlFor="branch" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Punto de Operación *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <select
                  id="branch"
                  name="branch"
                  required
                  value={formData.branch}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white appearance-none hover:border-slate-500 shadow-inner text-xs sm:text-sm"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccione ubicación...</option>
                  {BRANCH_NAMES.map(branchName => (
                    <option key={branchName} value={branchName} className="bg-slate-900 text-white">
                      {branchName}
                    </option>
                  ))}
                </select>
              </div>
              {currentUser?.branch && (
                <p className="text-[11px] text-cyan-400/80 mt-1">
                  ✓ Preseleccionado automáticamente según su cuenta ({currentUser.branch}).
                </p>
              )}
            </div>

            {/* Categoría / Línea de Servicio */}
            <div className="relative group">
              <label htmlFor="category" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Línea de Servicio *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Tags className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white appearance-none hover:border-slate-500 shadow-inner text-xs sm:text-sm"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccione categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 02: Detalles del Problema */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-cyan-400 font-bold text-xs">02</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest">
              Especificación del Evento
            </h3>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Asunto Principal */}
            <div className="group">
              <label htmlFor="title" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Asunto Principal *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Type className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  placeholder="Ej. Cámara 04 sin señal / Pérdida de enlace con servidor"
                  value={formData.title}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white hover:border-slate-500 shadow-inner font-medium placeholder-slate-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Clasificación de Severidad */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                Clasificación de Severidad <AlertTriangle className="h-4 w-4 text-amber-500"/>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {priorities.map(p => (
                  <label 
                    key={p.id} 
                    className={`
                      cursor-pointer flex items-center justify-center py-2.5 sm:py-3 px-3 border rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 select-none
                      ${formData.priority === p.id 
                        ? `ring-2 ring-offset-2 ring-offset-[#0f172a] ${p.color} shadow-[0_0_15px_rgba(0,0,0,0.3)] scale-[1.02]` 
                        : 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:border-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p.id}
                      className="sr-only"
                      checked={formData.priority === p.id}
                      onChange={handleChange}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Bitácora de Observaciones */}
            <div className="group">
              <label htmlFor="description" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Bitácora de Observaciones *
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none">
                  <AlignLeft className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows="4"
                  placeholder="Describa el comportamiento anómalo, códigos de error (si aplican) y áreas comprometidas..."
                  value={formData.description}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white resize-y hover:border-slate-500 shadow-inner leading-relaxed placeholder-slate-500 text-xs sm:text-sm"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-700/50 mt-2">
          <button
            type="button"
            onClick={handleReset}
            className="order-2 sm:order-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-700 hover:text-white transition-colors w-full sm:w-auto active:scale-[0.99]"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="order-1 sm:order-2 flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 border border-transparent rounded-xl text-white text-xs sm:text-sm font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-[0.99] w-full sm:w-auto disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {isSubmitting ? 'Registrando...' : 'Registrar Incidencia'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TicketForm;