import React, { useState } from 'react';
import { ScreenshotNode, RedundancyGroup, ClusterNode } from '../types/aura';
import {
  Calendar,
  ChevronRight,
  ShieldCheck,
  Mic,
  FileText,
  Camera,
  Play,
  Pause,
  Clock,
} from 'lucide-react';

interface Props {
  screenshots: ScreenshotNode[];
  clusters: ClusterNode[];
  redundancyGroups: RedundancyGroup[];
  onSelectNode: (node: ScreenshotNode) => void;
  onResolveRedundancy: (groupId: string, decision: 'merge_archive' | 'keep_all') => void;
}

export const TimelineView: React.FC<Props> = ({
  screenshots,
  clusters,
  redundancyGroups,
  onSelectNode,
  onResolveRedundancy,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'voice' | 'screenshots'>('all');
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  const filteredScreenshots = screenshots.filter((s) => {
    if (filterType === 'screenshots') return !s.itemType || s.itemType === 'screenshot';
    if (filterType === 'notes') return s.itemType === 'text_note';
    if (filterType === 'voice') return s.itemType === 'voice_audio';
    return true;
  });

  const sorted = [...filteredScreenshots].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const groups: { [dateStr: string]: ScreenshotNode[] } = {};
  sorted.forEach((item) => {
    const d = item.timestamp ? item.timestamp.slice(0, 10) : 'Sem Data';
    if (!groups[d]) groups[d] = [];
    groups[d].push(item);
  });

  const handleTogglePlayAudio = (e: React.MouseEvent, node: ScreenshotNode) => {
    e.stopPropagation();
    if (activePlayingId === node.id) {
      setActivePlayingId(null);
    } else {
      setActivePlayingId(node.id);
      setTimeout(() => {
        setActivePlayingId((current) => (current === node.id ? null : current));
      }, (node.audioDuration || 14) * 1000);
    }
  };

  const pendingGroups = redundancyGroups.filter((g) => g.status === 'pending_decision');

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full space-y-6 select-text">
      {/* Quiet Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">Linha do Tempo</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fluxo cronológico de pensamentos, gravações e capturas
          </p>
        </div>

        {/* Clean Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-white/[0.1] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tudo
          </button>
          <button
            onClick={() => setFilterType('notes')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'notes'
                ? 'bg-white/[0.1] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Notas
          </button>
          <button
            onClick={() => setFilterType('voice')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'voice'
                ? 'bg-white/[0.1] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Áudios
          </button>
          <button
            onClick={() => setFilterType('screenshots')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'screenshots'
                ? 'bg-white/[0.1] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Imagens
          </button>
        </div>
      </div>

      {/* Redundancy Decision Gates (Quiet & Clean) */}
      {pendingGroups.map((group) => {
        const groupScreenshots = screenshots.filter((s) => group.screenshotIds.includes(s.id));

        return (
          <div
            key={group.id}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-medium">Curadoria de Redundância</span>
              <span className="text-slate-500">{groupScreenshots.length} capturas semelhantes</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {group.reason}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => onResolveRedundancy(group.id, 'keep_all')}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
              >
                Manter todas
              </button>
              <button
                onClick={() => onResolveRedundancy(group.id, 'merge_archive')}
                className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 font-semibold text-xs transition-colors"
              >
                Mesclar
              </button>
            </div>
          </div>
        );
      })}

      {/* Chronological Stream */}
      <div className="space-y-8">
        {Object.entries(groups).map(([dateStr, items]) => (
          <div key={dateStr} className="space-y-3">
            {/* Date Separator */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>{dateStr}</span>
              <span className="text-slate-700">·</span>
              <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
            </div>

            {/* Clean Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((node) => {
                const cluster = clusters.find((c) => c.id === node.clusterId);
                const isPlaying = activePlayingId === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    className="group p-3.5 rounded-2xl bg-[#090D18]/80 hover:bg-[#0C1220] border border-white/[0.06] hover:border-white/15 transition-all cursor-pointer space-y-2.5"
                  >
                    {/* Top Row: Type & Time */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        {node.itemType === 'voice_audio' ? (
                          <>
                            <Mic className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Voz</span>
                          </>
                        ) : node.itemType === 'text_note' ? (
                          <>
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            <span>Nota</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{node.sourceApp}</span>
                          </>
                        )}
                      </div>

                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(node.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Media Representation */}
                    {node.itemType === 'voice_audio' ? (
                      <div className="h-24 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400">
                            {node.audioDuration || 14}s
                          </span>
                          <button
                            onClick={(e) => handleTogglePlayAudio(e, node)}
                            className="p-1.5 rounded-full bg-white text-black hover:bg-slate-200 transition-colors"
                          >
                            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-black" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate italic">
                          "{node.ocrText}"
                        </p>
                      </div>
                    ) : node.itemType === 'text_note' ? (
                      <div className="h-24 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex flex-col justify-between">
                        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-sans">
                          {node.ocrText}
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {node.ocrText?.length || 0} caracteres
                        </span>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl overflow-hidden bg-black/40 relative border border-white/[0.06]">
                        <img
                          src={node.imageUrl}
                          alt={node.filename}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                        />
                        {node.lgpdMasked && (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> LGPD
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <div>
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {node.filename}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {cluster?.name || 'Sem cluster'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
