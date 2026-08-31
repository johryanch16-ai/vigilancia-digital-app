import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Search, Mail, Phone, Building2, UserCircle, Key, X, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { decryptPassword } from '../lib/crypto';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI States
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formError, setFormError] = useState('');
  
  // Passwords Modal State
  const [viewingPasswordsUser, setViewingPasswordsUser] = useState(null);
  const [userPasswords, setUserPasswords] = useState([]);
  const [loadingPasswords, setLoadingPasswords] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    branch: '',
    cedula: '',
    has_password_access: false
  });

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
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUserId(null);
    setFormData({ name: '', email: '', password: '', phone: '', branch: '', cedula: '', has_password_access: false });
    setFormError('');
  };

  const handleEditClick = (user) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
      branch: user.branch,
      cedula: user.cedula || '',
      has_password_access: user.has_password_access || false
    });
    setEditingUserId(user.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name || !formData.email || !formData.password || !formData.branch || !formData.phone) {
      setFormError('Por favor complete todos los campos obligatorios');
      return;
    }
    
    const cleanEmail = formData.email.trim().toLowerCase();
    
    const payload = {
      name: formData.name,
      email: cleanEmail,
      password: formData.password,
      phone: formData.phone,
      branch: formData.branch,
      cedula: formData.cedula || null,
      has_password_access: formData.has_password_access
    };

    try {
      if (editingUserId) {
        // Update
        const { error } = await supabase
          .from('users_client')
          .update(payload)
          .eq('id', editingUserId);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('users_client')
          .insert([payload]);
        if (error) {
          if (error.code === '23505') throw new Error('Ese usuario o correo ya existe en el sistema.');
          throw error;
        }
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Error al guardar usuario');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario permanentemente?')) return;
    try {
      const { error } = await supabase.from('users_client').delete().eq('id', id);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error('Error deleteing user', err);
      alert('Error al eliminar usuario');
    }
  };

  // Ver Contraseñas Logic
  const handleViewPasswords = async (user) => {
    setViewingPasswordsUser(user);
    setLoadingPasswords(true);
    setVisiblePasswords({});
    try {
      const { data, error } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserPasswords(data || []);
    } catch (err) {
      console.error('Error fetching user passwords:', err);
      alert('Error cargando bóveda');
    } finally {
      setLoadingPasswords(false);
    }
  };

  const togglePasswordVisibility = (pwdId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [pwdId]: !prev[pwdId]
    }));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-400" />
            Gestión de Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">Administración de credenciales y permisos al portal B2B.</p>
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
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Nuevo Cliente'}
          </button>
        </div>
      </div>

      {/* Formulario de Creación/Edición */}
      {showForm && (
        <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 mb-8 shadow-xl animate-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-4">
            {editingUserId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
          </h3>
          
          {formError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-400 rounded-lg text-sm font-bold">
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
            
            {/* Permisos */}
            <div className="md:col-span-2 lg:col-span-3 border-t border-slate-700 mt-2 pt-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 w-fit hover:bg-slate-800 transition-colors">
                <input 
                  type="checkbox" 
                  name="has_password_access" 
                  checked={formData.has_password_access} 
                  onChange={handleChange} 
                  className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 bg-slate-700" 
                />
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    Permiso: Ver Contraseñas
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Habilita el módulo de Bóveda de Contraseñas para este cliente.</div>
                </div>
              </label>
            </div>
            
            <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2 gap-3">
              <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-colors">
                {editingUserId ? 'Actualizar Cliente' : 'Guardar Cliente'}
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Permisos</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Sucursal</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">{user.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-md border border-cyan-800">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        {user.has_password_access ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-md border border-green-800">
                            <Lock className="w-3 h-3" /> Bóveda Activa
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">Sin acceso</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {user.branch}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {user.has_password_access && (
                          <button 
                            onClick={() => handleViewPasswords(user)}
                            title="Ver contraseñas guardadas"
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/30 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100 md:opacity-100"
                          >
                            <Key className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditClick(user)}
                          title="Editar"
                          className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100 md:opacity-100"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          title="Eliminar"
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100 md:opacity-100"
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
                    <div className="flex gap-1">
                      {user.has_password_access && (
                        <button onClick={() => handleViewPasswords(user)} className="p-2 text-cyan-400 bg-cyan-900/20 hover:bg-cyan-900/40 rounded-lg transition-colors">
                          <Key className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleEditClick(user)} className="p-2 text-blue-400 bg-blue-900/20 hover:bg-blue-900/40 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-400 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-400 flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" /> {user.phone}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" /> {user.branch}
                      </div>
                      {user.has_password_access && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-green-400">Bóveda ON</span>
                      )}
                    </div>
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

      {/* Modal Ver Contraseñas (Admin) */}
      {viewingPasswordsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#0a1128]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  Bóveda de: <span className="text-cyan-400">{viewingPasswordsUser.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Acceso de administrador a credenciales encriptadas.</p>
              </div>
              <button 
                onClick={() => setViewingPasswordsUser(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-[#0f172a]">
              {loadingPasswords ? (
                <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Desencriptando bóveda...</div>
              ) : userPasswords.length === 0 ? (
                <div className="text-center py-12 text-slate-500">Este usuario no tiene contraseñas guardadas.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userPasswords.map((pwd) => (
                    <div key={pwd.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-white">{pwd.service_name}</div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => togglePasswordVisibility(pwd.id)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800 rounded transition-colors"
                          >
                            {visiblePasswords[pwd.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {pwd.email && (
                          <div className="flex justify-between border-b border-slate-700/50 pb-1">
                            <span className="text-slate-500">Usuario/Correo:</span>
                            <span className="text-slate-300 font-mono">{pwd.email}</span>
                          </div>
                        )}
                        {pwd.cedula && (
                          <div className="flex justify-between border-b border-slate-700/50 pb-1">
                            <span className="text-slate-500">Cédula:</span>
                            <span className="text-slate-300">{pwd.cedula}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-b border-slate-700/50 pb-1">
                          <span className="text-slate-500">Contraseña:</span>
                          <span className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded">
                            {visiblePasswords[pwd.id] ? decryptPassword(pwd.encrypted_password) : '••••••••••••'}
                          </span>
                        </div>
                        {pwd.notes && (
                          <div className="pt-2">
                            <span className="text-xs text-slate-500 block mb-1">Notas:</span>
                            <p className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">{pwd.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
