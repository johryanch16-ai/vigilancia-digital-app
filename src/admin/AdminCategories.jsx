import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error) setCategories(data);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');

    const { data, error } = await supabase.from('categories').insert([{ name, is_active: true }]).select();

    if (!error) {
      setCategories([...categories, data[0]]);
      setIsModalOpen(false);
    } else {
      alert("Error al crear categoría: " + error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta categoría?")) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) {
        setCategories(categories.filter(c => c.id !== id));
      } else {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-500" /> Clasificación de Incidentes
          </h1>
          <p className="mt-1 text-sm text-slate-400">Define las tipologías de problemas para clasificar los tickets de soporte.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        </div>
      </div>

      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-[#0a1128]/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="text-lg font-bold text-white">Nueva Categoría</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Nombre de la Categoría</label>
                <input 
                  required 
                  name="name" 
                  type="text" 
                  placeholder="Ej. Soporte a Cajeros" 
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-[#0f172a] rounded-xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-[#0a1128]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre de la Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Tickets Activos</th>
                <th className="px-6 py-4 relative"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-[#0f172a] divide-y divide-slate-800">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-[#0a1128] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    <span className="bg-slate-800 text-cyan-400 border border-slate-700 px-2.5 py-1 rounded-md font-bold text-xs">0</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/30" onClick={() => handleDeleteCategory(category.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
