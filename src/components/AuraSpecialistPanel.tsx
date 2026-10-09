import React, { useState } from 'react';
import { ClusterNode, ScreenshotNode, GraphEdge, RedundancyGroup } from '../types/aura';
import {
  Cpu,
  Loader2,
  X,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clusters: ClusterNode[];
  screenshots: ScreenshotNode[];
  edges: GraphEdge[];
  onUpdateClusterSummary: (clusterId: string, summary: any) => void;
  onAddProposedEdges: (newEdges: GraphEdge[]) => void;
  onAddRedundancies: (redundancies: RedundancyGroup[]) => void;
}

export const AuraSpecialistPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  clusters,
  screenshots,
  edges,
  onUpdateClusterSummary,
  onAddProposedEdges,
  onAddRedundancies,
}) => {
  const [activeTask, setActiveTask] = useState<'cluster' | 'redundancy' | 'deep_links'>('cluster');
  const [selectedClusterId, setSelectedClusterId] = useState<string>(clusters[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleRunClusterSummary = async () => {
    const cluster = clusters.find((c) => c.id === selectedClusterId);
    if (!cluster) return;

    setIsRunning(true);
    setResultMessage(null);

    const clusterScreenshots = screenshots.filter((s) => s.clusterId === cluster.id);

    try {
      const res = await fetch('/api/specialist/cluster-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterName: cluster.name,
          clusterDescription: cluster.description,
          screenshots: clusterScreenshots,
        }),
      });

      if (!res.ok) throw new Error('Falha na síntese');

      const data = await res.json();
      if (data.summary) {
        onUpdateClusterSummary(cluster.id, data.summary);
        setResultMessage(`Síntese atualizada com sucesso para "${cluster.name}".`);
      }
    } catch (err: any) {
      console.error(err);
      setResultMessage(`Erro: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunRedundancyCheck = async () => {
    setIsRunning(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/specialist/resolve-redundancy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots }),
      });

      if (!res.ok) throw new Error('Falha na verificação de redundância');

      const data = await res.json();
      const found = data.redundanciesFound || [];

      if (found.length > 0) {
        const groups: RedundancyGroup[] = found.map((f: any, idx: number) => ({
          id: `red_gen_${Date.now()}_${idx}`,
          clusterId: f.clusterId || clusters[0]?.id || '',
          screenshotIds: f.screenshotIds || [],
          reason: f.reason || 'Capturas com sobreposição significativa.',
          recommendedKeepId: f.recommendedKeepId || f.screenshotIds?.[0],
          status: 'pending_decision',
        }));

        onAddRedundancies(groups);
        setResultMessage(`${found.length} grupo(s) de redundância propostos para decisão.`);
      } else {
        setResultMessage('Nenhuma redundância identificada no momento.');
      }
    } catch (err: any) {
      console.error(err);
      setResultMessage(`Erro: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunDeepLinks = async () => {
    setIsRunning(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/specialist/deep-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusters, screenshots }),
      });

      if (!res.ok) throw new Error('Falha na inferência de conexões');

      const data = await res.json();
      const proposed = data.proposedEdges || [];

      if (proposed.length > 0) {
        const newEdges: GraphEdge[] = proposed.map((p: any, idx: number) => ({
          id: `deep_edge_${Date.now()}_${idx}`,
          source: p.sourceId || clusters[0].id,
          target: p.targetId || clusters[1]?.id || clusters[0].id,
          type: 'deep_link',
          truthClass: 'inference',
          confidence: 'inferred',
          relation: 'semantic_analogy',
          analogyReason: p.analogyReason,
          affinityScore: p.affinityScore || 0.85,
          status: 'pending',
        }));

        onAddProposedEdges(newEdges);
        setResultMessage(`${proposed.length} nova(s) conexão(ões) proposta(s) no grafo.`);
      } else {
        setResultMessage('Nenhuma nova analogia identificada com o critério atual.');
      }
    } catch (err: any) {
      console.error(err);
      setResultMessage(`Erro: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#090D18]/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-5 space-y-4">
        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Agente de Curadoria
              </h3>
              <p className="text-[11px] text-slate-500">
                Orquestração de síntese com confirmação do usuário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Tabs */}
        <div className="flex items-center p-0.5 bg-white/[0.03] rounded-lg border border-white/[0.06] text-xs">
          <button
            onClick={() => setActiveTask('cluster')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors ${
              activeTask === 'cluster' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Síntese
          </button>
          <button
            onClick={() => setActiveTask('redundancy')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors ${
              activeTask === 'redundancy' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Redundâncias
          </button>
          <button
            onClick={() => setActiveTask('deep_links')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors ${
              activeTask === 'deep_links' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Conexões
          </button>
        </div>

        {/* Task Details */}
        <div className="space-y-3 py-1">
          {activeTask === 'cluster' && (
            <div className="space-y-3">
              <label className="text-xs text-slate-400 block font-medium">
                Cluster Temático:
              </label>
              <select
                value={selectedClusterId}
                onChange={(e) => setSelectedClusterId(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {clusters.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#090D18]">
                    {c.name} ({c.screenshotCount} itens)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Consolida os pontos-chave, entidades e citações de todos os itens deste grupo.
              </p>
            </div>
          )}

          {activeTask === 'redundancy' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Examina o acervo visual em busca de capturas parciais consecutivas e propõe a mescla sem perda de dados.
              </p>
            </div>
          )}

          {activeTask === 'deep_links' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Compara vetores conceituais entre áreas distintas para propor analogias inesperadas.
              </p>
            </div>
          )}

          {resultMessage && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resultMessage}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
          >
            Fechar
          </button>

          <button
            onClick={() => {
              if (activeTask === 'cluster') handleRunClusterSummary();
              else if (activeTask === 'redundancy') handleRunRedundancyCheck();
              else handleRunDeepLinks();
            }}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-40"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executando...</span>
              </>
            ) : (
              <>
                <span>Executar Análise</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
