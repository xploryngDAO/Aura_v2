import React, { useState, useEffect } from 'react';
import { VaultSource, ScreenshotNode, ClusterNode, LgpdReceipt } from '../types/aura';
import { googleSignIn, getAccessToken, logout, initAuth } from '../lib/auth';
import {
  listDriveImageFiles,
  listDriveFolders,
  fetchDriveFileBase64,
  DriveFile,
  DriveFolder,
} from '../lib/drive';
import { computeContentHash, generateObsidianExportBundle, purgeWithRightToBeForgotten } from '../lib/storage';
import { calculateNextNodePosition } from '../lib/graphLayout';
import {
  FolderKanban,
  HardDrive,
  Cloud,
  RefreshCw,
  Download,
  ShieldCheck,
  FileText,
  Trash2,
  CheckCircle2,
  Lock,
  ExternalLink,
  Plus,
  Loader2,
  ArrowRight,
  Database,
  Folder,
  FolderOpen,
  Search,
  Check,
  Sparkles,
  Layers,
  ChevronRight,
  Mic,
  Clock,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface Props {
  vaults: VaultSource[];
  screenshots: ScreenshotNode[];
  clusters: ClusterNode[];
  onImportNewScreenshot: (node: ScreenshotNode) => void;
  onRefreshStorage: () => void;
}

export const VaultLibrary: React.FC<Props> = ({
  vaults,
  screenshots,
  clusters,
  onImportNewScreenshot,
  onRefreshStorage,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'drive' | 'governance'>('sources');

  // Google Drive state
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'Meu Drive' },
  ]);
  const [driveSearch, setDriveSearch] = useState('');
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  // LGPD / Governance
  const [lgpdReceipts, setLgpdReceipts] = useState<LgpdReceipt[]>([]);
  const [purgeTargetId, setPurgeTargetId] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveToken(token);
        loadDriveContent(token, currentFolderId, driveSearch);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignInGoogle = async () => {
    setIsDriveLoading(true);
    setDriveError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setDriveUser(res.user);
        setDriveToken(res.accessToken);
        await loadDriveContent(res.accessToken, 'root');
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      setDriveError(err.message || 'Falha ao autenticar com o Google Drive');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSignOutGoogle = async () => {
    await logout();
    setDriveUser(null);
    setDriveToken(null);
    setDriveFiles([]);
    setDriveFolders([]);
    setFolderPath([{ id: 'root', name: 'Meu Drive' }]);
  };

  const loadDriveContent = async (token: string, folderId: string, search?: string) => {
    setIsDriveLoading(true);
    setDriveError(null);
    try {
      const [files, folders] = await Promise.all([
        listDriveImageFiles(token, folderId, search),
        listDriveFolders(token, folderId),
      ]);
      setDriveFiles(files);
      setDriveFolders(folders);
    } catch (err: any) {
      console.error('Error loading drive content:', err);
      setDriveError(err.message || 'Erro ao carregar conteúdo do Google Drive');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleFolderClick = (folder: DriveFolder) => {
    if (!driveToken) return;
    const newPath = [...folderPath, { id: folder.id, name: folder.name }];
    setFolderPath(newPath);
    setCurrentFolderId(folder.id);
    loadDriveContent(driveToken, folder.id, driveSearch);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (!driveToken) return;
    const target = folderPath[index];
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(target.id);
    loadDriveContent(driveToken, target.id, driveSearch);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveToken) return;
    loadDriveContent(driveToken, currentFolderId, driveSearch);
  };

  const isFileAlreadyInVault = (file: DriveFile) => {
    return screenshots.some(
      (s) => s.filename.toLowerCase() === file.name.toLowerCase()
    );
  };

  const handleImportDriveFile = async (file: DriveFile) => {
    if (!driveToken) return;
    setImportingFileId(file.id);
    try {
      const { base64, mimeType } = await fetchDriveFileBase64(file.id, driveToken);
      const contentHash = await computeContentHash(base64);

      const existing = screenshots.find((s) => s.contentHash === contentHash);
      if (existing) {
        alert(`Esta captura já reside no seu Vault Soberano (Arquivo: ${existing.filename}). Ingestão idempotente mantida.`);
        setImportingFileId(null);
        return;
      }

      const visionRes = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          filename: file.name,
        }),
      });

      const visionData = await visionRes.json();
      const analysis = visionData.analysis || {};

      const matchedCluster =
        clusters.find((c) =>
          c.name.toLowerCase().includes((analysis.suggestedCluster || '').toLowerCase())
        ) || clusters[0];

      const nodePos = calculateNextNodePosition(matchedCluster.id, screenshots, clusters);

      const newNode: ScreenshotNode = {
        id: `node_drive_${Date.now()}`,
        contentHash,
        vaultSourceId: 'google-drive',
        filename: file.name,
        timestamp: file.createdTime || new Date().toISOString(),
        imageUrl: base64,
        sourceApp: analysis.sourceApp || 'Google Drive',
        ocrText: analysis.ocrText || 'Texto extraído do Drive.',
        visualContext: analysis.visualContext || {
          type: 'other',
          confidence: 0.9,
          summary: analysis.title || 'Imagem importada do Google Drive',
        },
        clusterId: matchedCluster.id,
        tags: analysis.suggestedTags || ['google-drive', 'vault'],
        lgpdMasked: analysis.isSensitive || false,
        lgpdFindings: analysis.lgpdFindings || [],
        x: nodePos.x,
        y: nodePos.y,
      };

      onImportNewScreenshot(newNode);
    } catch (err: any) {
      console.error('Import error:', err);
      alert(`Falha ao importar "${file.name}": ${err.message}`);
    } finally {
      setImportingFileId(null);
    }
  };

  // Sync all non-imported screenshots in the active Drive folder
  const handleBatchSyncFolder = async () => {
    if (!driveToken || driveFiles.length === 0) return;

    const unimported = driveFiles.filter((f) => !isFileAlreadyInVault(f));
    if (unimported.length === 0) {
      alert('Todas as capturas desta pasta já estão sincronizadas no seu Vault Soberano!');
      return;
    }

    setIsBatchSyncing(true);
    setBatchProgress({ current: 0, total: unimported.length });

    let count = 0;
    for (let i = 0; i < unimported.length; i++) {
      const file = unimported[i];
      setBatchProgress({ current: i + 1, total: unimported.length });
      try {
        await handleImportDriveFile(file);
        count++;
      } catch (e) {
        console.warn(`Erro ao sincronizar ${file.name}:`, e);
      }
    }

    setIsBatchSyncing(false);
    setBatchProgress(null);
    alert(`Sincronização concluída! ${count} nova(s) captura(s) ingerida(s) no Cognitive Graph.`);
  };

  const handleExportObsidian = () => {
    const bundle = generateObsidianExportBundle(screenshots, clusters);
    const blob = new Blob([bundle.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bundle.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecutePurge = async () => {
    if (!purgeTargetId.trim()) return;
    setIsPurging(true);
    try {
      const receipt = await purgeWithRightToBeForgotten(purgeTargetId, 'screenshot');
      setLgpdReceipts((prev) => [receipt, ...prev]);
      onRefreshStorage();
      setPurgeTargetId('');
      alert(`Nó expurgado com sucesso. Recibo emitido: ${receipt.cryptographicSignature.slice(0, 20)}...`);
    } catch (err: any) {
      alert(`Erro ao expurgar: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  const driveImportedCount = screenshots.filter((s) => s.vaultSourceId === 'google-drive').length;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full space-y-6 select-text">
      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Fontes & Custódia
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Armazenamento soberano local-first e adaptadores sincronizados
          </p>
        </div>

        <button
          onClick={handleExportObsidian}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-slate-300 hover:text-white border border-white/[0.08] transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Obsidian</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
            activeTab === 'sources'
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Fontes ({vaults.length})
        </button>

        <button
          onClick={() => setActiveTab('drive')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
            activeTab === 'drive'
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Google Drive {driveUser ? '(Conectado)' : ''}
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
            activeTab === 'governance'
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Governança LGPD
        </button>
      </div>

      {/* Tab 1: Vault Sources */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {vaults.map((vault) => {
              const isDrive = vault.type === 'google-drive';
              const effectiveCount = isDrive ? driveImportedCount : vault.itemCount;

              return (
                <div
                  key={vault.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate">{vault.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {isDrive ? (driveUser ? 'Conectado' : 'Desconectado') : 'Ativo'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    {effectiveCount} itens no grafo
                  </p>

                  <div className="text-[10px] text-slate-500 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                    <span>Sync: {new Date(vault.lastSync).toLocaleDateString()}</span>
                    {isDrive && (
                      <button
                        onClick={() => setActiveTab('drive')}
                        className="text-xs text-white hover:underline flex items-center gap-1"
                      >
                        Abrir <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.04] flex items-center justify-between text-xs text-slate-500">
            <span>Armazenamento: IndexedDB (aura_sovereign_vault_v1)</span>
            <span className="text-slate-400">SHA-256 Verificado</span>
          </div>
        </div>
      )}

      {/* Tab 2: Google Drive Workspace Integration */}
      {activeTab === 'drive' && (
        <div className="space-y-6">
          {/* Auth Bar */}
          <div className="p-6 rounded-3xl bg-[#0C101A] border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-400" />
                  Adaptador Google Drive Soberano (OAuth Client Oficial)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Navegue por suas pastas do Google Drive e sincronize capturas de tela diretamente para o Aura Vault com verificação criptográfica SHA-256.
                </p>
              </div>

              {driveUser ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{driveUser.displayName || 'Usuário Google'}</div>
                    <div className="text-[10px] text-slate-400">{driveUser.email}</div>
                  </div>
                  <button
                    onClick={handleSignOutGoogle}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignInGoogle}
                  disabled={isDriveLoading}
                  className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isDriveLoading ? 'Conectando...' : 'Sign in with Google'}</span>
                </button>
              )}
            </div>

            {driveError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                {driveError}
              </div>
            )}
          </div>

          {/* Drive Explorer & Sync Controls */}
          {driveUser && (
            <div className="space-y-4">
              {/* Folder Breadcrumb & Search & Sync All Bar */}
              <div className="p-4 rounded-3xl bg-[#0C101A] border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                  {folderPath.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <button
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                          idx === folderPath.length - 1
                            ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-blue-400" />
                        <span>{item.name}</span>
                      </button>
                      {idx < folderPath.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-2">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      placeholder="Buscar no Drive..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
                    />
                  </form>

                  <button
                    onClick={() => driveToken && loadDriveContent(driveToken, currentFolderId, driveSearch)}
                    disabled={isDriveLoading}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
                    title="Atualizar pasta"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDriveLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={handleBatchSyncFolder}
                    disabled={isBatchSyncing || isDriveLoading || driveFiles.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40"
                    title="Sincronizar todas as capturas desta pasta para o Vault"
                  >
                    {isBatchSyncing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          Sincronizando {batchProgress?.current}/{batchProgress?.total}...
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sincronizar Pasta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subfolders list if any */}
              {driveFolders.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                    Subpastas no Google Drive ({driveFolders.length})
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {driveFolders.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleFolderClick(sub)}
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-left text-xs text-slate-200 transition-colors group"
                      >
                        <Folder className="w-4 h-4 text-blue-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                        <span className="truncate">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drive Image Files Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    Capturas & Imagens Detectadas ({driveFiles.length})
                  </h5>
                  <span className="text-[10px] text-slate-500">
                    Pasta ativa: {folderPath[folderPath.length - 1]?.name}
                  </span>
                </div>

                {isDriveLoading && driveFiles.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    Carregando capturas da pasta Google Drive...
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-[#0C101A] border border-white/[0.08] text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-300">
                      Nenhuma imagem encontrada nesta pasta do Google Drive.
                    </p>
                    <p className="text-xs text-slate-500">
                      Navegue para outra pasta acima ou envie screenshots para sua pasta no Drive.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {driveFiles.map((file) => {
                      const alreadyInVault = isFileAlreadyInVault(file);

                      return (
                        <div
                          key={file.id}
                          className={`p-4 rounded-3xl bg-[#0C101A] border space-y-3 transition-all ${
                            alreadyInVault
                              ? 'border-emerald-500/30'
                              : 'border-white/[0.08] hover:border-cyan-500/40'
                          }`}
                        >
                          <div className="h-32 rounded-2xl bg-black/60 overflow-hidden relative flex items-center justify-center">
                            {file.thumbnailLink ? (
                              <img
                                src={file.thumbnailLink}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Cloud className="w-8 h-8 text-slate-600" />
                            )}

                            {alreadyInVault && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 flex items-center gap-1 backdrop-blur-md">
                                <CheckCircle2 className="w-3 h-3" /> No Vault
                              </div>
                            )}
                          </div>

                          <div>
                            <h5 className="text-xs font-bold text-white truncate">{file.name}</h5>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Modificado: {file.modifiedTime?.slice(0, 10)}
                            </p>
                          </div>

                          {alreadyInVault ? (
                            <div className="py-2 px-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Sincronizado no Grafo
                            </div>
                          ) : (
                            <button
                              onClick={() => handleImportDriveFile(file)}
                              disabled={importingFileId === file.id || isBatchSyncing}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-all disabled:opacity-50 shadow-md active:scale-95"
                            >
                              {importingFileId === file.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando Visão...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" /> Sincronizar no Vault
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: LGPD Governance */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#0D121F] border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <ShieldCheck className="w-5 h-5" />
              Direito ao Esquecimento e Expurgador Criptográfico (LGPD / GDPR Art. 17)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O Aura garante o direito inalienável ao apagamento definitivo de dados. A exclusão de qualquer captura destrói o arquivo bruto, o índice vetorial de embeddings e emite um <strong>recibo criptográfico assinado</strong> para fins de conformidade jurídica.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <select
                value={purgeTargetId}
                onChange={(e) => setPurgeTargetId(e.target.value)}
                className="flex-1 bg-black/50 border border-white/[0.1] rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">Selecione uma captura para expurgar...</option>
                {screenshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.filename} ({s.sourceApp}) - ID: {s.id}
                  </option>
                ))}
              </select>

              <button
                onClick={handleExecutePurge}
                disabled={!purgeTargetId || isPurging}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                {isPurging ? 'Expurgando...' : 'Expurgar Permanentemente'}
              </button>
            </div>
          </div>

          {/* Receipts List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Recibos de Exclusão Criptográficos Auditáveis ({lgpdReceipts.length})
            </h4>

            {lgpdReceipts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 rounded-3xl bg-[#0D121F] border border-white/[0.06]">
                Nenhuma exclusão solicitada até o momento. Todos os dados permanecem íntegros sob sua custódia.
              </div>
            ) : (
              <div className="space-y-3">
                {lgpdReceipts.map((rec) => (
                  <div
                    key={rec.receiptId}
                    className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-2 text-xs font-mono text-emerald-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Recibo #{rec.receiptId}
                      </span>
                      <span className="text-[10px] text-slate-500">{rec.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Alvo: {rec.targetId} ({rec.targetType})
                    </div>
                    <div className="text-[10px] text-slate-400 break-all">
                      Assinatura SHA-256: {rec.cryptographicSignature}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
