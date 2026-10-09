import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'vigilancia_local_categories';

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Red / Internet / Switch', is_active: true },
  { id: 'cat-2', name: 'Hardware / Computadoras', is_active: true },
  { id: 'cat-3', name: 'Cámaras de Seguridad / DVR', is_active: true },
  { id: 'cat-4', name: 'Impresoras y Facturación POS', is_active: true },
  { id: 'cat-5', name: 'Software / Sistema y Base de Datos', is_active: true },
  { id: 'cat-6', name: 'Electricidad y Respaldo UPS', is_active: true },
  { id: 'cat-7', name: 'Otro / Consulta General', is_active: true }
];

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const getLocalCategories = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        return DEFAULT_CATEGORIES;
      }
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  };

  const saveLocalCategories = (cats) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
    } catch (e) {}
  };

  const fetchCategories = async () => {
    const local = getLocalCategories();
    setCategories(local);

    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (!error && Array.isArray(data) && data.length > 0) {
        const mergedMap = new Map();
        data.forEach(c => mergedMap.set(c.name.toLowerCase().trim(), c));
        local.forEach(c => {
          const key = c.name.toLowerCase().trim();
          if (!mergedMap.has(key)) mergedMap.set(key, c);
        });
        const merged = Array.from(mergedMap.values());
        setCategories(merged);
        saveLocalCategories(merged);
      }
    } catch (err) {
      console.warn("Supabase no disponible para categorías, usando modo local:", err.message);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name')?.toString().trim();
    if (!name) return;

    const newCategory = {
      id: 'cat-' + Date.now(),
      name,
      is_active: true
    };

    const updated = [...categories, newCategory];
    setCategories(updated);
    saveLocalCategories(updated);
    setIsModalOpen(false);
    showNotification(`Categoría "${name}" creada.`);

    try {
      await supabase.from('categories').insert([{ name, is_active: true }]);
    } catch (err) {
      console.warn("Supabase no disponible al crear categoría:", err.message);
    }
  };

  const handleDeleteCategory = async (id, catName) => {
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${catName || ''}"?`)) {
      const updated = categories.filter(c => c.id !== id);
      setCategories(updated);
      saveLocalCategories(updated);
      showNotification(`Categoría eliminada.`);

      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn("Supabase no disponible al eliminar categoría:", err.message);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] bg-[#0f172a] border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)] rounded-xl px-4 py-3 flex items-center gap-3 text-white text-sm animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" /> Clasificación de Incidentes
          </h1>
          <p className="mt-1 text-sm text-slate-400">Define las tipologías de problemas para clasificar los tickets de soporte.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 border border-transparent rounded-xl text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        </div>
      </div>

      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a1128]/85 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-cyan-800/60 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="text-lg font-bold text-white">Nueva Categoría</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} autoComplete="off" className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre de la Categoría *</label>
                <input 
                  required 
                  autoFocus
                  name="name" 
                  type="text" 
                  placeholder="Ej. Soporte a Cajeros" 
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm" 
                />
              </div>
              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all shadow-sm text-xs cursor-pointer"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-[#0f172a] rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre de la Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                      Activa
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/20 cursor-pointer" 
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      title="Eliminar Categoría"
                    >
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
