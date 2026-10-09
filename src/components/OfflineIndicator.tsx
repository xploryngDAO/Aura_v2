import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/90 backdrop-blur-xl border border-amber-400/30 text-white shadow-2xl text-xs font-medium animate-in slide-in-from-bottom-2 duration-200">
      <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
      <div className="flex flex-col">
        <span className="font-semibold text-[11px] leading-tight">Modo Offline Soberano</span>
        <span className="text-[10px] text-amber-100/90 leading-tight flex items-center gap-1">
          <Database className="w-2.5 h-2.5" /> Vault e Grafo salvos localmente
        </span>
      </div>
    </div>
  );
};
