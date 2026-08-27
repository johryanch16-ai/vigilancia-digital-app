import React from 'react';
import TicketForm from './TicketForm';
import { Shield, Cctv } from 'lucide-react';

function AppClient() {
  return (
    <div className="min-h-screen bg-[#0a1128] py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
        <div className="absolute top-40 -left-20 w-[500px] h-[500px] bg-cyan-500 rounded-full mix-blend-screen filter blur-[150px] opacity-15"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDB2NDBoNDBWMEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]"></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <header className="mb-10 text-center sm:text-left flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-20 h-20 bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden p-0.5">
            <img src="/logo.jpg" alt="Vigilancia Digital" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight">
              Vigilancia Digital S.A.
            </h1>
            <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <p className="text-blue-300 text-sm font-medium tracking-[0.2em] uppercase">
                Plataforma de Operaciones IT
              </p>
            </div>
          </div>
        </header>
        <main>
          <TicketForm />
        </main>
      </div>
    </div>
  );
}

export default AppClient;
