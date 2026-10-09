import React from 'react';
import { Network, Clock, FolderKanban, MessageSquare, Plus } from 'lucide-react';

export type SovereignTab = 'graph' | 'timeline' | 'vaults' | 'chat';

interface Props {
  activeTab: SovereignTab;
  onTabChange: (tab: SovereignTab) => void;
  onOpenCapture: () => void;
  pendingDecisionCount?: number;
}

export const SovereignTabBar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  onOpenCapture,
  pendingDecisionCount = 0,
}) => {
  const handleTabClick = (tab: SovereignTab) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignored
      }
    }
    onTabChange(tab);
  };

  const handleCaptureClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignored
      }
    }
    onOpenCapture();
  };

  return (
    <nav className="h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-4 sm:px-6 bg-[#070A12]/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-between max-w-md mx-auto w-full z-30 shrink-0 touch-manipulation select-none">
      <button
        onClick={() => handleTabClick('graph')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
          activeTab === 'graph'
            ? 'text-white bg-white/[0.08] shadow-sm border border-white/[0.08]'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <Network className="w-4 h-4" />
        <span>Grafo</span>
      </button>

      <button
        onClick={() => handleTabClick('timeline')}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
          activeTab === 'timeline'
            ? 'text-white bg-white/[0.08] shadow-sm border border-white/[0.08]'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>Timeline</span>
        {pendingDecisionCount > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        )}
      </button>

      <button
        onClick={handleCaptureClick}
        className="w-9 h-9 rounded-full bg-white text-black hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95 shadow-md shadow-white/10"
        title="Nova Captura"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>

      <button
        onClick={() => handleTabClick('vaults')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
          activeTab === 'vaults'
            ? 'text-white bg-white/[0.08] shadow-sm border border-white/[0.08]'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <FolderKanban className="w-4 h-4" />
        <span>Vaults</span>
      </button>

      <button
        onClick={() => handleTabClick('chat')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
          activeTab === 'chat'
            ? 'text-white bg-white/[0.08] shadow-sm border border-white/[0.08]'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Diálogo</span>
      </button>
    </nav>
  );
};
