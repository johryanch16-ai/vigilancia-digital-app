import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { encryptPassword, decryptPassword } from './lib/crypto';
import { Lock, Plus, Search, Eye, EyeOff, Edit2, Trash2, X, Save, ShieldCheck } from 'lucide-react';

export default function ClientPasswords({ user }) {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI States
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [formData, setFormData] = useState({
    service_name: '',
    email: '',
    cedula: '',
    password: '',
    notes: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchPasswords();
    }
  }, [user]);

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPasswords(data || []);
    } catch (err) {
      console.error('Error fetching passwords:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ service_name: '', email: '', cedula: '', password: '', notes: '' });
    setFormError('');
  };

  const handleEditClick = (pwd) => {
    setFormData({
      service_name: pwd.service_name,
      email: pwd.email || '',
      cedula: pwd.cedula || '',
      password: decryptPassword(pwd.encrypted_password),
      notes: pwd.notes || ''
    });
    setEditingId(pwd.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.service_name || !formData.password) {
      setFormError('El Nombre del Servicio y la Contraseña son obligatorios.');
      return;
    }

    try {
      const encrypted = encryptPassword(formData.password);

      const payload = {
        user_id: user.id,
        service_name: formData.service_name,
        email: formData.email,
        cedula: formData.cedula,
        notes: formData.notes,
        encrypted_password: encrypted
      };

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('user_passwords')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id); // extra security
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('user_passwords')
          .insert([payload]);
        if (error) throw error;
      }

      resetForm();
      fetchPasswords();
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error al guardar la contraseña');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta credencial permanentemente?')) return;
    try {
      const { error } = await supabase
        .from('user_passwords')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // extra security
      if (error) throw error;
      fetchPasswords();
    } catch (err) {
      console.error('Error deleteing pwd', err);
      alert('Error al eliminar credencial');
    }
  };

  const toggleVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filtered = passwords.filter(p => 
    p.service_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      {/* Encabezado e Info de Seguridad */}
      <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-900/30 rounded-xl border border-cyan-800/50">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bóveda de Contraseñas</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Encriptación AES-256 Extremo a Extremo.
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if(showForm) resetForm(); else setShowForm(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Nueva Credencial'}
          </button>
        </div>
      </div>

      {/* Buscador */}
      {!showForm && passwords.length > 0 && (
        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por servicio o correo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
          />
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#0f172a] border border-cyan-900/50 rounded-2xl p-6 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            {editingId ? 'Editar Credencial' : 'Guardar Nueva Credencial'}
          </h3>
          
          {formError && (
            <div className="mb-5 p-3 bg-red-900/30 border border-red-800 text-red-400 rounded-lg text-sm font-bold flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p>{formError}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre / Servicio *</label>
              <input required type="text" name="service_name" value={formData.service_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Ej. Portal de Banco, Netflix, Correo" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña *</label>
              <input required type="text" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Ingresa la contraseña" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico (Opcional)</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="usuario@correo.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Cédula / ID (Opcional)</label>
              <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Identificador, si aplica" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Notas (Opcional)</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none" placeholder="Preguntas de seguridad, pines adicionales, etc."></textarea>
            </div>
            
            <div className="md:col-span-2 flex justify-end mt-2 gap-3">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm font-bold transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingId ? 'Actualizar Credencial' : 'Guardar Credencial'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de Tarjetas */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Cargando tu bóveda...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 && !showForm && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-[#0f172a]/50 rounded-2xl border border-dashed border-slate-700">
              No se encontraron credenciales. Presiona "Nueva Credencial" para comenzar.
            </div>
          )}
          {filtered.map(pwd => (
            <div key={pwd.id} className="bg-[#0f172a]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-cyan-500/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-bold text-white leading-tight">{pwd.service_name}</h4>
                <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                  <button onClick={() => handleEditClick(pwd)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(pwd.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {pwd.email && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Correo / Usuario</span>
                    <span className="text-sm text-slate-300 font-mono">{pwd.email}</span>
                  </div>
                )}
                
                {pwd.cedula && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Cédula / ID</span>
                    <span className="text-sm text-slate-300">{pwd.cedula}</span>
                  </div>
                )}
                
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Contraseña</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm font-mono text-cyan-50 overflow-x-auto">
                      {visiblePasswords[pwd.id] ? decryptPassword(pwd.encrypted_password) : '••••••••••••••••'}
                    </div>
                    <button 
                      onClick={() => toggleVisibility(pwd.id)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors shrink-0"
                    >
                      {visiblePasswords[pwd.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {pwd.notes && (
                  <div className="flex flex-col mt-2 pt-3 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Notas</span>
                    <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-2 rounded-lg">{pwd.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
