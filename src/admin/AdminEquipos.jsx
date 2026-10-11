import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Monitor, 
  Server, 
  Camera, 
  Printer, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  MapPin, 
  QrCode, 
  Check, 
  Barcode, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Sparkles,
  Layers,
  Search,
  RotateCcw
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { 
  fetchAllEquipos, 
  getLocalEquipos, 
  createEquipoRecord, 
  updateEquipoRecord, 
  deleteEquipoRecord, 
  findEquipoByScannedCode,
  generateEquipoQRCode,
  deduplicateEquipos
} from '../lib/equiposStorage';
import { fetchAllZones, getLocalZones, createZoneRecord } from '../lib/zonesStorage';
import EquipmentScannerModal from './EquipmentScannerModal';
import { playScanBeep } from '../lib/notificationAudio';

export default function AdminEquipos() {
  const [equipos, setEquipos] = useState(() => deduplicateEquipos(getLocalEquipos()));
  const [zones, setZones] = useState(() => getLocalZones());
  const [loading, setLoading] = useState(false);
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedEquipoModal, setScannedEquipoModal] = useState(null);
  const [unmatchedCodeModal, setUnmatchedCodeModal] = useState(null);
  
  // Creación rápida de zona dentro del modal de equipos
  const [isQuickZoneOpen, setIsQuickZoneOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneAddress, setNewZoneAddress] = useState('');
  const [isSavingZone, setIsSavingZone] = useState(false);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');
  const [notification, setNotification] = useState(null);
  
  // Formulario
  const [formData, setFormData] = useState({
    name: '',
    qr_code: '',
    type: 'Computadora',
    description: '',
    ip: '',
    zone_id: '',
    status: 'Activo'
  });

  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    loadData();

    const handleEquiposUpdate = () => {
      setEquipos(deduplicateEquipos(getLocalEquipos()));
    };
    const handleZonesUpdate = () => {
      setZones(getLocalZones());
    };

    window.addEventListener('vigilancia:equipos_updated', handleEquiposUpdate);
    window.addEventListener('vigilancia:zones_updated', handleZonesUpdate);

    return () => {
      window.removeEventListener('vigilancia:equipos_updated', handleEquiposUpdate);
      window.removeEventListener('vigilancia:zones_updated', handleZonesUpdate);
    };
  }, []);

  // Detector de lector físico de código de barras (pistola USB / Bluetooth)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const scanned = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          handleProcessScannedCode(scanned);
        } else {
          barcodeBufferRef.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 60 && !isInput) {
          barcodeBufferRef.current = e.key;
        } else if (timeDiff <= 60) {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [equipos]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    const currentLocals = deduplicateEquipos(getLocalEquipos());
    const currentZones = getLocalZones();
    if (currentLocals) setEquipos(currentLocals);
    if (currentZones) setZones(currentZones);

    try {
      setLoading(true);
      const [equiposData, zonesData] = await Promise.all([
        fetchAllEquipos(),
        fetchAllZones()
      ]);
      if (equiposData && equiposData.length > 0) {
        setEquipos(deduplicateEquipos(equiposData));
      }
      if (zonesData && zonesData.length > 0) {
        setZones(zonesData);
      }
    } catch (e) {
      // Modo offline resiliente
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      qr_code: '',
      type: 'Computadora', 
      description: '', 
      ip: '', 
      zone_id: '', 
      status: 'Activo' 
    });
    setEditingId(null);
    setIsModalOpen(false);
    setIsQuickZoneOpen(false);
    setNewZoneName('');
    setNewZoneAddress('');
  };

  const handleEditClick = (equipo) => {
    setFormData({
      name: equipo.name || '',
      qr_code: equipo.qr_code || '',
      type: equipo.type || 'Computadora',
      description: equipo.description || '',
      ip: equipo.ip || equipo.ip_address || '',
      zone_id: equipo.zone_id || '',
      status: equipo.status || 'Activo'
    });
    setEditingId(equipo.id);
    setIsModalOpen(true);
  };

  const handleSaveEquipo = async (e, shouldPrintQR = false) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("El nombre o identificador del equipo es obligatorio.");
      return;
    }

    const targetZone = formData.zone_id || zones[0]?.id || 'zone-default-1';
    const payload = {
      name: formData.name.trim(),
      qr_code: formData.qr_code?.trim() || undefined,
      type: formData.type,
      description: formData.description,
      ip: formData.ip,
      zone_id: targetZone,
      status: formData.status
    };

    try {
      let savedEquipo = null;
      if (editingId) {
        savedEquipo = await updateEquipoRecord(editingId, payload);
        showNotification(`Equipo "${payload.name}" actualizado.`);
      } else {
        const res = await createEquipoRecord(payload);
        savedEquipo = res.equipo;
        if (res.isUpdated) {
          showNotification(`Equipo existente "${payload.name}" actualizado (sin duplicados).`);
        } else {
          showNotification(`Equipo "${payload.name}" registrado con éxito.`);
        }
      }

      setEquipos(deduplicateEquipos(getLocalEquipos()));
      resetForm();

      if (shouldPrintQR && savedEquipo) {
        setShowQR(savedEquipo);
      }
    } catch (err) {
      alert("Error al guardar equipo: " + err.message);
    }
  };

  const handleProcessScannedCode = (scannedText) => {
    playScanBeep();
    const found = findEquipoByScannedCode(scannedText, equipos);

    if (found) {
      setScannedEquipoModal(found);
    } else {
      setUnmatchedCodeModal(scannedText);
    }
  };

  const handleQuickCreateZone = async (e) => {
    e.preventDefault();
    const trimmedName = newZoneName.trim();
    if (!trimmedName) return;

    setIsSavingZone(true);
    try {
      const res = await createZoneRecord({
        name: trimmedName,
        address: newZoneAddress.trim() || 'Sin dirección',
        status: 'Activa'
      });

      if (res.success && res.zone) {
        const updatedZones = await fetchAllZones();
        setZones(updatedZones);
        setFormData(prev => ({ ...prev, zone_id: res.zone.id }));
        setIsQuickZoneOpen(false);
        setNewZoneName('');
        setNewZoneAddress('');
        showNotification(`Sucursal "${trimmedName}" creada y seleccionada.`);
      }
    } catch (err) {
      alert("Error al crear zona: " + err.message);
    } finally {
      setIsSavingZone(false);
    }
  };

  const handleDeleteEquipo = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar el equipo "${name}"?`)) {
      await deleteEquipoRecord(id);
      showNotification(`Equipo "${name}" eliminado.`, 'info');
      setEquipos(deduplicateEquipos(getLocalEquipos()));
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=650');
    if (!printWindow) {
      alert("Por favor permite las ventanas emergentes en tu navegador para imprimir la etiqueta.");
      return;
    }

    const svgElement = document.getElementById('qr-svg-container')?.innerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiqueta de Inventario - ${showQR?.name}</title>
          <style>
            @page {
              size: auto;
              margin: 8mm;
            }
            body {
              margin: 0;
              background: #fff;
              color: #000;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .label-card {
              width: 320px;
              border: 2px solid #000;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
              box-sizing: border-box;
            }
            .header {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .device-name {
              font-size: 20px;
              font-weight: 900;
              margin: 0 0 4px 0;
              word-break: break-all;
            }
            .device-type {
              font-size: 12px;
              font-weight: 600;
              color: #333;
              margin-bottom: 12px;
            }
            .qr-wrapper {
              display: flex;
              justify-content: center;
              margin: 10px 0;
            }
            .qr-wrapper svg {
              width: 170px !important;
              height: 170px !important;
            }
            .info-table {
              width: 100%;
              margin-top: 10px;
              font-size: 11px;
              border-top: 1px dashed #444;
              padding-top: 8px;
              text-align: left;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .info-label {
              font-weight: bold;
              color: #444;
            }
            .footer-id {
              font-size: 10px;
              color: #000;
              font-weight: 800;
              font-family: monospace;
              margin-top: 8px;
              padding-top: 6px;
              border-top: 1px solid #ddd;
              letter-spacing: 0.5px;
            }
            @media print {
              body {
                min-height: auto;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">Vigilancia Digital • Control de Activos</div>
            <div class="device-name">${showQR?.name}</div>
            <div class="device-type">${showQR?.type} • ${showQR?.zones?.name || 'Sucursal Principal'}</div>
            
            <div class="qr-wrapper">
              ${svgElement}
            </div>

            <div class="info-table">
              <div class="info-row">
                <span class="info-label">IP:</span>
                <span>${showQR?.ip || showQR?.ip_address || 'Asignación DHCP'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Estado:</span>
                <span>${showQR?.status || 'Activo'}</span>
              </div>
              ${showQR?.description ? `
              <div class="info-row">
                <span class="info-label">Detalle:</span>
                <span>${showQR?.description}</span>
              </div>` : ''}
            </div>

            <div class="footer-id">CÓDIGO QR / ACTIVO: ${showQR?.qr_code || showQR?.id}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const downloadQRPng = () => {
    const canvas = document.getElementById('qr-canvas-download');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `QR-${showQR?.name || 'equipo'}.png`;
    a.href = url;
    a.click();
  };

  // Filtrado de equipos en tiempo real (tolerante y reactivo)
  const filteredEquipos = equipos.filter(e => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || 
      e.name?.toLowerCase().includes(term) ||
      e.qr_code?.toLowerCase().includes(term) ||
      e.type?.toLowerCase().includes(term) ||
      (e.ip && e.ip.toLowerCase().includes(term)) ||
      (e.zones?.name && e.zones.name.toLowerCase().includes(term)) ||
      (e.description && e.description.toLowerCase().includes(term)) ||
      (e.id && e.id.toString().toLowerCase().includes(term));
    
    const matchesZone = selectedZoneFilter === 'all' || e.zone_id === selectedZoneFilter;
    return matchesSearch && matchesZone;
  });

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] bg-[#0f172a] border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)] rounded-xl px-4 py-3 flex items-center gap-3 text-white text-sm animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Monitor className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            Inventario y Control de Equipos
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
            Gestiona el hardware, imprime códigos QR de inventario únicos y escanea con la cámara o lector físico.
          </p>
        </div>

        {/* Botones de Acción Superiores */}
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 sm:flex-none items-center justify-center px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all gap-2 text-xs sm:text-sm inline-flex cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear con Cámara</span>
          </button>

          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none items-center justify-center px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all gap-2 text-xs sm:text-sm inline-flex cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Equipo</span>
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda, Filtros y Lector de Código de Barras */}
      <div className="bg-[#0f172a] p-3 sm:p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Input de Búsqueda / Escáner de pistola */}
        <div className="relative w-full md:w-96">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400">
            <Barcode className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Buscar por nombre, código QR o IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                handleProcessScannedCode(searchTerm);
              }
            }}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtro por Sucursal / Zona */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400">Sucursal:</label>
            <select 
              value={selectedZoneFilter}
              onChange={(e) => setSelectedZoneFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Todas las sucursales ({equipos.length})</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            <strong>{filteredEquipos.length}</strong> de {equipos.length} equipos
          </span>
        </div>
      </div>

      {/* MODAL 1: ESCÁNER DE CÁMARA */}
      <EquipmentScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scannedCode) => {
          setIsScannerOpen(false);
          handleProcessScannedCode(scannedCode);
        }}
      />

      {/* MODAL 2: RESULTADO DE EQUIPO ESCANEADO */}
      {scannedEquipoModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0a1128]/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0f172a] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-2 border-emerald-500/50 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-bold text-white text-base">Equipo Identificado</h3>
              </div>
              <button 
                onClick={() => setScannedEquipoModal(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="p-3 bg-cyan-950/80 text-cyan-400 rounded-xl border border-cyan-800/60">
                  {scannedEquipoModal.type === 'Servidor' ? <Server className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-base truncate">{scannedEquipoModal.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{scannedEquipoModal.type} • {scannedEquipoModal.zones?.name || 'Sin asignar'}</div>
                  <div className="font-mono text-[11px] text-cyan-400 mt-1 font-bold">CÓDIGO: {scannedEquipoModal.qr_code || scannedEquipoModal.id}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1">Dirección IP</span>
                  <span className="font-mono font-bold text-cyan-400">{scannedEquipoModal.ip || 'DHCP'}</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-1">Estado</span>
                  <span className="font-bold text-emerald-400">{scannedEquipoModal.status}</span>
                </div>
              </div>

              {scannedEquipoModal.description && (
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-500 block mb-1">Detalle / Especificaciones</span>
                  <p className="text-slate-300">{scannedEquipoModal.description}</p>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => {
                    const eq = scannedEquipoModal;
                    setScannedEquipoModal(null);
                    setShowQR(eq);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 text-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-cyan-400" /> Imprimir QR
                </button>
                <button 
                  onClick={() => {
                    const eq = scannedEquipoModal;
                    setScannedEquipoModal(null);
                    handleEditClick(eq);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" /> Editar Datos
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: CÓDIGO NO ENCONTRADO EN INVENTARIO */}
      {unmatchedCodeModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0a1128]/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0f172a] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-2 border-amber-500/60 p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Código no registrado</h3>
              <p className="text-xs text-slate-400 mb-4">
                No se encontró ningún equipo en la base de datos con el identificador:
              </p>
              
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 font-mono text-cyan-400 text-sm mb-6 break-all">
                {unmatchedCodeModal}
              </div>

              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={() => {
                    const code = unmatchedCodeModal;
                    setUnmatchedCodeModal(null);
                    resetForm();
                    setFormData(prev => ({ 
                      ...prev, 
                      name: code.length < 30 ? code : 'NUEVO-EQUIPO',
                      qr_code: code 
                    }));
                    setIsModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Registrar como nuevo equipo
                </button>
                <button 
                  onClick={() => {
                    setUnmatchedCodeModal(null);
                    setIsScannerOpen(true);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
                >
                  Intentar escanear de nuevo
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: VISTA E IMPRESIÓN DEL CÓDIGO QR */}
      {showQR && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a1128]/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-cyan-500/50">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Etiqueta QR de Inventario
              </h3>
              <button onClick={() => setShowQR(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              
              <div className="bg-white p-5 rounded-2xl shadow-xl border-2 border-slate-900 w-full max-w-[260px] text-center">
                <div className="text-[10px] font-black tracking-widest uppercase text-slate-700 border-b-2 border-slate-900 pb-1 mb-2">
                  Vigilancia Digital
                </div>
                <div className="font-black text-slate-900 text-lg leading-tight truncate">
                  {showQR.name}
                </div>
                <div className="text-[11px] font-bold text-slate-600 mb-3 truncate">
                  {showQR.type} • {showQR.zones?.name || 'Sucursal'}
                </div>

                <div id="qr-svg-container" className="flex justify-center p-2 bg-white rounded-xl">
                  <QRCodeSVG 
                    value={JSON.stringify({ 
                      qr: showQR.qr_code || showQR.id,
                      id: showQR.id, 
                      n: showQR.name, 
                      t: showQR.type,
                      z: showQR.zones?.name || ''
                    })} 
                    size={170}
                    level={"H"}
                    includeMargin={false}
                  />
                </div>

                <div className="hidden">
                  <QRCodeCanvas 
                    id="qr-canvas-download"
                    value={JSON.stringify({ 
                      qr: showQR.qr_code || showQR.id,
                      id: showQR.id, 
                      n: showQR.name, 
                      t: showQR.type,
                      z: showQR.zones?.name || ''
                    })}
                    size={512}
                    level={"H"}
                    includeMargin={true}
                  />
                </div>

                <div className="mt-2 pt-2 border-t border-dashed border-slate-400 text-[10px] font-mono text-slate-700 font-bold truncate">
                  {showQR.qr_code || showQR.id}
                </div>
              </div>

              <div className="flex w-full gap-2.5 mt-6">
                <button 
                  onClick={printQR} 
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir Etiqueta
                </button>
                <button 
                  onClick={downloadQRPng} 
                  title="Descargar imagen PNG del QR"
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 5: REGISTRAR / EDITAR EQUIPO */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-cyan-800/60 max-h-[92vh] flex flex-col">
            
            <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-cyan-400" /> : <Monitor className="w-5 h-5 text-cyan-400" />}
                {editingId ? 'Editar Equipo' : 'Registrar Equipo con Generador de QR'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveEquipo(e, false)} autoComplete="off" className="p-5 sm:p-6 overflow-y-auto space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Identificador / Nombre *</label>
                  <input 
                    required 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    type="text" 
                    placeholder="Ej. PC-CAJA-04 o NVR-CAMARAS" 
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm font-semibold" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tipo de Equipo *</label>
                  <select 
                    required 
                    name="type" 
                    value={formData.type} 
                    onChange={handleChange} 
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm cursor-pointer"
                  >
                    <option>Computadora</option>
                    <option>Servidor</option>
                    <option>Cámara de Seguridad</option>
                    <option>DVR / NVR</option>
                    <option>Impresora</option>
                    <option>Router / Switch</option>
                    <option>Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Código QR / Activo Único <span className="text-slate-500 font-normal">(Auto-generado si se deja en blanco)</span>
                </label>
                <input 
                  name="qr_code" 
                  value={formData.qr_code} 
                  onChange={handleChange} 
                  type="text" 
                  placeholder={formData.name ? generateEquipoQRCode(formData.name, zones.find(z => z.id === formData.zone_id)?.name) : "Ej. VD-SABANA-PC-CAJA-01"} 
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-cyan-400 placeholder-slate-600 focus:border-cyan-500 font-mono text-sm uppercase" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descripción / Marca / Modelo</label>
                <input 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  type="text" 
                  placeholder="Ej. Dell Optiplex 3080, i5, 8GB RAM, Windows 11" 
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Dirección IP (Opcional)</label>
                  <input 
                    name="ip" 
                    value={formData.ip} 
                    onChange={handleChange} 
                    type="text" 
                    placeholder="192.168.1.50" 
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-cyan-400 placeholder-slate-500 focus:border-cyan-500 font-mono text-sm" 
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-300">Sucursal / Zona *</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickZoneOpen(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nueva Zona
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      required 
                      name="zone_id" 
                      value={formData.zone_id} 
                      onChange={handleChange} 
                      className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white focus:border-cyan-500 text-sm cursor-pointer"
                    >
                      <option value="">Selecciona una zona...</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsQuickZoneOpen(true)}
                      title="Crear nueva zona al vuelo"
                      className="px-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl border border-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Estado Operativo</label>
                <select 
                  required 
                  name="status" 
                  value={formData.status} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white focus:border-cyan-500 text-sm cursor-pointer"
                >
                  <option value="Activo">Activo (Operativo)</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Inactivo">Inactivo / Retirado</option>
                </select>
              </div>

              {/* Vista Previa del QR en Tiempo Real */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-cyan-900/50 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2.5 rounded-xl shrink-0">
                  <QRCodeSVG 
                    value={JSON.stringify({ 
                      qr: formData.qr_code || generateEquipoQRCode(formData.name, zones.find(z => z.id === formData.zone_id)?.name),
                      n: formData.name || 'SIN-NOMBRE', 
                      t: formData.type 
                    })} 
                    size={80}
                  />
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-cyan-400 text-xs font-bold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Código QR Único Anti-Duplicados
                  </div>
                  <p className="text-xs text-slate-400">
                    Este equipo quedará registrado de forma unívoca con su código QR. Si vuelves a registrarlo o escanearlo, el sistema actualizará sus datos en lugar de duplicarlo.
                  </p>
                </div>
              </div>

              {/* Botones del Formulario */}
              <div className="pt-4 flex flex-col sm:flex-row gap-2.5 justify-end border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 text-xs sm:text-sm order-2 sm:order-1 cursor-pointer"
                >
                  Cancelar
                </button>
                
                <button 
                  type="button"
                  onClick={(e) => handleSaveEquipo(e, true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 text-xs sm:text-sm order-1 sm:order-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Guardar e Imprimir QR
                </button>

                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] text-xs sm:text-sm order-3 cursor-pointer"
                >
                  {editingId ? 'Actualizar Equipo' : 'Guardar Equipo'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SUB-MODAL: CREACIÓN RÁPIDA DE ZONA */}
      {isQuickZoneOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-cyan-800/60 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                Nueva Sucursal / Zona
              </h3>
              <button 
                type="button"
                onClick={() => { setIsQuickZoneOpen(false); setNewZoneName(''); setNewZoneAddress(''); }} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickCreateZone} autoComplete="off" className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre de la Sucursal *</label>
                <input 
                  required 
                  autoFocus
                  type="text" 
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Ej. Farmacia CV-Ayarco" 
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white placeholder-slate-500 focus:border-cyan-500 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Dirección Física <span className="text-slate-500 font-normal">(Opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={newZoneAddress}
                  onChange={(e) => setNewZoneAddress(e.target.value)}
                  placeholder="Av. Principal, local #2" 
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white placeholder-slate-500 focus:border-cyan-500 text-sm" 
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsQuickZoneOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 text-xs border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingZone}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingZone ? 'Guardando...' : (
                    <>
                      <Check className="w-4 h-4" /> Guardar y Seleccionar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* TABLA PRINCIPAL DE EQUIPOS */}
      <div className="bg-[#0f172a] rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
        
        {/* Vista Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-[#0a1128]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Equipo y Código QR</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Red / IP</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Sucursal / Zona</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEquipos.map((equipo) => (
                <tr key={equipo.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-900 text-cyan-400 rounded-xl border border-slate-700/80">
                        {equipo.type === 'Servidor' ? <Server className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{equipo.name}</span>
                          <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/60 font-semibold">
                            {equipo.qr_code || equipo.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{equipo.type} {equipo.description ? `• ${equipo.description}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60">
                      {equipo.ip || equipo.ip_address || 'DHCP'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {equipo.zones?.name || 'Sin asignar'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                      equipo.status === 'Activo' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                      equipo.status === 'Mantenimiento' ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-red-900/30 text-red-400 border-red-800'
                    }`}>
                      {equipo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5">
                    <button 
                      onClick={() => setShowQR(equipo)} 
                      className="p-2 text-cyan-400 hover:text-white hover:bg-cyan-900/40 rounded-xl transition-colors inline-flex cursor-pointer" 
                      title="Imprimir Código QR de Inventario"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditClick(equipo)} 
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-xl transition-colors inline-flex cursor-pointer" 
                      title="Editar Equipo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEquipo(equipo.id, equipo.name)} 
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-xl transition-colors inline-flex cursor-pointer" 
                      title="Eliminar Equipo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredEquipos.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-slate-900 text-slate-400 rounded-2xl border border-slate-800">
                        <Monitor className="w-8 h-8 text-slate-500" />
                      </div>
                      <div className="text-slate-300 font-bold text-sm">
                        {searchTerm ? `No se encontraron equipos con la búsqueda "${searchTerm}"` : 'No hay equipos registrados en esta sucursal'}
                      </div>
                      <p className="text-slate-500 text-xs max-w-sm">
                        {searchTerm ? 'Intenta buscar con otro término o limpia los filtros.' : 'Registra tus equipos para generar sus etiquetas QR y controlar el inventario.'}
                      </p>
                      {searchTerm ? (
                        <button 
                          onClick={() => { setSearchTerm(''); setSelectedZoneFilter('all'); }}
                          className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
                        </button>
                      ) : (
                        <button 
                          onClick={() => { resetForm(); setIsModalOpen(true); }}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Registrar Primer Equipo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil */}
        <div className="md:hidden divide-y divide-slate-800">
          {filteredEquipos.map((equipo) => (
            <div key={equipo.id} className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col gap-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-slate-900 text-cyan-400 rounded-xl border border-slate-700/80 shrink-0">
                    {equipo.type === 'Servidor' ? <Server className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">{equipo.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{equipo.type}</div>
                    <div className="font-mono text-[10px] text-cyan-400 mt-0.5 truncate font-bold">
                      {equipo.qr_code || equipo.id}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button 
                    onClick={() => setShowQR(equipo)} 
                    className="p-2 text-cyan-400 bg-cyan-950/60 rounded-xl border border-cyan-800/50 cursor-pointer"
                    title="Imprimir QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEditClick(equipo)} 
                    className="p-2 text-blue-400 bg-blue-950/60 rounded-xl border border-blue-800/50 cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteEquipo(equipo.id, equipo.name)} 
                    className="p-2 text-red-400 bg-red-950/60 rounded-xl border border-red-800/50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-cyan-400 font-mono font-bold">{equipo.ip || 'DHCP'}</span>
                  <span className="text-slate-400 font-medium">{equipo.zones?.name || 'Sin asignar'}</span>
                </div>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                  equipo.status === 'Activo' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                  equipo.status === 'Mantenimiento' ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-red-900/30 text-red-400 border-red-800'
                }`}>
                  {equipo.status}
                </span>
              </div>
            </div>
          ))}

          {filteredEquipos.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="p-3 bg-slate-900 text-slate-400 rounded-2xl border border-slate-800">
                <Monitor className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                {searchTerm ? `No se encontraron equipos con "${searchTerm}"` : 'No hay equipos registrados.'}
              </div>
              {searchTerm ? (
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedZoneFilter('all'); }}
                  className="px-3 py-1.5 bg-slate-800 text-cyan-400 font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
              ) : (
                <button 
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  + Registrar Equipo
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
