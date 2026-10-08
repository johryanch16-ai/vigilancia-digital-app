import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Search, Mail, Phone, Building2, UserCircle, Key, X, Lock, Eye, EyeOff, ShieldCheck, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { decryptPassword } from '../lib/crypto';
import { BRANCH_ACCOUNTS, BRANCH_PASSWORD } from '../lib/branches';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI States
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formError, setFormError] = useState('');
  const [showPasswordsPlain, setShowPasswordsPlain] = useState({});
  
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

    // Mapear sucursales base oficiales
    const defaultBranchUsers = BRANCH_ACCOUNTS.map(b => ({
      id: b.id,
      name: b.name,
      email: b.username,
      password: BRANCH_PASSWORD,
      phone: b.phone,
      branch: b.branch,
      cedula: 'N/A',
      has_password_access: false,
      is_branch_official: true
    }));

    try {
      const { data, error } = await supabase
        .from('users_client')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        // Combinar sucursales oficiales con otros usuarios creados
        const combined = [...defaultBranchUsers];
        data.forEach(u => {
          if (!combined.some(c => c.email.toLowerCase() === u.email.toLowerCase())) {
            combined.push(u);
          }
        });
        setUsers(combined);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Conexión con Supabase no disponible para usuarios. Mostrando sucursales locales.');
    }

    setUsers(defaultBranchUsers);
    setLoading(false);
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
        // Actualizar en memoria
        setUsers(users.map(u => u.id === editingUserId ? { ...u, ...payload } : u));
        await supabase.from('users_client').update(payload).eq('id', editingUserId);
      } else {
        const newUser = { id: 'usr-' + Date.now(), ...payload };
        setUsers([newUser, ...users]);
        await supabase.from('users_client').insert([payload]);
      }
      resetForm();
    } catch (err) {
      resetForm();
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      setUsers(users.filter(u => u.id !== id));
      try {
        await supabase.from('users_client').delete().eq('id', id);
      } catch (err) {}
    }
  };

  const toggleShowPassword = (userId) => {
    setShowPasswordsPlain(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.branch && u.branch.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto min-h-screen pb-24 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            Usuarios y Cuentas de Sucursales
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
            Gestión de accesos para las 9 sucursales y personal operativo de Vigilancia Digital.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" /> Agregar Usuario
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por sucursal, usuario o nombre..." 
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-700 rounded-xl bg-[#0f172a] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Listado de Usuarios */}
      <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        
        {/* Vista Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]/70">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Sucursal / Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Usuario de Acceso</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Contraseña</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Punto de Operación</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Permisos</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#0a1128]/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.phone || 'Sin tel.'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-cyan-400 text-sm font-semibold bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                      {user.email}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white text-sm bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                        {showPasswordsPlain[user.id] ? user.password : '••••••'}
                      </span>
                      <button 
                        onClick={() => toggleShowPassword(user.id)}
                        className="text-slate-400 hover:text-cyan-400 p-1 transition-colors"
                        title="Ver/Ocultar"
                      >
                        {showPasswordsPlain[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-200 text-sm font-semibold">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <span>{user.branch}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-950/50 text-cyan-400 border border-cyan-800/60 inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Solo Incidencias
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!user.is_branch_official && (
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                    No se encontraron sucursales o usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil / Tablet */}
        <div className="md:hidden divide-y divide-slate-800">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{user.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{user.branch}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditClick(user)}
                    className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-800/70 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[#0a1128] p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Usuario de inicio:</span>
                  <span className="font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {user.email}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Contraseña:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-white font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {showPasswordsPlain[user.id] ? user.password : '••••••'}
                    </span>
                    <button 
                      onClick={() => toggleShowPassword(user.id)}
                      className="text-slate-400 hover:text-cyan-400 p-1"
                    >
                      {showPasswordsPlain[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40">
                  Acceso: Registro de Incidencias
                </span>
                <span>Tel: {user.phone}</span>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No se encontraron sucursales o usuarios.
            </div>
          )}
        </div>
      </div>

      {/* Modal Formulario Usuario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-cyan-400" />
                {editingUserId ? 'Editar Cuenta de Sucursal' : 'Nueva Cuenta de Sucursal'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de Sucursal *</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  value={formData.name} 
                  onChange={handleChange}
                  placeholder="Ej. Rohrmoser 1" 
                  className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Usuario de Acceso *</label>
                  <input 
                    type="text" 
                    name="email" 
                    required
                    value={formData.email} 
                    onChange={handleChange}
                    placeholder="Ej. rohrmoser1" 
                    className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña *</label>
                  <input 
                    type="text" 
                    name="password" 
                    required
                    value={formData.password} 
                    onChange={handleChange}
                    placeholder="123456" 
                    className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Punto de Operación *</label>
                  <input 
                    type="text" 
                    name="branch" 
                    required
                    value={formData.branch} 
                    onChange={handleChange}
                    placeholder="Ej. Rohrmoser 1" 
                    className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono de Contacto</label>
                  <input 
                    type="text" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    placeholder="2200-0000" 
                    className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-cyan-500/25"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}