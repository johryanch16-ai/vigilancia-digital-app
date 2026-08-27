import React, { useState } from 'react';
import { 
  Building2, 
  Tags, 
  AlertTriangle, 
  Type, 
  AlignLeft, 
  Send,
  X,
  Cpu
} from 'lucide-react';

const TicketForm = () => {
  const [formData, setFormData] = useState({
    branchId: '',
    categoryId: '',
    priority: 'Media',
    title: '',
    description: '',
  });

  const branches = [
    { id: 1, name: 'Sede Central (Datacenter)' },
    { id: 2, name: 'Sucursal Operativa Norte' },
    { id: 3, name: 'Centro de Distribución Logística' },
  ];

  const categories = [
    { id: 'camaras', name: 'Mantenimiento de Circuito Cerrado' },
    { id: 'software', name: 'Soporte de Software y ERP' },
    { id: 'redes', name: 'Redes, Enlaces e Infraestructura' },
  ];

  const priorities = [
    { id: 'Baja', color: 'bg-slate-800 text-slate-300 border-slate-600 ring-slate-400 hover:bg-slate-700' },
    { id: 'Media', color: 'bg-blue-900/30 text-blue-400 border-blue-800 ring-blue-500 hover:bg-blue-900/50' },
    { id: 'Alta', color: 'bg-orange-900/30 text-orange-400 border-orange-800 ring-orange-500 hover:bg-orange-900/50' },
    { id: 'Crítica', color: 'bg-red-900/30 text-red-400 border-red-800 ring-red-500 hover:bg-red-900/50' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Ticket Submitted:', formData);
    alert('Ticket registrado en el sistema core. Se ha despachado una alerta al SOC.');
  };

  return (
    <div className="bg-[#0f172a]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700 overflow-hidden relative">
      {/* Decorative top tech border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
      
      {/* Form Header */}
      <div className="px-6 sm:px-8 py-7 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a1128]/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Nuevo Ticket de Incidencia
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Complete el registro técnico para asignar el equipo de ingeniería correspondiente.
          </p>
        </div>
        <span className="bg-blue-500/10 text-cyan-400 border border-blue-500/30 px-3 py-1.5 rounded-md text-xs font-bold tracking-widest uppercase shadow-sm flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" /> B2B Portal
        </span>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        
        {/* Sección: Información General */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-cyan-400 font-bold text-xs">01</span>
            </div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
              Contexto Operativo
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sucursal */}
            <div className="relative group">
              <label htmlFor="branchId" className="block text-sm font-semibold text-slate-300 mb-1.5">
                Punto de Operación *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <select
                  id="branchId"
                  name="branchId"
                  required
                  value={formData.branchId}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-slate-200 appearance-none hover:border-slate-500 shadow-inner"
                >
                  <option value="" className="bg-slate-800">Seleccione ubicación...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categoría */}
            <div className="relative group">
              <label htmlFor="categoryId" className="block text-sm font-semibold text-slate-300 mb-1.5">
                Línea de Servicio *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Tags className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <select
                  id="categoryId"
                  name="categoryId"
                  required
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-slate-200 appearance-none hover:border-slate-500 shadow-inner"
                >
                  <option value="" className="bg-slate-800">Seleccione categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Detalles del Problema */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-cyan-400 font-bold text-xs">02</span>
            </div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
              Especificación del Evento
            </h3>
          </div>
          
          <div className="space-y-6">
            {/* Título */}
            <div className="group">
              <label htmlFor="title" className="block text-sm font-semibold text-slate-300 mb-1.5">
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
                  placeholder="Ej. Latencia alta en enlace principal"
                  value={formData.title}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-slate-200 hover:border-slate-500 shadow-inner font-medium placeholder-slate-500"
                />
              </div>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                Clasificación de Severidad <AlertTriangle className="h-4 w-4 text-amber-500"/>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {priorities.map(p => (
                  <label 
                    key={p.id} 
                    className={`
                      cursor-pointer flex items-center justify-center px-4 py-3 border rounded-xl text-sm font-bold transition-all duration-200
                      ${formData.priority === p.id 
                        ? `ring-1 ring-offset-2 ring-offset-[#0f172a] ${p.color} shadow-[0_0_15px_rgba(0,0,0,0.3)]` 
                        : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
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
                    {p.id}
                  </label>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div className="group">
              <label htmlFor="description" className="block text-sm font-semibold text-slate-300 mb-1.5">
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
                  rows="5"
                  placeholder="Describa el comportamiento anómalo, códigos de error (si aplican) y áreas comprometidas..."
                  value={formData.description}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-slate-200 resize-y hover:border-slate-500 shadow-inner leading-relaxed placeholder-slate-500"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-700/50 mt-4">
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 font-bold hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-slate-500 transition-colors w-full sm:w-auto"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 border border-transparent rounded-xl text-white font-bold hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-cyan-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:-translate-y-0.5 w-full sm:w-auto"
          >
            <Send className="w-4 h-4" /> Registrar Incidencia
          </button>
        </div>
      </form>
    </div>
  );
};

export default TicketForm;
