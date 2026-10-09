import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, RefreshCw, AlertTriangle, Scan } from 'lucide-react';
import { playScanBeep } from '../lib/notificationAudio';

export default function EquipmentScannerModal({ isOpen, onClose, onScan }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const initScanner = async () => {
      try {
        setErrorMsg(null);
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        if (!devices || devices.length === 0) {
          setErrorMsg("No se detectaron cámaras en este dispositivo.");
          return;
        }

        setCameras(devices);
        
        // Priorizar cámara trasera en móviles
        const backCamera = devices.find(d => 
          d.label?.toLowerCase().includes('back') || 
          d.label?.toLowerCase().includes('trasera') ||
          d.label?.toLowerCase().includes('environment')
        ) || devices[devices.length - 1];

        const camId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(camId);
        startScanning(camId);
      } catch (err) {
        if (!mounted) return;
        console.error("Error al iniciar cámara:", err);
        setErrorMsg("Permiso de cámara denegado o no disponible en este navegador: " + (err.message || 'Error de acceso'));
      }
    };

    const timer = setTimeout(() => {
      initScanner();
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
      stopCurrentScanner();
    };
  }, [isOpen]);

  const startScanning = async (cameraId) => {
    try {
      await stopCurrentScanner();
      
      const html5QrCode = new Html5Qrcode("equipment-qr-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.75);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          playScanBeep();
          stopCurrentScanner();
          if (onScan) {
            onScan(decodedText);
          }
        },
        () => {}
      );

      setIsScanning(true);

      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }

    } catch (err) {
      console.error("Error al arrancar scanner:", err);
      setErrorMsg("No se pudo iniciar el flujo de video: " + err.message);
      setIsScanning(false);
    }
  };

  const stopCurrentScanner = async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
      } finally {
        scannerRef.current = null;
        isStoppingRef.current = false;
        setIsScanning(false);
      }
    }
  };

  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("No se pudo alternar la linterna", e);
    }
  };

  const handleChangeCamera = async (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    setTorchOn(false);
    startScanning(newId);
  };

  const handleClose = async () => {
    await stopCurrentScanner();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#0a1128]/90 backdrop-blur-md" onClick={handleClose}></div>
      
      <div className="relative bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-cyan-500/50 flex flex-col max-h-[92vh]">
        
        {/* Cabecera del Escáner */}
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0a1128]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/80 text-cyan-400 rounded-xl border border-cyan-700/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Escáner de Equipos</h3>
              <p className="text-[11px] text-cyan-400 font-medium">QR y Código de Barras (Cámara)</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor de Cámara y Área de Escaneo */}
        <div className="relative p-4 flex flex-col items-center justify-center bg-black/60 flex-1 min-h-[320px] overflow-hidden">
          
          {errorMsg ? (
            <div className="p-6 text-center max-w-sm">
              <div className="w-12 h-12 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-white font-bold text-sm mb-1">Cámara no accesible</h4>
              <p className="text-xs text-slate-400 mb-4">{errorMsg}</p>
              <button 
                onClick={() => selectedCameraId && startScanning(selectedCameraId)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors border border-slate-700 inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
            </div>
          ) : (
            <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-black flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              
              <div id="equipment-qr-reader" className="w-full h-full overflow-hidden [&_video]:object-cover [&_video]:w-full [&_video]:h-full"></div>

              <div className="absolute inset-4 pointer-events-none border border-cyan-400/30 rounded-xl flex items-center justify-center">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>

                <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-[scanLaser_2.2s_ease-in-out_infinite]"></div>
              </div>

              {!isScanning && (
                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span>Iniciando sensor de cámara...</span>
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-slate-400 px-4">
            Apunta la cámara al <strong>código QR</strong> o <strong>código de barras</strong> pegado en el equipo para abrir su información.
          </p>
        </div>

        {/* Controles inferiores */}
        <div className="px-5 py-3.5 bg-[#0a1128] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          {cameras.length > 1 && (
            <div className="flex-1 min-w-[160px]">
              <select 
                value={selectedCameraId}
                onChange={handleChangeCamera}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-cyan-500"
              >
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Cámara ${c.id.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {hasTorch && (
              <button 
                onClick={handleToggleTorch}
                title="Encender Linterna"
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  torchOn 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Flashlight className="w-4 h-4" />
                <span>{torchOn ? 'Linterna ON' : 'Linterna'}</span>
              </button>
            )}

            <button 
              onClick={handleClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 10%; opacity: 0.2; }
          50% { top: 85%; opacity: 1; }
          100% { top: 10%; opacity: 0.2; }
        }
      `}</style>
    </div>,
    document.body
  );
}
