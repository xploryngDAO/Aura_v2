import React, { useState } from 'react';
import { Download, Share, PlusSquare, Check, X, ShieldCheck, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  variant?: 'compact' | 'prominent' | 'mobile_dock';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running in standalone native PWA mode, don't show the prompt button
  if (isInstalled) {
    return null;
  }

  // Handle clicking the install trigger
  const handleTrigger = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed && isIOS) {
        setShowIOSModal(true);
      }
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleTrigger}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 text-xs font-medium transition-all active:scale-95 shadow-sm"
          title="Instalar AURA no dispositivo (PWA Soberano)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">App</span>
        </button>
      ) : variant === 'mobile_dock' ? (
        <button
          onClick={handleTrigger}
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-400/20 text-cyan-200 text-xs font-semibold shadow-lg backdrop-blur-xl transition-all active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Instalar Aura no Dispositivo (PWA)</span>
        </button>
      ) : (
        <button
          onClick={handleTrigger}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-semibold transition-all shadow-md active:scale-95"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Instalar Aura PWA</span>
        </button>
      )}

      {/* Guided Sovereign Glass Installation Dialog (iOS & General Mobile Guidance) */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#080D1A]/95 backdrop-blur-2xl border border-white/[0.12] p-6 shadow-2xl space-y-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Aura Identity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center p-1 shadow-lg shadow-cyan-500/20">
                  <img src="/icon.svg" alt="AURA" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                    AURA Sovereign PWA
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400">Instalação Nativa no Dispositivo</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sovereign Benefits */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Experiência em tela cheia sem barras do navegador</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Acesso offline ultra-rápido via cache local do Vault</span>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                {isIOS ? 'Como instalar no iPhone / iPad (Safari)' : 'Como instalar no seu navegador'}
              </h4>

              {isIOS ? (
                <ol className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-1 rounded bg-white/[0.06] text-cyan-400">
                      <Share className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white">1. Toque em Compartilhar</strong>
                      <p className="text-[11px] text-slate-400">No menu inferior do Safari.</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-1 rounded bg-white/[0.06] text-cyan-400">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white">2. Adicionar à Tela de Início</strong>
                      <p className="text-[11px] text-slate-400">Role para baixo e selecione a opção.</p>
                    </div>
                  </li>
                </ol>
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-slate-300 space-y-2">
                  <p>
                    Toque no botão do menu do navegador (<strong className="text-white">⋮</strong> ou{' '}
                    <strong className="text-white">Compartilhar</strong>) e escolha{' '}
                    <strong className="text-cyan-300">"Instalar aplicativo"</strong> ou{' '}
                    <strong className="text-cyan-300">"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors shadow-lg active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
