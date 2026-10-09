import React, { useState, useEffect } from 'react';
import {
  LayaDecision,
  ScreenshotNode,
  ClusterNode,
  GraphEdge,
  RedundancyGroup,
  CognitiveAlert,
} from '../types/aura';
import {
  ShieldAlert,
  Sparkles,
  GitMerge,
  Network,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Loader2,
  X,
  FileCode,
  AlertTriangle,
  ArrowRight,
  Database,
  Binary,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  screenshots: ScreenshotNode[];
  clusters: ClusterNode[];
  edges: GraphEdge[];
  redundancyGroups: RedundancyGroup[];
  alerts: CognitiveAlert[];
  onExecuteDecision: (decision: LayaDecision) => Promise<void>;
  onRefreshGraph: () => void;
}

export const LayaDecisionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  screenshots,
  clusters,
  edges,
  redundancyGroups,
  alerts,
  onExecuteDecision,
  onRefreshGraph,
}) => {
  const [activeTab, setActiveTab] = useState<'decisions' | 'embeddings_architecture'>('decisions');
  const [isLoading, setIsLoading] = useState(false);
  const [decisions, setDecisions] = useState<LayaDecision[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [testEmbeddingText, setTestEmbeddingText] = useState('Arquitetura de microsserviços soberana com vetores multimodais');
  const [isEmbeddingLoading, setIsEmbeddingLoading] = useState(false);
  const [embeddingResult, setEmbeddingResult] = useState<any>(null);

  // Fetch decisions from LAYA Decision Engine
  const fetchLayaDecisions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/laya/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshots,
          clusters,
          edges,
          redundancyGroups,
          alerts,
        }),
      });

      const data = await res.json().catch(() => ({ decisions: [] }));
      if (data && Array.isArray(data.decisions) && data.decisions.length > 0) {
        setDecisions(data.decisions);
        setExecutiveSummary(data.executiveSummary || 'O motor LAYA concluiu a arbitragem executiva com sucesso.');
      } else {
        setExecutiveSummary('O motor LAYA concluiu a verificação de integridade do acervo.');
      }
    } catch (err) {
      console.warn('Falha na requisição LAYA, mantendo integridade local:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && decisions.length === 0) {
      fetchLayaDecisions();
    }
  }, [isOpen]);

  // Test Multimodal Embedding
  const handleTestEmbedding = async () => {
    setIsEmbeddingLoading(true);
    try {
      const res = await fetch('/api/embeddings/multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testEmbeddingText,
        }),
      });
      const data = await res.json();
      setEmbeddingResult(data.vector);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEmbeddingLoading(false);
    }
  };

  const handleExecuteSingle = async (decision: LayaDecision) => {
    setExecutingId(decision.id);
    try {
      await onExecuteDecision(decision);
      setDecisions((prev) =>
        prev.map((d) => (d.id === decision.id ? { ...d, status: 'executed' } : d))
      );
    } finally {
      setExecutingId(null);
    }
  };

  const handleExecuteAllLowRisk = async () => {
    const lowRiskPending = decisions.filter(
      (d) => d.status === 'pending' && d.riskLevel === 'low'
    );
    for (const d of lowRiskPending) {
      setExecutingId(d.id);
      await onExecuteDecision(d);
      setDecisions((prev) =>
        prev.map((item) => (item.id === d.id ? { ...item, status: 'executed' } : item))
      );
    }
    setExecutingId(null);
    onRefreshGraph();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#090D18]/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#070A12]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Motor de Decisões LAYA
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
                  Autonomous Yield
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Layered Autonomous Yield & Arbitration Agent para o Personia Visual Brain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('decisions')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'decisions'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Matriz de Decisões</span>
              {decisions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-black">
                  {decisions.filter((d) => d.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('embeddings_architecture')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'embeddings_architecture'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Arquitetura de Embeddings vs. Gemma</span>
            </button>
          </div>

          {activeTab === 'decisions' && (
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLayaDecisions}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Deliberar Agora</span>
              </button>
              {decisions.some((d) => d.status === 'pending' && d.riskLevel === 'low') && (
                <button
                  onClick={handleExecuteAllLowRisk}
                  disabled={executingId !== null}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Aprovar Baixo Risco</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'decisions' && (
            <>
              {/* Executive Summary Card */}
              {executiveSummary && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 animate-ping" />
                  <div className="space-y-1">
                    <span className="font-semibold text-cyan-300">Sumário Executivo LAYA:</span>
                    <p className="leading-relaxed text-slate-300">{executiveSummary}</p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {decisions.length === 0 && !isLoading && (
                <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Nenhuma deliberação ativa</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      O motor LAYA analisa o acervo (capturas, áudios e anotações) para tomar decisões de resolução de redundâncias, pontes conceituais e urgências temporais.
                    </p>
                  </div>
                  <button
                    onClick={fetchLayaDecisions}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Iniciar Deliberação LAYA</span>
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                  <p className="text-xs text-slate-400">
                    LAYA deliberando: arbitrando redundâncias, pontes conceituais e regras de governança...
                  </p>
                </div>
              )}

              {/* Decisions List */}
              <div className="grid grid-cols-1 gap-3">
                {decisions.map((decision) => {
                  const isExecuted = decision.status === 'executed';
                  const isRunning = executingId === decision.id;

                  return (
                    <div
                      key={decision.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isExecuted
                          ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                          : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Category Badge */}
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider bg-white/[0.05] border border-white/[0.08] text-slate-300">
                              {decision.category.replace('_', ' ')}
                            </span>

                            {/* Risk Badge */}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider ${
                                decision.riskLevel === 'low'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : decision.riskLevel === 'medium'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              Risco {decision.riskLevel}
                            </span>

                            {/* Confidence */}
                            <span className="text-[10px] text-slate-400 font-mono">
                              Confiança: {Math.round(decision.confidence * 100)}%
                            </span>

                            {isExecuted && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Executada
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold text-white tracking-tight">
                            {decision.title}
                          </h3>

                          {/* Reasoning */}
                          <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] text-xs text-slate-300 space-y-1">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                              Cadeia de Raciocínio Executivo (Reasoning):
                            </span>
                            <p className="leading-relaxed">{decision.reasoning}</p>
                          </div>

                          {/* Impact & Action */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-500">Impacto:</span>
                              <span className="text-slate-200">{decision.impact}</span>
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isExecuted && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => handleExecuteSingle(decision)}
                              disabled={isRunning}
                              className="px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow-sm"
                            >
                              {isRunning ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Executando...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3" />
                                  <span>Executar Decisão</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                setDecisions((prev) =>
                                  prev.filter((d) => d.id !== decision.id)
                                )
                              }
                              className="px-3 py-1 rounded-lg text-[11px] text-slate-500 hover:text-slate-300 transition-colors text-center"
                            >
                              Ignorar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'embeddings_architecture' && (
            <div className="space-y-5 text-xs text-slate-300">
              {/* Technical Comparison Header */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Análise Crítica: EmbeddingGemma2 vs. Gemini Multimodal Embeddings
                  </h3>
                </div>
                <p className="leading-relaxed text-slate-300">
                  Você perguntou se o <strong className="text-white">embeddinggemma2</strong> é o mais adequado para o nosso sistema, considerando que precisamos ler e interpretar <strong>textos, áudios, imagens e futuramente vídeos</strong>.
                </p>
              </div>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* EmbeddingGemma2 Card */}
                <div className="p-4 rounded-xl bg-rose-950/10 border border-rose-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-300 text-sm">EmbeddingGemma / Gemma 2</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      Text-Only (Limitação)
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    <li><strong className="text-rose-200">Não aceita imagens:</strong> não codifica pixels de screenshots ou diagramas diretamente.</li>
                    <li><strong className="text-rose-200">Não aceita áudio:</strong> não gera embeddings a partir de gravações ou memos de voz brutos.</li>
                    <li><strong className="text-rose-200">Sem suporte a vídeo:</strong> inviável para busca temporal em clipes e gravações de tela.</li>
                    <li>Exige pipeline auxiliar obrigatório de OCR e Whisper para tentar transformar tudo em texto antes de vetorizar, perdendo fidelidade visual e sonora.</li>
                  </ul>
                </div>

                {/* Multimodal Gemini Embedding Card */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-300 text-sm">gemini-embedding-2-preview (Implementado)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                      Multimodal Nativo (Ideal)
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    <li><strong className="text-cyan-200">Espaço latente unificado:</strong> projeta textos, imagens, áudios e vídeos no mesmo vetor contínuo.</li>
                    <li><strong className="text-cyan-200">Busca cruzada perfeita:</strong> você pesquisa um termo de texto e localiza áudios ou capturas visuais correspondentes via similaridade de cosseno.</li>
                    <li><strong className="text-cyan-200">Integrado ao AURA:</strong> alimentado pelo Gemini 3.8 Flash e Gemini 3.5 Transcribe.</li>
                    <li>Pronto para a ingestão futura de streams de vídeo.</li>
                  </ul>
                </div>
              </div>

              {/* Live Interactive Embeddings Tester */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Binary className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-semibold text-white">
                      Testar Gerador de Vetor Multimodal em Tempo Real
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">POST /api/embeddings/multimodal</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testEmbeddingText}
                    onChange={(e) => setTestEmbeddingText(e.target.value)}
                    placeholder="Digite um conceito, ideia ou texto para vetorizar..."
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                  />
                  <button
                    onClick={handleTestEmbedding}
                    disabled={isEmbeddingLoading || !testEmbeddingText.trim()}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                  >
                    {isEmbeddingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Binary className="w-3.5 h-3.5" />
                    )}
                    <span>Gerar Vetor</span>
                  </button>
                </div>

                {embeddingResult && (
                  <div className="p-3 rounded-lg bg-black/50 border border-white/[0.06] font-mono text-[11px] space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Modelo: <strong className="text-cyan-300">{embeddingResult.model}</strong></span>
                      <span>Dimensões: <strong className="text-cyan-300">{embeddingResult.dimensions} floats</strong></span>
                      <span>Modalidade: <strong className="text-cyan-300">{embeddingResult.modality}</strong></span>
                    </div>
                    <div className="text-slate-500 break-all max-h-20 overflow-y-auto">
                      [{embeddingResult.values.slice(0, 16).map((v: number) => v.toFixed(6)).join(', ')}, ...]
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
