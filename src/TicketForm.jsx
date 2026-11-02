import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Tags, 
  AlertTriangle, 
  Type, 
  AlignLeft, 
  Send, 
  X, 
  Cpu,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { BRANCH_NAMES } from './lib/branches';
import { createTicket, getLocalTickets, deduplicateTickets, subscribeToTickets, syncPendingLocalTickets, resendTicketToSupabase, resendAllPendingTickets } from './lib/ticketStorage.js';

const TicketForm = ({ currentUser }) => {
  // Inicializar sucursal automáticamente según el usuario conectado
  const defaultBranch = currentUser?.branch || currentUser?.name || '';

  const [formData, setFormData] = useState({
    branch: defaultBranch,
    category: '',
    priority: 'Media',
    title: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [resendSuccessId, setResendSuccessId] = useState(null);
  const [resendingAll, setResendingAll] = useState(false);
  const [resendNotice, setResendNotice] = useState(null);

  const handleResendSingle = async (ticketId) => {
    setResendingId(ticketId);
    setResendNotice(null);
    const result = await resendTicketToSupabase(ticketId);
    setResendingId(null);
    if (result.success) {
      setResendSuccessId(ticketId);
      setResendNotice('✅ ¡Ticket reenviado exitosamente a Johryan y Johnny!');
      loadRecentTickets();
      setTimeout(() => setResendSuccessId(null), 4000);
      setTimeout(() => setResendNotice(null), 5000);
    } else {
      setResendNotice('⚠️ Error al reenviar: ' + (result.message || 'Verifique la conexión'));
    }
  };

  const handleResendAll = async () => {
    const branchName = currentUser?.branch || currentUser?.name || formData.branch;
    setResendingAll(true);
    setResendNotice(null);
    const result = await resendAllPendingTickets(branchName);
    setResendingAll(false);
    loadRecentTickets();
    if (result.success) {
      setResendNotice(`✅ ¡Se reenviaron ${result.count} reporte(s) a Johryan y Johnny exitosamente!`);
      setTimeout(() => setResendNotice(null), 6000);
    } else {
      setResendNotice('⚠️ Error al reenviar reportes');
    }
  };

  const [successTicket, setSuccessTicket] = useState(null);
  const [recentBranchTickets, setRecentBranchTickets] = useState([]);

  // Estados de Imagen Adjunta
  const [imagePreview, setImagePreview] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Cargar tickets de esta sucursal
  const loadRecentTickets = async () => {
    const all = getLocalTickets();
    let remote = [];
    try {
      const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(20);
      if (!error && Array.isArray(data)) {
        remote = data.map(t => ({
          id: t.id ? t.id.toString() : 'REMOTE-' + Math.random(),
          db_id: t.id,
          title: t.title || 'Incidencia',
          description: t.description || '',
          priority: t.priority || 'Media',
          status: t.status || 'Abierto',
          branch: t.reporter_name || 'Sucursal',
          reporter_name: t.reporter_name || 'Sucursal',
          user: t.reporter_name || 'Sucursal',
          zone: t.reporter_name || 'Sucursal',
          date: t.created_at ? new Date(t.created_at).toLocaleString() : ''
        }));
      }
    } catch(e) {}

    const combined = deduplicateTickets([...all, ...remote]);

    const branchName = currentUser?.branch || currentUser?.name || formData.branch || '';
    const isUserAdmin = currentUser?.role === 'admin' || ['johryan', 'johnny', 'administración'].includes(branchName.toLowerCase());

    let filtered = combined;
    if (!isUserAdmin && branchName) {
      const branchOnly = combined.filter(t => 
        (t.branch && t.branch.toLowerCase().includes(branchName.toLowerCase())) ||
        (t.user && t.user.toLowerCase().includes(branchName.toLowerCase())) ||
        (t.zone && t.zone.toLowerCase().includes(branchName.toLowerCase())) ||
        (t.reporter_name && t.reporter_name.toLowerCase().includes(branchName.toLowerCase()))
      );
      if (branchOnly.length > 0) {
        filtered = branchOnly;
      }
    }
    setRecentBranchTickets(filtered.slice(0, 15));
  };

  useEffect(() => {
    syncPendingLocalTickets().then(() => loadRecentTickets());
    const unsubscribe = subscribeToTickets(
      () => loadRecentTickets(),
      () => loadRecentTickets(),
      () => loadRecentTickets()
    );
    return () => unsubscribe();
  }, [currentUser, formData.branch]);

  useEffect(() => {
    if (currentUser?.branch) {
      setFormData(prev => ({ ...prev, branch: currentUser.branch }));
    }
  }, [currentUser]);

  const categories = [
    { id: 'camaras', name: 'Mantenimiento de Circuito Cerrado / Cámaras' },
    { id: 'software', name: 'Soporte de Software y ERP' },
    { id: 'redes', name: 'Redes, Enlaces e Infraestructura' },
    { id: 'hardware', name: 'Falla de Equipo / Hardware de Punto' },
    { id: 'acceso', name: 'Control de Acceso / Alarmas de Seguridad' },
    { id: 'otro', name: 'Otro Requerimiento Técnico Especial' },
  ];

  const priorities = [
    { id: 'Baja', label: 'Baja', color: 'bg-slate-800 text-slate-300 border-slate-600 ring-slate-400 hover:bg-slate-700/80' },
    { id: 'Media', label: 'Media', color: 'bg-blue-900/30 text-blue-400 border-blue-700 ring-blue-500 hover:bg-blue-900/50' },
    { id: 'Alta', label: 'Alta', color: 'bg-orange-900/30 text-orange-400 border-orange-700 ring-orange-500 hover:bg-orange-900/50' },
    { id: 'Crítica', label: 'Crítica', color: 'bg-red-900/30 text-red-400 border-red-700 ring-red-500 hover:bg-red-900/50' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Procesamiento y compresión automática de imagen (Canvas)
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido (.jpg, .png, etc.).');
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar máximo a 1280px para velocidad y ligereza
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a JPEG comprimido con calidad 0.78
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.78);
        const approxKb = Math.round((compressedBase64.length * 3) / 4 / 1024);

        setImagePreview(compressedBase64);
        setImageInfo({
          name: file.name,
          sizeKb: approxKb,
          dimensions: `${width}x${height}`
        });
        setIsCompressing(false);
      };

      img.onerror = () => {
        setIsCompressing(false);
        alert('No fue posible procesar la imagen seleccionada.');
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setFormData({
      branch: defaultBranch,
      category: '',
      priority: 'Media',
      title: '',
      description: '',
    });
    handleRemoveImage();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch || !formData.category || !formData.title || !formData.description) {
      alert('Por favor complete todos los campos obligatorios (*)');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find(c => c.id === formData.category)?.name || formData.category;
      
      const created = await createTicket({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        branch: formData.branch,
        category: selectedCat,
        reporterName: currentUser?.name || currentUser?.branch || formData.branch,
        image: imagePreview,
        imageName: imageInfo?.name || null
      });

      setSuccessTicket(created);
      handleReset();
    } catch (err) {
      console.error('Error al registrar ticket:', err);
      alert('Ocurrió un error al despachar la incidencia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700/80 overflow-hidden relative">
      {/* Decorative top tech border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
      
      {/* Form Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-7 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-[#0a1128]/60">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
            Nuevo Ticket de Incidencia
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 leading-relaxed">
            Complete el registro técnico para asignar el equipo de ingeniería y soporte correspondiente.
          </p>
        </div>
        <span className="bg-blue-500/10 text-cyan-400 border border-blue-500/30 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" /> B2B Portal
        </span>
      </div>

      {/* Alerta de Ticket Creado Exitosamente */}
      {successTicket && (
        <div className="m-3.5 sm:m-6 p-3.5 sm:p-5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <div className="flex items-start sm:items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
                ¡Incidencia Registrada Exitosamente! #{successTicket.id}
              </h4>
              {successTicket.image && (
                <p className="text-xs text-emerald-300 mt-0.5 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 shrink-0" /> Imagen de evidencia adjunta recibida por soporte.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSuccessTicket(null)}
            className="w-full sm:w-auto text-xs font-bold px-3 py-2 sm:py-1.5 bg-emerald-800/40 hover:bg-emerald-800/70 text-emerald-200 border border-emerald-600/40 rounded-lg transition-colors shrink-0 text-center"
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
        
        {/* Sección 01: Información General */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-cyan-400 font-bold text-xs">01</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest">
              Contexto Operativo
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Punto de Operación (Sucursal) */}
            <div className="relative group">
              <label htmlFor="branch" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Punto de Operación / Cuenta *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <select
                  id="branch"
                  name="branch"
                  required
                  value={formData.branch}
                  onChange={handleChange}
                  className="pl-11 pr-9 w-full py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white appearance-none hover:border-slate-500 shadow-inner text-xs sm:text-sm"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccione cuenta o sucursal...</option>
                  {BRANCH_NAMES.map(branchName => (
                    <option key={branchName} value={branchName} className="bg-slate-900 text-white">
                      {branchName}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {currentUser?.branch && (
                <p className="text-[11px] text-cyan-400/80 mt-1">
                  ✓ Preseleccionado automáticamente según su cuenta ({currentUser.branch}).
                </p>
              )}
            </div>

            {/* Categoría / Línea de Servicio */}
            <div className="relative group">
              <label htmlFor="category" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Línea de Servicio *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Tags className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="pl-11 pr-9 w-full py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white appearance-none hover:border-slate-500 shadow-inner text-xs sm:text-sm"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccione categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 02: Detalles del Problema */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-cyan-400 font-bold text-xs">02</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest">
              Especificación del Evento
            </h3>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Asunto Principal */}
            <div className="group">
              <label htmlFor="title" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Asunto Principal *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Type className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  placeholder="Ej. Cámara 04 sin señal / Pérdida de enlace con servidor"
                  value={formData.title}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white hover:border-slate-500 shadow-inner font-medium placeholder-slate-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Clasificación de Severidad */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                Clasificación de Severidad <AlertTriangle className="h-4 w-4 text-amber-500"/>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {priorities.map(p => (
                  <label 
                    key={p.id} 
                    className={`
                      cursor-pointer flex items-center justify-center py-2.5 sm:py-3 px-3 border rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 select-none
                      ${formData.priority === p.id 
                        ? `ring-2 ring-offset-2 ring-offset-[#0f172a] ${p.color} shadow-[0_0_15px_rgba(0,0,0,0.3)] scale-[1.02]` 
                        : 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:border-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
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
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Bitácora de Observaciones */}
            <div className="group">
              <label htmlFor="description" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Bitácora de Observaciones *
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none">
                  <AlignLeft className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows="4"
                  placeholder="Describa el comportamiento anómalo, códigos de error (si aplican) y áreas comprometidas..."
                  value={formData.description}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white resize-y hover:border-slate-500 shadow-inner leading-relaxed placeholder-slate-500 text-xs sm:text-sm"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 03: Evidencia Fotográfica / Imagen Adjunta */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <span className="text-cyan-400 font-bold text-xs">03</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              Evidencia Fotográfica <span className="text-slate-500 font-normal lowercase">(opcional)</span>
            </h3>
          </div>

          {/* Inputs ocultos compatibles con cámara directa en celular y galería/archivos */}
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
            id="ticket-image-input"
          />
          <input 
            type="file" 
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageFileChange}
            className="hidden"
            id="ticket-camera-input"
          />

          {!imagePreview ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 bg-slate-900/40 rounded-2xl p-5 sm:p-7 text-center transition-all flex flex-col items-center justify-center gap-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:scale-105 hover:bg-cyan-500/20 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] cursor-pointer"
              >
                <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-white">
                  {isCompressing ? 'Procesando imagen...' : 'Adjuntar evidencia fotográfica del problema'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Usa la cámara de tu celular para tomar una foto al instante o elige una imagen de tu galería.
                </p>
              </div>

              {/* Botones de acción rápida para Celular y Escritorio */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-sm mt-1">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tomar Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Elegir de Galería</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-[10px] font-semibold text-slate-400 border border-slate-700/80 flex items-center gap-1">
                  <UploadCloud className="w-3 h-3 text-cyan-400" /> JPG, PNG, WEBP • Optimización automática
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-cyan-500/40 rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3.5 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-in fade-in">
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div 
                  onClick={() => setImageModalOpen(true)}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-cyan-500/40 cursor-pointer group shrink-0 bg-black/40"
                  title="Click para ampliar imagen"
                >
                  <img 
                    src={imagePreview} 
                    alt="Evidencia" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Maximize2 className="w-5 h-5 text-cyan-300" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Foto Adjunta
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{imageInfo?.sizeKb} KB</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white truncate mt-1">
                    {imageInfo?.name || 'evidencia_incidencia.jpg'}
                  </p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 shrink-0" /> Lista para enviarse a soporte
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Ver en grande
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl text-xs font-bold border border-red-800/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Quitar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form Footer */}
        <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-slate-700/50 mt-2">
          <button
            type="button"
            onClick={handleReset}
            className="order-2 sm:order-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-700 hover:text-white transition-colors w-full sm:w-auto active:scale-[0.99] cursor-pointer"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="order-1 sm:order-2 flex items-center justify-center gap-2 px-7 py-3.5 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 border border-transparent rounded-xl text-white text-sm font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-[0.99] w-full sm:w-auto disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" /> {isSubmitting ? 'Registrando...' : 'Registrar Incidencia'}
          </button>
        </div>
      </form>

      {/* Apartado en vivo: Incidencias Enviadas por esta Sucursal y su Estado */}
      <div className="border-t border-slate-700/80 bg-[#0a1128]/70 p-4 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Estado de Incidencias de {currentUser?.name || formData.branch || 'esta Cuenta'}
            </h3>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {recentBranchTickets.length} {recentBranchTickets.length === 1 ? 'reporte' : 'reportes'}
            </span>
            {recentBranchTickets.length > 0 && (
              <button
                type="button"
                onClick={handleResendAll}
                disabled={resendingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600/90 hover:bg-cyan-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Reenviar todos los reportes de esta sucursal a los administradores"
              >
                <Send className={`w-3.5 h-3.5 ${resendingAll ? 'animate-pulse' : ''}`} />
                <span>{resendingAll ? 'Reenviando...' : 'Reenviar todos'}</span>
              </button>
            )}
          </div>
        </div>

        {resendNotice && (
          <div className="mb-3 p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 text-xs font-semibold flex items-center justify-between">
            <span>{resendNotice}</span>
            <button type="button" onClick={() => setResendNotice(null)} className="text-cyan-400 hover:text-white ml-2">×</button>
          </div>
        )}

        {recentBranchTickets.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500 py-3">
            No hay reportes previos registrados para esta cuenta. Los nuevos tickets que envíes aparecerán aquí inmediatamente con su avance.
          </p>
        ) : (
          <div className="space-y-2.5">
            {recentBranchTickets.slice(0, 5).map(ticket => (
              <div 
                key={ticket.id}
                className="bg-[#0f172a] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-cyan-400 font-bold text-xs sm:text-sm">#{ticket.id}</span>
                    {ticket.category && <span className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-none">• {ticket.category}</span>}
                    {ticket.image && (
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Foto
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{ticket.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{ticket.description}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <span className="text-[11px] text-slate-500">{ticket.date ? ticket.date.split(',')[0] : ''}</span>
                  
                  <div className="flex items-center gap-2">
                    {/* Botón Reenviar individual */}
                    <button
                      type="button"
                      onClick={() => handleResendSingle(ticket.id)}
                      disabled={resendingId === ticket.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700/80 hover:bg-cyan-900 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Reenviar este reporte a Johryan y Johnny"
                    >
                      <Send className={`w-3 h-3 ${resendingId === ticket.id ? 'animate-spin' : ''}`} />
                      <span>{resendingId === ticket.id ? 'Enviando...' : resendSuccessId === ticket.id ? '¡Reenviado!' : 'Reenviar'}</span>
                    </button>

                    {ticket.status === 'Resuelto' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Solucionado
                      </span>
                    ) : ticket.status === 'En Progreso' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-950/70 text-blue-400 border border-blue-800 animate-pulse">
                        <Clock className="w-3 h-3" /> En Atención
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-950/70 text-orange-400 border border-orange-800">
                        <AlertTriangle className="w-3 h-3" /> Pendiente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Lightbox para Ampliar Imagen */}
      {imageModalOpen && imagePreview && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative w-full max-w-4xl max-h-[90dvh] bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a1128]">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" /> Vista previa de imagen
              </span>
              <button 
                onClick={() => setImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/60 overflow-auto max-h-[75dvh]">
              <img src={imagePreview} alt="Evidencia completa" className="max-w-full max-h-[72dvh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TicketForm;
