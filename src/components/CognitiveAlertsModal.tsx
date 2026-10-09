import React, { useState } from 'react';
import { CognitiveAlert, ScreenshotNode, ClusterNode } from '../types/aura';
import {
  X,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  alerts: CognitiveAlert[];
  screenshots: ScreenshotNode[];
  clusters: ClusterNode[];
  onDismissAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  onNavigateToNode: (nodeId: string) => void;
  onGenerateNewInsights: () => Promise<void>;
  isGeneratingInsights: boolean;
}

export const CognitiveAlertsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  alerts,
  screenshots,
  clusters,
  onDismissAlert,
  onResolveAlert,
  onNavigateToNode,
  onGenerateNewInsights,
  isGeneratingInsights,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'reminder' | 'insight'>('all');

  const activeAlerts = alerts.filter((a) => {
    if (a.status === 'dismissed') return false;
    if (filterType === 'all') return true;
    if (filterType === 'reminder') return a.type === 'reminder';
    if (filterType === 'insight') return a.type === 'insight' || a.type === 'conflict';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#090D18]/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Minimal Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Insights & Lembretes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Notificações cognitivas e tarefas registradas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateNewInsights}
              disabled={isGeneratingInsights}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-40"
              title="Gerar novos insights"
            >
              {isGeneratingInsights ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quiet Filter Tabs */}
        <div className="px-6 py-2 border-b border-white/[0.04] flex items-center gap-1 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-white/[0.08] text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('reminder')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'reminder'
                ? 'bg-white/[0.08] text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Lembretes
          </button>
          <button
            onClick={() => setFilterType('insight')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'insight'
                ? 'bg-white/[0.08] text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Ideias & Sinergias
          </button>
        </div>

        {/* List of Alerts */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhuma notificação pendente.
            </div>
          ) : (
            activeAlerts.map((alert) => {
              const isResolved = alert.status === 'resolved';

              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isResolved
                      ? 'bg-white/[0.01] border-white/[0.03] opacity-50'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs font-semibold text-white truncate ${
                            isResolved ? 'line-through text-slate-500' : ''
                          }`}
                        >
                          {alert.title}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          {alert.type === 'reminder' ? 'Lembrete' : 'Insight'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="text-slate-600 hover:text-slate-400 p-1"
                      title="Dispensar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Minimal Action Row */}
                  <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-600 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <div className="flex items-center gap-3">
                      {alert.type === 'reminder' && (
                        <button
                          onClick={() => onResolveAlert(alert.id)}
                          className={`text-xs font-medium ${
                            isResolved ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {isResolved ? 'Concluído' : 'Marcar concluído'}
                        </button>
                      )}

                      {alert.relatedNodeId && (
                        <button
                          onClick={() => {
                            onNavigateToNode(alert.relatedNodeId!);
                            onClose();
                          }}
                          className="text-xs text-white hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Ver no Grafo</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
