import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Forgot Password state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Limpiar usuario: trim y mayúsculas/minúsculas
    const cleanUsername = username.trim().toLowerCase();
    
    // Usuarios administradores
    const validAdmins = {
      'johryan': '03042022',
      'johnny': 'Julian0510'
    };

    if (validAdmins[cleanUsername] && validAdmins[cleanUsername] === password) {
      // Guardar el nombre original con mayúscula para mostrar en UI
      const displayAdmin = cleanUsername === 'johryan' ? 'Johryan' : 'Johnny';
      localStorage.setItem('admin_user', displayAdmin);
      localStorage.setItem('user_role', 'admin');
      navigate('/admin/tickets');
      setLoading(false);
      return;
    }

    // Verificar en Supabase si es un cliente
    try {
      const { data, error: dbError } = await supabase
        .from('users_client')
        .select('*')
        .eq('email', cleanUsername)
        .single();

      if (dbError || !data) {
        setError('Usuario o contraseña incorrectos');
      } else {
        if (data.password === password) {
          localStorage.setItem('client_user', JSON.stringify(data));
          localStorage.setItem('user_role', 'client');
          navigate('/cliente');
        } else {
          setError('Usuario o contraseña incorrectos');
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setForgotMessage('');
    setError('');
    
    const cleanForgotUser = forgotUsername.trim().toLowerCase();
    
    try {
      const { error: resetError } = await supabase
        .from('password_resets')
        .insert([{ username: cleanForgotUser }]);
        
      if (resetError) throw resetError;
      
      setForgotMessage('Solicitud enviada. Un administrador revisará tu caso pronto.');
      setForgotUsername('');
    } catch (err) {
      setError('Error al enviar la solicitud. Intente nuevamente.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a1128] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Fondo tecnológico decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] -top-32 -left-32 animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] bg-cyan-600 rounded-full blur-[120px] bottom-0 right-0 animate-pulse delay-1000"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="flex justify-center">
          <div className="relative w-32 h-32 bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.5)] overflow-hidden p-0.5">
            <img src="/logo.jpg" alt="Vigilancia Digital S.A." className="w-full h-full object-cover rounded-[14px]" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 tracking-tight">
          Vigilancia Digital S.A.
        </h2>
        <p className="mt-2 text-center text-sm text-cyan-400/80 font-medium tracking-widest uppercase">
          Plataforma de Operaciones IT
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#0f172a]/90 backdrop-blur-xl py-8 px-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:px-10 border border-slate-700/50">
          
          {error && (
            <div className="mb-6 bg-red-900/30 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm font-bold border border-red-800 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {forgotMessage && (
            <div className="mb-6 bg-emerald-900/30 text-emerald-400 p-3 rounded-lg flex items-center gap-2 text-sm font-bold border border-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {forgotMessage}
            </div>
          )}

          {!isForgotMode ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-slate-300">Usuario / Correo</label>
                <div className="mt-1.5 relative rounded-md shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-slate-600 rounded-xl py-3 border outline-none bg-slate-800/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner" 
                    placeholder="Ingrese su usuario..." 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Contraseña</label>
                <div className="mt-1.5 relative rounded-md shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 sm:text-sm border-slate-600 rounded-xl py-3 border outline-none bg-slate-800/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner" 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <button 
                    type="button"
                    onClick={() => { setIsForgotMode(true); setError(''); setForgotMessage(''); }}
                    className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              <div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-cyan-500 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : 'Acceder al Sistema'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-2 mb-4">
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl border border-blue-500/30 flex items-center justify-center mb-2">
                  <KeyRound className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Recuperar Acceso</h3>
                <p className="text-sm text-slate-400">
                  Ingresa tu usuario o correo electrónico. El equipo de soporte técnico recibirá una alerta para restablecer tu contraseña.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Usuario / Correo</label>
                <div className="mt-1.5 relative rounded-md shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-slate-600 rounded-xl py-3 border outline-none bg-slate-800/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner" 
                    placeholder="Ej. miusuario" 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={loading || !forgotUsername}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-cyan-500 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Solicitar Restablecimiento'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsForgotMode(false)}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-slate-500 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
