import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Search, Mail, Phone, Building2, UserCircle, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '', // se usará como usuario
    password: '',
    phone: '',
    branch: '',
    cedula: '' // opcional
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users_client')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Validaciones
    if (!formData.name || !formData.email || !formData.password || !formData.branch || !formData.phone) {
      setFormError('Por favor complete todos los campos obligatorios');
      return;
    }
    
    // Normalizar correo/usuario para evitar duplicados insensibles a mayusculas
    const cleanEmail = formData.email.trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from('users_client')
        .insert([{
          name: formData.name,
          email: cleanEmail,
          password: formData.password,
          phone: formData.phone,
          branch: formData.branch,
          cedula: formData.cedula || null
        }]);

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('Ese usuario o correo ya existe en el sistema.');
        }
        throw error;
      }

      // Éxito
      setShowForm(false);
      setFormData({ name: '', email: '', password: '', phone: '', branch: '', cedula: '' });
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario permanentemente?')) return;
    
    try {
      const { error } = await supabase
        .from('users_client')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error('Error deleteing user', err);
      alert('Error al eliminar usuario');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-400" />
            Gestión de Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">Administración de credenciales y accesos al portal B2B.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Nuevo Cliente'}
          </button>
        </div>
      </div>

      {/* Formulario de Creación */}
      {showForm && (
        <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 mb-8 shadow-xl animate-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-4">Registrar Nuevo Cliente</h3>
          
          {formError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-400 rounded-lg text-sm font-bold">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo *</label>
              <div className="relative">
                <UserCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-9 pr-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="Juan Pérez" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Usuario / Correo *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required type="text" name="email" value={formData.email} onChange={handleChange} className="w-full pl-9 pr-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="juan@empresa.com o juan_p" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña *</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required type="text" name="password" value={formData.password} onChange={handleChange} className="w-full pl-9 pr-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="Establecer contraseña" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-9 pr-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="+506 8888 8888" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Sucursal *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required type="text" name="branch" value={formData.branch} onChange={handleChange} className="w-full pl-9 pr-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="Ej. Sede Central" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Cédula (Opcional)</label>
              <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="0-0000-0000" />
            </div>
            
            <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
              <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-colors">
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Usuarios */}
      <div className="bg-[#0f172a] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando usuarios...</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-[#0a1128]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Usuario / Correo</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Sucursal</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">{user.name}</div>
                        {user.cedula && <div className="text-xs text-slate-500 mt-0.5">ID: {user.cedula}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-md border border-cyan-800">{user.email}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {user.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {user.branch}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-800">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-slate-800/50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white text-sm">{user.name}</div>
                      <div className="text-cyan-400 font-mono text-xs mt-1">{user.email}</div>
                    </div>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 -mr-2 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-slate-400 flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" /> {user.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" /> {user.branch}
                    </div>
                    {user.cedula && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <UserCircle className="w-3.5 h-3.5" /> {user.cedula}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-medium">
                  No se encontraron usuarios.
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
