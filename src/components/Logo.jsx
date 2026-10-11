import React from 'react';

/**
 * Componente de Logo Oficial para Vigilancia Digital S.A.
 * Vectorial, 100% responsive, nunca se recorta ni pierde nitidez.
 */
export default function Logo({ 
  variant = 'default', // 'default' | 'sidebar' | 'compact' | 'login'
  className = '', 
  showSubtitle = true,
  subtitle = 'S.A.' 
}) {
  if (variant === 'compact') {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
        <LogoIcon size={36} />
      </div>
    );
  }

  if (variant === 'login') {
    return (
      <div className={`flex flex-col items-center text-center gap-3 ${className}`}>
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-75"></div>
          <div className="relative p-3.5 bg-gradient-to-b from-slate-900 via-[#0a1128] to-slate-950 rounded-2xl border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
            <LogoIcon size={64} />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase font-sans">
            Vigilancia
          </span>
          <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent tracking-widest uppercase">
            Digital S.A.
          </span>
          {showSubtitle && (
            <span className="mt-1 text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-slate-400 uppercase">
              Control & Seguridad Electrónica
            </span>
          )}
        </div>
      </div>
    );
  }

  // Variante sidebar / header
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative shrink-0">
        <div className="absolute -inset-1 bg-cyan-500/20 rounded-xl blur-md"></div>
        <div className="relative p-1.5 bg-gradient-to-b from-slate-900 to-[#0a1128] rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <LogoIcon size={34} />
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-black text-white text-sm tracking-tight leading-none uppercase">
          Vigilancia
        </span>
        <span className="font-extrabold text-cyan-400 text-xs tracking-wider leading-tight uppercase mt-0.5">
          Digital <span className="text-blue-400 text-[10px] font-bold">{subtitle}</span>
        </span>
      </div>
    </div>
  );
}

// Icono Vectorial Profesional de Seguridad y Vigilancia Digital
export function LogoIcon({ size = 36 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        {/* Gradiente Escudo */}
        <linearGradient id="shieldGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>

        {/* Gradiente Borde Escudo */}
        <linearGradient id="shieldBorder" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>

        {/* Gradiente Lente Central */}
        <radialGradient id="lensGlow" cx="50" cy="50" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="40%" stopColor="#0284c7" />
          <stop offset="80%" stopColor="#0c4a6e" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        {/* Resplandor Cyan */}
        <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Escudo Base */}
      <path
        d="M50 8 L85 22 V50 C85 71 69 88 50 94 C31 88 15 71 15 50 V22 Z"
        fill="url(#shieldGrad)"
        stroke="url(#shieldBorder)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Rejilla Cibernética Interna */}
      <path
        d="M50 16 V86 M22 50 H78 M32 30 H68 M32 70 H68"
        stroke="#38bdf8"
        strokeWidth="1"
        strokeOpacity="0.25"
      />

      {/* Anillo de Apertura / Lente de Cámara de Seguridad */}
      <circle
        cx="50"
        cy="50"
        r="24"
        fill="url(#lensGlow)"
        stroke="#38bdf8"
        strokeWidth="2.5"
        filter="url(#cyanGlow)"
      />

      {/* Retícula del Lente / Sensor de Video */}
      <circle
        cx="50"
        cy="50"
        r="15"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        strokeOpacity="0.8"
      />

      {/* Pupila / Iris Digital */}
      <circle
        cx="50"
        cy="50"
        r="7"
        fill="#0284c7"
      />
      <circle
        cx="50"
        cy="50"
        r="3.5"
        fill="#ffffff"
      />

      {/* Reflejo de Lente Óptico */}
      <ellipse
        cx="44"
        cy="44"
        rx="3"
        ry="2"
        transform="rotate(-30 44 44)"
        fill="#ffffff"
        fillOpacity="0.75"
      />

      {/* Mira de Escaneo / Crosshair Nodes */}
      <path
        d="M50 20 V25 M50 75 V80 M20 50 H25 M75 50 H80"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
