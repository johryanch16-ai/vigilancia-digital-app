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
  Maximize2
} from 'lucide-react';
import { BRANCH_NAMES } from './lib/branches';
import { createTicket, getLocalTickets, subscribeToTickets } from './lib/ticketStorage.js';

const TicketForm = ({ currentUser }) => {
  // Inicializar sucursal automticamente segn el usuario conectado
  const defaultBranch = currentUser?.branch || currentUser?.name || '';

  const [formData, setFormData] = useState({
    branch: defaultBranch,
    category: '',
    priority: 'Media',
    title: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);
  const [recentBranchTickets, setRecentBranchTickets] = useState([]);

  // Estados de Imagen Adjunta
  const [imagePreview, setImagePreview] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Cargar tickets de esta sucursal
  const loadRecentTickets = () => {
    const branchName = currentUser?.branch || currentUser?.name || formData.branch;
    if (!branchName) return;
    const all = getLocalTickets();
    const branchLower = branchName.toLowerCase();
    const filtered = all.filter(t => 
      (t.zone && t.zone.toLowerCase() === branchLower) ||
      (t.user && t.user.toLowerCase() === branchLower) ||
      (t.reporter_name && t.reporter_name.toLowerCase() === branchLower)
    );
    setRecentBranchTickets(filtered);
  };

  useEffect(() => {
    loadRecentTickets();
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
    { id: 'camaras', name: 'Mantenimiento de Circuito Cerrado / Cmaras' },
    { id: 'software', name: 'Soporte de Software y ERP' },
    { id: 'redes', name: 'Redes, Enlaces e Infraestructura' },
    { id: 'hardware', name: 'Falla de Equipo / Hardware de Punto' },
    { id: 'acceso', name: 'Control de Acceso / Alarmas de Seguridad' },
    { id: 'otro', name: 'Otro Requerimiento Tcnico Especial' },
  ];

  const priorities = [
    { id: 'Baja', label: 'Baja', color: 'bg-slate-800 text-slate-300 border-slate-600 ring-slate-400 hover:bg-slate-700/80' },
    { id: 'Media', label: 'Media', color: 'bg-blue-900/30 text-blue-400 border-blue-700 ring-blue-500 hover:bg-blue-900/50' },
    { id: 'Alta', label: 'Alta', color: 'bg-orange-900/30 text-orange-400 border-orange-700 ring-orange-500 hover:bg-orange-900/50' },
    { id: 'Crtica', label: 'Crtica', color: 'bg-red-900/30 text-red-400 border-red-700 ring-red-500 hover:bg-red-900/50' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Procesamiento y compresin automtica de imagen (Canvas)
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen vlido (.jpg, .png, etc.).');
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar mximo a 1280px para velocidad y ligereza
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
      alert('Ocurri un error al despachar la incidencia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700/80 overflow-hidden relative">
      {/* Decorative top tech border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
      
      {/* Form Header */}
      <div className="px-5 sm:px-8 py-5 sm:py-7 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-[#0a1128]/60">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            Nuevo Ticket de Incidencia
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Complete el registro tcnico para asignar el equipo de ingeniera y soporte correspondiente.
          </p>
        </div>
        <span className="bg-blue-500/10 text-cyan-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold tracking-widest uppercase shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" /> B2B Portal
        </span>
      </div>

      {/* Alerta de Ticket Creado Exitosamente */}
      {successTicket && (
        <div className="m-4 sm:m-6 p-4 sm:p-5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
                Incidencia Registrada Exitosamente! #{successTicket.id}
              </h4>
              {successTicket.image && (
                <p className="text-xs text-emerald-300 mt-0.5 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> Imagen de evidencia adjunta recibida por administradores.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSuccessTicket(null)}
            className="text-xs font-bold px-3 py-1.5 bg-emerald-800/40 hover:bg-emerald-800/70 text-emerald-200 border border-emerald-600/40 rounded-lg transition-colors shrink-0"
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
        
        {/* Seccin 01: Informacin General */}
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
            
            {/* Punto de Operacin (Sucursal) */}
            <div className="relative group">
              <label htmlFor="branch" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Punto de Operacin / Cuenta *
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
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white appearance-none hover:border-slate-500 shadow-inner text-xs sm:text-sm"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccione cuenta o sucursal...</option>
                  {BRANCH_NAMES.map(branchName => (
                    <option key={branchName} value={branchName} className="bg-slate-900 text-white">
                      {branchName}
                    </option>
                  ))}
                </select>
              </div>
              {currentUser?.branch && (
                <p className="text-[11px] text-cyan-400/80 mt-1">
                  V Preseleccionado automticamente segn su cuenta ({currentUser.branch}).
                </p>
              )}
            </div>

            {/* Categora / Lnea de Servicio */}
            <div className="relative group">
              <label htmlFor="category" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Lnea de Servicio *
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
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white appearance-none hover:border-slate-500 shadow-inner text-xs sm:text-sm"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccione categora...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Seccin 02: Detalles del Problema */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-cyan-400 font-bold text-xs">02</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest">
              Especificacin del Evento
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
                  placeholder="Ej. Cmara 04 sin seal / Prdida de enlace con servidor"
                  value={formData.title}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white hover:border-slate-500 shadow-inner font-medium placeholder-slate-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Clasificacin de Severidad */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                Clasificacin de Severidad <AlertTriangle className="h-4 w-4 text-amber-500"/>
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

            {/* Bitcora de Observaciones */}
            <div className="group">
              <label htmlFor="description" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                Bitcora de Observaciones *
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
                  placeholder="Describa el comportamiento anmalo, cdigos de error (si aplican) y reas comprometidas..."
                  value={formData.description}
                  onChange={handleChange}
                  className="pl-11 w-full px-3.5 py-3 bg-slate-800/60 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-white resize-y hover:border-slate-500 shadow-inner leading-relaxed placeholder-slate-500 text-xs sm:text-sm"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Seccin 03: Evidencia Fotogrfica / Imagen Adjunta */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 pb-2 border-b border-slate-700/50">
            <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <span className="text-cyan-400 font-bold text-xs">03</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              Evidencia Fotogrfica <span className="text-slate-500 font-normal lowercase">(opcional)</span>
            </h3>
          </div>

          {/* Input oculto compatible con telfono (cmara/galera) y computadora */}
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
            id="ticket-image-input"
          />

          {!imagePreview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 bg-slate-900/40 hover:bg-slate-850/60 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {isCompressing ? 'Procesando imagen...' : 'Tomar foto o subir imagen desde su dispositivo'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Toca aqu para abrir la cmara o galera en tu telfono, o seleccionar un archivo desde tu computadora.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-cyan-400" /> JPG, PNG, WEBP
                </span>
                <span className="text-[11px] text-slate-500">Optimizacin automtica para envos rpidos</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-in fade-in">
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
                  <p className="text-sm font-semibold text-white truncate mt-1">
                    {imageInfo?.name || 'evidencia_incidencia.jpg'}
                  </p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Lista para enviarse a los administradores
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Ver en grande
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="px-3 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl text-xs font-bold border border-red-800/50 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Quitar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form Footer */}
        <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-700/50 mt-2">
          <button
            type="button"
            onClick={handleReset}
            className="order-2 sm:order-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-700 hover:text-white transition-colors w-full sm:w-auto active:scale-[0.99]"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="order-1 sm:order-2 flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 border border-transparent rounded-xl text-white text-xs sm:text-sm font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-[0.99] w-full sm:w-auto disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {isSubmitting ? 'Registrando...' : 'Registrar Incidencia'}
          </button>
        </div>
      </form>

      {/* Apartado en vivo: Incidencias Enviadas por esta Sucursal y su Estado */}
      <div className="border-t border-slate-700/80 bg-[#0a1128]/70 p-5 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Estado de Incidencias Enviadas por {currentUser?.name || formData.branch || 'esta Cuenta'}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            {recentBranchTickets.length} {recentBranchTickets.length === 1 ? 'reporte' : 'reportes'}
          </span>
        </div>

        {recentBranchTickets.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500 py-3">
            No hay reportes previos registrados para esta cuenta. Los nuevos tickets que enves aparecern aqu inmediatamente con su avance.
          </p>
        ) : (
          <div className="space-y-2.5">
            {recentBranchTickets.slice(0, 5).map(ticket => (
              <div 
                key={ticket.id}
                className="bg-[#0f172a] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-cyan-400 font-bold text-xs sm:text-sm">#{ticket.id}</span>
                    <span className="text-[11px] text-slate-400">  {ticket.category}</span>
                    {ticket.image && (
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Foto
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{ticket.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{ticket.description}</p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <span className="text-[11px] text-slate-500">{ticket.date.split(',')[0]}</span>
                  {ticket.status === 'Resuelto' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Solucionado
                    </span>
                  ) : ticket.status === 'En Progreso' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950/70 text-blue-400 border border-blue-800 animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> En Atencin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-950/70 text-orange-400 border border-orange-800">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Lightbox para Ampliar Imagen */}
      {imageModalOpen && imagePreview && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a1128]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" /> Vista previa de imagen
              </span>
              <button 
                onClick={() => setImageModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/60 overflow-auto max-h-[75vh]">
              <img src={imagePreview} alt="Evidencia completa" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TicketForm;
