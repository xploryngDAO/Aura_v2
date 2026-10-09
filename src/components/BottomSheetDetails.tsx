import React, { useState, useRef, useEffect } from 'react';
import { ScreenshotNode, ClusterNode, GraphEdge } from '../types/aura';
import {
  X,
  FileText,
  MessageSquare,
  Share2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  Link2,
  Check,
  Copy,
  Mic,
  Play,
  Pause,
  Clock,
  Maximize2,
} from 'lucide-react';

interface Props {
  node: ScreenshotNode | ClusterNode | null;
  allScreenshots: ScreenshotNode[];
  allClusters: ClusterNode[];
  edges: GraphEdge[];
  onClose: () => void;
  onUpdateScreenshot: (updated: ScreenshotNode) => void;
  onUpdateCluster: (updated: ClusterNode) => void;
  onOpenChatWithNode: (nodeId: string) => void;
  onAcceptEdge: (edgeId: string) => void;
  onDismissEdge: (edgeId: string) => void;
  onPurgeNode: (id: string, type: 'screenshot' | 'cluster') => void;
}

export const BottomSheetDetails: React.FC<Props> = ({
  node,
  allScreenshots,
  allClusters,
  edges,
  onClose,
  onUpdateScreenshot,
  onUpdateCluster,
  onOpenChatWithNode,
  onAcceptEdge,
  onDismissEdge,
  onPurgeNode,
}) => {
  const isScreenshot = node ? 'filename' in node : false;
  const screenshot = node && isScreenshot ? (node as ScreenshotNode) : null;
  const cluster = node && !isScreenshot ? (node as ClusterNode) : null;

  // Local editing states
  const [activeTab, setActiveTab] = useState<'overview' | 'text' | 'connections'>('overview');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(isScreenshot ? screenshot?.filename || '' : cluster?.name || '');

  const [ocrTextValue, setOcrTextValue] = useState(
    screenshot ? screenshot.userEditedText || screenshot.ocrText : ''
  );
  const [isSavingOcr, setIsSavingOcr] = useState(false);
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Audio Playback State for Voice memos
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Relevant edges for this node
  const relevantEdges = node ? edges.filter(
    (e) => e.source === node.id || e.target === node.id
  ) : [];
  const deepLinkEdges = relevantEdges.filter((e) => e.type === 'deep_link');

  // Sync title and text when selected node changes
  useEffect(() => {
    if (!node) return;
    const isSc = 'filename' in node;
    const sc = isSc ? (node as ScreenshotNode) : null;
    const cl = !isSc ? (node as ClusterNode) : null;
    setTitleValue(isSc ? sc?.filename || '' : cl?.name || '');
    setOcrTextValue(sc ? sc.userEditedText || sc.ocrText : '');
    setIsEditingTitle(false);
    setIsPlayingAudio(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [node]);

  const handleSaveTitle = () => {
    if (!titleValue) return;
    if (screenshot) {
      onUpdateScreenshot({ ...screenshot, filename: titleValue });
    } else if (cluster) {
      onUpdateCluster({ ...cluster, name: titleValue });
    }
    setIsEditingTitle(false);
  };

  const handleSaveOcr = () => {
    if (!screenshot) return;
    setIsSavingOcr(true);
    onUpdateScreenshot({
      ...screenshot,
      userEditedText: ocrTextValue,
    });
    setTimeout(() => setIsSavingOcr(false), 500);
  };

  const handleCopyOcr = () => {
    navigator.clipboard.writeText(ocrTextValue);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 1200);
  };

  const handleToggleReminder = () => {
    if (!screenshot) return;
    onUpdateScreenshot({
      ...screenshot,
      reminderResolved: !screenshot.reminderResolved,
    });
  };

  const toggleAudio = () => {
    if (!audioRef.current && screenshot?.audioUrl) {
      audioRef.current = new Audio(screenshot.audioUrl);
      audioRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlayingAudio(true);
      }
    } else {
      if (isPlayingAudio) {
        setIsPlayingAudio(false);
      } else {
        setIsPlayingAudio(true);
        setTimeout(() => setIsPlayingAudio(false), 14000);
      }
    }
  };

  const handleExportSingle = () => {
    const text = isScreenshot
      ? `# ${screenshot?.filename}\n\n**Data**: ${screenshot?.timestamp}\n**Tipo**: ${screenshot?.itemType || 'screenshot'}\n\n${screenshot?.userEditedText || screenshot?.ocrText}`
      : `# Cluster: ${cluster?.name}\n\n${cluster?.description}\n\n${cluster?.summary.keyTakeaways.join('\n- ')}`;

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(isScreenshot ? screenshot?.filename : cluster?.name) || 'export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!node) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] h-[78vh] flex flex-col bg-[#070A12]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-3xl shadow-2xl transition-all select-text">
        {/* Subtle grab bar */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-1 rounded-full bg-white/15" />
        </div>

        {/* Minimal Header */}
        <div className="px-6 py-3 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-0.5">
              <span>{isScreenshot ? screenshot?.sourceApp : 'Cluster'}</span>
              <span>·</span>
              <span>{new Date(node ? ('timestamp' in node ? node.timestamp : node.lastSynthesized) : '').toLocaleDateString()}</span>
              {screenshot?.isReminder && (
                <>
                  <span>·</span>
                  <span className="text-amber-400 font-medium">Lembrete</span>
                </>
              )}
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleValue || ''}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/20 rounded-lg px-2.5 py-1 text-white text-sm font-semibold focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1.5 bg-white text-black rounded-lg text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-base font-semibold text-white truncate tracking-tight">
                  {isScreenshot ? screenshot?.filename : cluster?.name}
                </h2>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity p-0.5"
                  title="Editar título"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onOpenChatWithNode(node.id)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 font-medium transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Diálogo</span>
            </button>

            <button
              onClick={handleExportSingle}
              title="Exportar Markdown"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quiet Segmented Navigation */}
        <div className="px-6 py-2 border-b border-white/[0.04] flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white/[0.08] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Conteúdo
          </button>

          {isScreenshot && (
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'text'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Texto & Transcrição
            </button>
          )}

          <button
            onClick={() => setActiveTab('connections')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'connections'
                ? 'bg-white/[0.08] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Conexões ({deepLinkEdges.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 max-w-4xl mx-auto w-full space-y-6">
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Voice Memo View */}
              {isScreenshot && screenshot?.itemType === 'voice_audio' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleAudio}
                        className="w-10 h-10 rounded-full bg-white text-black hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-black" />}
                      </button>
                      <div>
                        <div className="text-xs font-semibold text-white">Gravação de Voz</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {screenshot.audioDuration || 14} segundos
                        </div>
                      </div>
                    </div>

                    {screenshot.isReminder && (
                      <button
                        onClick={handleToggleReminder}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          screenshot.reminderResolved
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {screenshot.reminderResolved ? 'Lembrete Concluído' : 'Marcar Concluído'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                      Transcrição
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed font-sans select-text">
                      {screenshot.userEditedText || screenshot.ocrText}
                    </p>
                  </div>
                </div>
              )}

              {/* Text Note View */}
              {isScreenshot && screenshot?.itemType === 'text_note' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-white/[0.04] pb-2">
                      <span>Anotação</span>
                      {screenshot.isReminder && (
                        <button
                          onClick={handleToggleReminder}
                          className={`text-xs font-medium ${
                            screenshot.reminderResolved ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {screenshot.reminderResolved ? 'Lembrete Concluído' : 'Lembrete Ativo'}
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text">
                      {screenshot.userEditedText || screenshot.ocrText}
                    </div>
                  </div>
                </div>
              )}

              {/* Screenshot View */}
              {isScreenshot && (!screenshot?.itemType || screenshot?.itemType === 'screenshot') && (
                <div className="space-y-4">
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="group relative rounded-2xl overflow-hidden bg-black/40 border border-white/[0.06] flex items-center justify-center max-h-72 cursor-zoom-in"
                  >
                    <img
                      src={screenshot?.imageUrl}
                      alt={screenshot?.filename}
                      className="max-h-72 object-contain w-full"
                    />
                    <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                      Resumo da Captura
                    </span>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {screenshot?.visualContext.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Cluster View */}
              {cluster && (
                <div className="space-y-5">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {cluster.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                      Key Takeaways
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
                      {cluster.summary.keyTakeaways.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Text / Transcript Editor */}
          {activeTab === 'text' && isScreenshot && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Texto sob custódia e correção soberana</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyOcr}
                    className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedOcr ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleSaveOcr}
                    disabled={isSavingOcr}
                    className="px-3 py-1 rounded-lg bg-white text-black hover:bg-slate-200 font-semibold text-xs"
                  >
                    {isSavingOcr ? 'Salvo' : 'Salvar'}
                  </button>
                </div>
              </div>

              <textarea
                value={ocrTextValue}
                onChange={(e) => setOcrTextValue(e.target.value)}
                rows={10}
                className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-200 text-xs font-sans leading-relaxed focus:outline-none focus:border-white/20 resize-y"
              />
            </div>
          )}

          {/* Tab 3: Connections */}
          {activeTab === 'connections' && (
            <div className="space-y-3">
              {deepLinkEdges.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Nenhuma conexão inferida para este item.
                </p>
              ) : (
                deepLinkEdges.map((edge) => {
                  const otherNodeId = edge.source === node.id ? edge.target : edge.source;
                  const otherScreenshot = allScreenshots.find((s) => s.id === otherNodeId);
                  const otherCluster = allClusters.find((c) => c.id === otherNodeId);
                  const otherName = otherScreenshot?.filename || otherCluster?.name || otherNodeId;

                  return (
                    <div
                      key={edge.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{otherName}</span>
                        {edge.status === 'accepted' ? (
                          <span className="text-emerald-400 text-[11px]">Conectado</span>
                        ) : (
                          <button
                            onClick={() => onAcceptEdge(edge.id)}
                            className="text-xs text-cyan-400 hover:underline"
                          >
                            Aceitar no Grafo
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {edge.analogyReason}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Danger Zone: Clean minimal footer */}
          <div className="pt-4 border-t border-white/[0.04]">
            {confirmPurge ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-400">Confirmar exclusão definitiva?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmPurge(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => onPurgeNode(node.id, isScreenshot ? 'screenshot' : 'cluster')}
                    className="text-rose-400 font-semibold hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmPurge(true)}
                className="text-xs text-slate-600 hover:text-rose-400 transition-colors"
              >
                Direito ao Esquecimento (Expurgar)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && screenshot?.imageUrl && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl cursor-zoom-out"
        >
          <img
            src={screenshot.imageUrl}
            alt={screenshot.filename}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
          />
        </div>
      )}
    </>
  );
};
