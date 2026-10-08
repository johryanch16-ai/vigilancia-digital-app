import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from './lib/supabase';
import { BRANCH_ACCOUNTS, BRANCH_PASSWORD } from './lib/branches';

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
    
    // Limpiar usuario: trim y minusculas
    const cleanUsername = username.trim().toLowerCase();
    
    // 1. Usuarios Administradores (Johryan y Johnny)
    const validAdmins = {
      'johryan': '03042022',
      'johnny': 'Julian0510'
    };

    if (validAdmins[cleanUsername] && validAdmins[cleanUsername] === password) {
      const displayAdmin = cleanUsername === 'johryan' ? 'Johryan' : 'Johnny';
      localStorage.setItem('admin_user', displayAdmin);
      localStorage.setItem('user_role', 'admin');
      navigate('/admin/tickets');
      setLoading(false);
      return;
    }

    // 2. Usuarios Sucursales (Sabana, Rohrmoser 1, Rohrmoser 2, Escazú, Guachipelín, San Pablo, Barva, Ayarco, Cedi)
    const branchMatch = BRANCH_ACCOUNTS.find(b => b.username === cleanUsername);
    if (branchMatch && password === BRANCH_PASSWORD) {
      const branchUserData = {
        id: branchMatch.id,
        name: branchMatch.name,
        email: branchMatch.username,
        branch: branchMatch.branch,
        phone: branchMatch.phone,
        has_password_access: false
      };
      localStorage.setItem('client_user', JSON.stringify(branchUserData));
      localStorage.setItem('user_role', 'client');
      navigate('/cliente');
      setLoading(false);
      return;
    }

    // 3. Verificar en Supabase si es otro cliente registrado dinamicamente
    try {
      const { data, error: dbError } = await supabase
        .from('users_client')
        .select('*')
        .eq('email', cleanUsername)
        .single();

      if (!dbError && data) {
        if (data.password === password) {
          localStorage.setItem('client_user', JSON.stringify(data));
          localStorage.setItem('user_role', 'client');
          navigate('/cliente');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Conexión con Supabase no disponible para login dinámico.');
    }
    
    setError('Usuario o contraseña incorrectos');
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    setLoading(true);

    try {
      const cleanUser = forgotUsername.trim().toLowerCase();
      
      const { error: reqError } = await supabase
        .from('password_resets')
        .insert([{
          username: cleanUser,
          status: 'Pendiente'
        }]);

      if (reqError) throw reqError;

      setForgotMessage('Solicitud enviada correctamente. Johryan o Johnny se pondrán en contacto para restaurar tu acceso.');
      setForgotUsername('');
    } catch (err) {
      // Si la base no responde, dar mensaje de cortesía
      setForgotMessage('Solicitud registrada. Por favor comuníquese con los administradores (Johryan o Johnny).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-20"></div>
        <div className="absolute top-40 -left-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-cyan-500 rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-15"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDB2NDBoNDBWMEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-900 to-slate-900 rounded-3xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.3)] overflow-hidden p-1">
            <img src="/logo.jpg" alt="Vigilancia Digital" className="w-full h-full object-cover rounded-[20px]" />
          </div>
        </div>
        <h2 className="mt-5 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Vigilancia Digital S.A.
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-blue-300 font-medium tracking-[0.2em] uppercase">
          Plataforma de Operaciones IT
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-2 sm:px-0">
        <div className="bg-[#0f172a]/95 backdrop-blur-xl py-7 sm:py-8 px-5 sm:px-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl border border-slate-700/60">
          
          {error && (
            <div className="mb-5 bg-red-900/30 text-red-400 p-3 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-red-800 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotMessage && (
            <div className="mb-5 bg-emerald-900/30 text-emerald-400 p-3 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{forgotMessage}</span>
            </div>
          )}

          {!isForgotMode ? (
            <form className="space-y-5 sm:space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-300">Usuario o Sucursal</label>
                <div className="mt-1.5 relative rounded-md shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 text-sm border-slate-600 rounded-xl py-3 border outline-none bg-slate-800/60 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner" 
                    placeholder="Ej. sabana, escazu o admin..." 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-300">Contraseña</label>
                <div className="mt-1.5 relative rounded-md shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 text-sm border-slate-600 rounded-xl py-3 border outline-none bg-slate-800/60 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner" 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm">
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
                  className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-cyan-500 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : 'Acceder al Sistema'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-2 mb-2">
                <div className="w-11 h-11 bg-blue-900/30 rounded-xl border border-blue-500/30 flex items-center justify-center mb-1">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Recuperar Acceso</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Ingresa tu usuario o nombre de sucursal. Los administradores (Johryan y Johnny) recibirán la alerta para restablecerla.
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-300">Usuario / Sucursal</label>
                <div className="mt-1.5 relative rounded-md shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="block w-full pl-11 text-sm border-slate-600 rounded-xl py-3 border outline-none bg-slate-800/60 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner" 
                    placeholder="Ej. sabana" 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={loading || !forgotUsername}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-cyan-500 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Solicitar Restablecimiento'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsForgotMode(false)}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 transition-all"
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