import React, { useState } from 'react';
import { CognitiveAlert, ScreenshotNode } from '../types/aura';
import {
  Bell,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  RefreshCw,
  Loader2,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  alerts: CognitiveAlert[];
  allNodes: ScreenshotNode[];
  onDismissAlert: (id: string) => void;
  onResolveAlert: (id: string) => void;
  onFocusNodeInGraph: (nodeId: string) => void;
  onScanNewInsights: () => Promise<void>;
}

export const CognitiveAlertsPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  alerts,
  allNodes,
  onDismissAlert,
  onResolveAlert,
  onFocusNodeInGraph,
  onScanNewInsights,
}) => {
  const [isScanning, setIsScanning] = useState(false);

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  const handleScanClick = async () => {
    setIsScanning(true);
    try {
      await onScanNewInsights();
    } finally {
      setIsScanning(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'insight':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      case 'conflict':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl select-text">
      <div className="w-full max-w-lg rounded-3xl bg-[#0C101A] border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Alertas Cognitivos & Insights Proativos
              </h3>
              <p className="text-xs text-slate-400">
                {activeAlerts.length} alerta(s) ativo(s) detectado(s) em suas notas e áudios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Feed Cognitivo
          </span>
          <button
            onClick={handleScanClick}
            disabled={isScanning}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Analisando Ideias...' : 'Escanear Novos Insights'}</span>
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activeAlerts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
              <p className="text-sm font-semibold text-white">Tudo em dia!</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Nenhum lembrete pendente ou conflito detectado. Grave uma nota de voz ou anote uma ideia para que o Aura gere insights automáticos.
              </p>
            </div>
          ) : (
            activeAlerts.map((alert) => {
              const relatedItem = allNodes.find((n) => n.id === alert.relatedNodeId);

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    alert.priority === 'high'
                      ? 'bg-cyan-950/20 border-cyan-500/40'
                      : alert.type === 'conflict'
                      ? 'bg-amber-950/20 border-amber-500/35'
                      : 'bg-white/[0.025] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.type)}
                      <h4 className="text-xs font-bold text-white tracking-tight">
                        {alert.title}
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(alert.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {alert.description}
                  </p>

                  {relatedItem && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-white/[0.05]">
                      <span>Origem:</span>
                      <strong className="text-cyan-300 truncate">
                        {relatedItem.filename}
                      </strong>
                      <span>({relatedItem.sourceApp})</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-[11px] transition-colors"
                    >
                      Descartar
                    </button>

                    {alert.type === 'reminder' && (
                      <button
                        onClick={() => onResolveAlert(alert.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-semibold transition-all active:scale-95"
                      >
                        <Check className="w-3 h-3" />
                        <span>Concluir Lembrete</span>
                      </button>
                    )}

                    {alert.relatedNodeId && (
                      <button
                        onClick={() => {
                          onFocusNodeInGraph(alert.relatedNodeId!);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-[11px] font-bold transition-all shadow-sm active:scale-95"
                      >
                        <span>{alert.actionLabel || 'Ver no Grafo'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Resolved Section if any */}
          {resolvedAlerts.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Concluídos Recentemente ({resolvedAlerts.length})
              </span>
              <div className="space-y-1.5 opacity-60">
                {resolvedAlerts.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-400"
                  >
                    <span className="line-through truncate">{r.title}</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
