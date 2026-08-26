import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tags, Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
    if (!error) setCategories(data);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    
    const { data, error } = await supabase.from('categories').insert([{ name }]).select();
    
    if (!error) {
      setCategories([data[0], ...categories]);
      setIsModalOpen(false);
    } else {
      alert("Error al crear la categoría: " + error.message);
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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tags className="w-6 h-6 text-blue-600" /> Gestión de Categorías
          </h1>
          <p className="mt-1 text-sm text-slate-500">Define las líneas de servicio para clasificar los tickets entrantes.</p>
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Nueva Categoría</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Categoría</label>
                <input required name="name" type="text" placeholder="Ej. Soporte a Cajeros" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Crear Categoría</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre de la Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tickets Activos</th>
                <th className="px-6 py-4 relative"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{cat.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-bold">0</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" onClick={() => alert('Función de edición en desarrollo')}><Edit2 className="w-4 h-4" /></button>
                    <button className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="w-4 h-4" /></button>
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
