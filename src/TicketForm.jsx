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
    { id: 'Baja', color: 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-400 hover:bg-slate-100' },
    { id: 'Media', color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500 hover:bg-blue-100' },
    { id: 'Alta', color: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500 hover:bg-orange-100' },
    { id: 'Crítica', color: 'bg-red-50 text-red-700 border-red-200 ring-red-500 hover:bg-red-100' },
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
    <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden relative">
      {/* Decorative top tech border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"></div>
      
      {/* Form Header */}
      <div className="px-8 py-7 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Nuevo Ticket de Incidencia
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Complete el registro técnico para asignar el equipo de ingeniería correspondiente.
          </p>
        </div>
        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-md text-xs font-bold tracking-widest uppercase shadow-sm flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-blue-500" /> B2B Portal
        </span>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-8">
        
        {/* Sección: Información General */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5 pb-2 border-b border-slate-100">
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-xs">01</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
              Contexto Operativo
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sucursal */}
            <div className="relative group">
              <label htmlFor="branchId" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Punto de Operación *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <select
                  id="branchId"
                  name="branchId"
                  required
                  value={formData.branchId}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 appearance-none hover:border-slate-400 shadow-sm"
                >
                  <option value="">Seleccione ubicación...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categoría */}
            <div className="relative group">
              <label htmlFor="categoryId" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Línea de Servicio *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Tags className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <select
                  id="categoryId"
                  name="categoryId"
                  required
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 appearance-none hover:border-slate-400 shadow-sm"
                >
                  <option value="">Seleccione categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Detalles del Problema */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5 pb-2 border-b border-slate-100">
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-xs">02</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
              Especificación del Evento
            </h3>
          </div>
          
          <div className="space-y-6">
            {/* Título */}
            <div className="group">
              <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Asunto Principal *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Type className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  placeholder="Ej. Latencia alta en enlace principal"
                  value={formData.title}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 hover:border-slate-400 shadow-sm font-medium"
                />
              </div>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                Clasificación de Severidad <AlertTriangle className="h-4 w-4 text-amber-500"/>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {priorities.map(p => (
                  <label 
                    key={p.id} 
                    className={`
                      cursor-pointer flex items-center justify-center px-4 py-3 border rounded-xl text-sm font-bold transition-all duration-200
                      ${formData.priority === p.id 
                        ? `ring-2 ring-offset-2 ${p.color} shadow-md` 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700'
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
              <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Bitácora de Observaciones *
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none">
                  <AlignLeft className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows="5"
                  placeholder="Describa el comportamiento anómalo, códigos de error (si aplican) y áreas comprometidas..."
                  value={formData.description}
                  onChange={handleChange}
                  className="pl-11 w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 resize-y hover:border-slate-400 shadow-sm leading-relaxed"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-4">
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-colors"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 border border-transparent rounded-xl text-white font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5"
          >
            <Send className="w-4 h-4" /> Registrar Incidencia
          </button>
        </div>
      </form>
    </div>
  );
};

export default TicketForm;
