import React from 'react';
import { Search, Cpu, Plus, Bell, Layers } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  screenshotCount: number;
  clusterCount: number;
  alertCount: number;
  onOpenSpecialist: () => void;
  onOpenCapture: () => void;
  onOpenAlerts: () => void;
  onOpenLaya: () => void;
}

export const HeaderNav: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  alertCount,
  onOpenSpecialist,
  onOpenCapture,
  onOpenAlerts,
  onOpenLaya,
}) => {
  return (
    <header className="h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] px-3 sm:px-6 bg-[#070A12]/90 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between gap-2 sm:gap-4 z-30 shrink-0 select-none">
      {/* Quiet Brand Identity */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          AURA
        </span>
        <span className="text-slate-600 text-xs hidden sm:inline">/</span>
        <span className="text-xs text-slate-400 font-normal hidden sm:inline">sovereign brain</span>
      </div>

      {/* Calm, Minimalist Search */}
      <div className="flex-1 max-w-sm mx-1 sm:mx-auto">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar notas, áudios, capturas..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] focus:border-white/20 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Restrained Actions + PWA Install */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <PWAInstallButton variant="compact" />

        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          title="Insights & Lembretes"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          )}
        </button>

        <button
          onClick={onOpenLaya}
          className="px-2.5 py-1.5 rounded-lg text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-medium border border-cyan-500/30 transition-colors flex items-center gap-1.5"
          title="LAYA Autonomous Decision Engine"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xs:inline">LAYA</span>
        </button>

        <button
          onClick={onOpenSpecialist}
          className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] text-xs font-medium transition-colors flex items-center gap-1.5"
          title="Aura Specialist (spec-aura)"
        >
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Agente</span>
        </button>

        <button
          onClick={onOpenCapture}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 text-xs font-semibold transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden xs:inline sm:inline">Capturar</span>
        </button>
      </div>
    </header>
  );
};

