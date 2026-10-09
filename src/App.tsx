import React, { useState, useEffect } from 'react';
import {
  ScreenshotNode,
  ClusterNode,
  GraphEdge,
  RedundancyGroup,
  VaultSource,
  CognitiveAlert,
  LayaDecision,
} from './types/aura';
import {
  initializeStorage,
  saveScreenshot,
  saveCluster,
  saveEdge,
  saveRedundancyGroup,
  purgeWithRightToBeForgotten,
  saveAlert,
  saveAlertsList,
} from './lib/storage';

import { HeaderNav } from './components/HeaderNav';
import { SovereignTabBar, SovereignTab } from './components/SovereignTabBar';
import { CognitiveGraphCanvas } from './components/CognitiveGraphCanvas';
import { BottomSheetDetails } from './components/BottomSheetDetails';
import { TimelineView } from './components/TimelineView';
import { VaultLibrary } from './components/VaultLibrary';
import { CognitiveChat } from './components/CognitiveChat';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { AuraSpecialistPanel } from './components/AuraSpecialistPanel';
import { CognitiveAlertsModal } from './components/CognitiveAlertsModal';
import { LayaDecisionModal } from './components/LayaDecisionModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  // Core Sovereign State
  const [screenshots, setScreenshots] = useState<ScreenshotNode[]>([]);
  const [clusters, setClusters] = useState<ClusterNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [redundancyGroups, setRedundancyGroups] = useState<RedundancyGroup[]>([]);
  const [vaults, setVaults] = useState<VaultSource[]>([]);
  const [alerts, setAlerts] = useState<CognitiveAlert[]>([]);

  // Navigation & Viewport State
  const [activeTab, setActiveTab] = useState<SovereignTab>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [densityFilter, setDensityFilter] = useState<'all' | 'high_confidence' | 'clusters_only'>('all');

  // Bottom Sheet Selection
  const [selectedNode, setSelectedNode] = useState<ScreenshotNode | ClusterNode | null>(null);

  // Targeted Chat Focus
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Modals & Panels
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSpecialistOpen, setIsSpecialistOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isLayaOpen, setIsLayaOpen] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Initialize Local-First Vault from IndexedDB
  const refreshStorage = async () => {
    try {
      const data = await initializeStorage();
      setScreenshots(data.screenshots);
      setClusters(data.clusters);
      setEdges(data.edges);
      setRedundancyGroups(data.redundancyGroups);
      setVaults(data.vaults);
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStorage();
  }, []);

  // Update Screenshot
  const handleUpdateScreenshot = async (updated: ScreenshotNode) => {
    setScreenshots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (selectedNode && selectedNode.id === updated.id) {
      setSelectedNode(updated);
    }
    await saveScreenshot(updated);
  };

  // Update Cluster
  const handleUpdateCluster = async (updated: ClusterNode) => {
    setClusters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (selectedNode && selectedNode.id === updated.id) {
      setSelectedNode(updated);
    }
    await saveCluster(updated);
  };

  // Update Cluster Summary from Aura Specialist Agent
  const handleUpdateClusterSummary = async (clusterId: string, summary: any) => {
    const target = clusters.find((c) => c.id === clusterId);
    if (!target) return;

    const updated: ClusterNode = {
      ...target,
      summary: {
        keyTakeaways: summary.keyTakeaways || target.summary.keyTakeaways,
        entities: summary.entities || target.summary.entities,
        actionPoints: summary.actionPoints || target.summary.actionPoints,
        quotes: summary.quotes || target.summary.quotes,
      },
      tags: summary.tags || target.tags,
      lastSynthesized: new Date().toISOString(),
    };

    await handleUpdateCluster(updated);
  };

  // Edge Interactions
  const handleAcceptEdge = async (edgeId: string) => {
    const updatedEdges = edges.map((e) =>
      e.id === edgeId ? { ...e, status: 'accepted' as const, confidence: 'canonical' as const } : e
    );
    setEdges(updatedEdges);
    const edge = updatedEdges.find((e) => e.id === edgeId);
    if (edge) await saveEdge(edge);
  };

  const handleDismissEdge = async (edgeId: string) => {
    const updatedEdges = edges.map((e) =>
      e.id === edgeId ? { ...e, status: 'dismissed' as const } : e
    );
    setEdges(updatedEdges);
    const edge = updatedEdges.find((e) => e.id === edgeId);
    if (edge) await saveEdge(edge);
  };

  const handleAddProposedEdges = async (newEdges: GraphEdge[]) => {
    setEdges((prev) => [...prev, ...newEdges]);
    for (const e of newEdges) {
      await saveEdge(e);
    }
  };

  const handleAddRedundancies = async (newGroups: RedundancyGroup[]) => {
    setRedundancyGroups((prev) => [...prev, ...newGroups]);
    for (const g of newGroups) {
      await saveRedundancyGroup(g);
    }
  };

  // Right to be Forgotten Purge
  const handlePurgeNode = async (id: string, type: 'screenshot' | 'cluster') => {
    await purgeWithRightToBeForgotten(id, type);
    setSelectedNode(null);
    if (type === 'screenshot') {
      setScreenshots((prev) => prev.filter((s) => s.id !== id));
    } else {
      setClusters((prev) => prev.filter((c) => c.id !== id));
    }
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
  };

  // Interactive Decision Gate: Redundancy Resolution
  const handleResolveRedundancy = async (
    groupId: string,
    decision: 'merge_archive' | 'keep_all'
  ) => {
    const group = redundancyGroups.find((g) => g.id === groupId);
    if (!group) return;

    if (decision === 'merge_archive') {
      const updatedScreenshots = screenshots.map((s) => {
        if (group.screenshotIds.includes(s.id) && s.id !== group.recommendedKeepId) {
          return { ...s, isArchived: true };
        }
        return s;
      });
      setScreenshots(updatedScreenshots);
      for (const s of updatedScreenshots) {
        if (group.screenshotIds.includes(s.id)) await saveScreenshot(s);
      }
    }

    const updatedGroup: RedundancyGroup = {
      ...group,
      status: decision === 'merge_archive' ? 'merged' : 'kept_all',
      decidedAt: new Date().toISOString(),
    };

    setRedundancyGroups((prev) => prev.map((g) => (g.id === groupId ? updatedGroup : g)));
    await saveRedundancyGroup(updatedGroup);
  };

  // Import New Node (from Modal or Drive)
  const handleImportScreenshot = async (node: ScreenshotNode) => {
    // 1. Add screenshot/note/audio
    setScreenshots((prev) => [node, ...prev]);
    await saveScreenshot(node);

    // 2. Create factual edge to cluster
    const factualEdge: GraphEdge = {
      id: `edge_auto_${Date.now()}`,
      source: node.id,
      target: node.clusterId,
      type: 'factual',
      truthClass: 'factual',
      confidence: 'canonical',
      relation: 'member_of',
      status: 'accepted',
    };
    setEdges((prev) => [...prev, factualEdge]);
    await saveEdge(factualEdge);

    // 3. Increment cluster count
    const cluster = clusters.find((c) => c.id === node.clusterId);
    if (cluster) {
      const updatedCluster = { ...cluster, screenshotCount: cluster.screenshotCount + 1 };
      await handleUpdateCluster(updatedCluster);
    }

    // 4. If it's a reminder, automatically spawn a cognitive alert!
    if (node.isReminder) {
      const newAlert: CognitiveAlert = {
        id: `alert_rem_${Date.now()}`,
        type: 'reminder',
        title: `Lembrete Agendado: ${node.filename}`,
        description: `Agendado para ${node.reminderDate || 'hoje'}: ${(node.userEditedText || node.ocrText).slice(0, 100)}`,
        timestamp: new Date().toISOString(),
        relatedNodeId: node.id,
        priority: 'high',
        status: 'active',
        actionLabel: 'Ver no Grafo',
      };
      setAlerts((prev) => [newAlert, ...prev]);
      await saveAlert(newAlert);
    }

    // Select the new node to show Bottom Sheet
    setSelectedNode(node);
    setActiveTab('graph');
  };

  // Alerts Management
  const handleDismissAlert = async (alertId: string) => {
    const updated = alerts.map((a) => (a.id === alertId ? { ...a, status: 'dismissed' as const } : a));
    setAlerts(updated);
    await saveAlertsList(updated);
  };

  const handleResolveAlert = async (alertId: string) => {
    const updated = alerts.map((a) => {
      if (a.id === alertId) {
        const nextStatus = a.status === 'resolved' ? ('active' as const) : ('resolved' as const);
        return { ...a, status: nextStatus };
      }
      return a;
    });
    setAlerts(updated);
    await saveAlertsList(updated);
  };

  const handleNavigateToNode = (nodeId: string) => {
    const match =
      screenshots.find((s) => s.id === nodeId) || clusters.find((c) => c.id === nodeId);
    if (match) {
      setSelectedNode(match);
      setActiveTab('graph');
    }
  };

  const handleGenerateNewInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const res = await fetch('/api/specialist/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: screenshots, clusters }),
      });
      const data = await res.json();
      if (data.alerts && Array.isArray(data.alerts)) {
        const generated: CognitiveAlert[] = data.alerts.map((item: any, idx: number) => ({
          id: `alert_gen_${Date.now()}_${idx}`,
          type: item.type || 'insight',
          title: item.title,
          description: item.description,
          timestamp: new Date().toISOString(),
          relatedNodeId: item.relatedNodeId,
          priority: item.priority || 'medium',
          status: 'active',
          actionLabel: item.actionLabel || 'Ver no Grafo',
        }));

        const merged = [...generated, ...alerts];
        setAlerts(merged);
        await saveAlertsList(merged);
      }
    } catch (err) {
      console.error('Error generating proactive insights:', err);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Focus node in RAG Chat
  const handleOpenChatWithNode = (nodeId: string) => {
    setFocusedNodeId(nodeId);
    setActiveTab('chat');
  };

  // Highlight node in Graph from Chat citation
  const handleHighlightNodeInGraph = (nodeId: string) => {
    const match =
      screenshots.find((s) => s.id === nodeId) || clusters.find((c) => c.id === nodeId);
    if (match) {
      setSelectedNode(match);
      setActiveTab('graph');
    }
  };

  // Execute Decision from LAYA Autonomous Yield Engine
  const handleExecuteLayaDecision = async (decision: LayaDecision) => {
    const { actionType, actionPayload } = decision;

    if (actionType === 'merge_nodes' && actionPayload.nodeIds && actionPayload.nodeIds.length > 1) {
      const primaryId = actionPayload.targetId || actionPayload.nodeIds[0];
      const updatedScreenshots = screenshots.map((s) => {
        if (actionPayload.nodeIds!.includes(s.id) && s.id !== primaryId) {
          return { ...s, isArchived: true };
        }
        return s;
      });
      setScreenshots(updatedScreenshots);
      for (const s of updatedScreenshots) {
        if (actionPayload.nodeIds!.includes(s.id)) await saveScreenshot(s);
      }
    } else if (actionType === 'link_nodes' && actionPayload.sourceId && actionPayload.targetId) {
      const newEdge: GraphEdge = {
        id: `laya_edge_${Date.now()}`,
        source: actionPayload.sourceId,
        target: actionPayload.targetId,
        type: 'deep_link',
        truthClass: 'inference',
        confidence: 'inferred',
        relation: 'semantic_analogy',
        analogyReason: actionPayload.analogyReason || decision.reasoning,
        affinityScore: decision.confidence,
        status: 'accepted',
      };
      setEdges((prev) => [...prev, newEdge]);
      await saveEdge(newEdge);
    } else if (actionType === 'create_alert') {
      const newAlert: CognitiveAlert = {
        id: `alert_laya_${Date.now()}`,
        type: decision.category === 'temporal_urgency' ? 'reminder' : 'action_required',
        title: actionPayload.alertTitle || decision.title,
        description: actionPayload.alertDescription || decision.impact,
        timestamp: new Date().toISOString(),
        relatedNodeId: actionPayload.targetId || actionPayload.nodeIds?.[0],
        priority: decision.riskLevel === 'high' ? 'high' : 'medium',
        status: 'active',
        actionLabel: 'Ver no Grafo',
      };
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      await saveAlertsList(updatedAlerts);
    } else if (actionType === 'reassign_cluster' && actionPayload.clusterId && actionPayload.nodeIds) {
      const updatedScreenshots = screenshots.map((s) => {
        if (actionPayload.nodeIds!.includes(s.id)) {
          return { ...s, clusterId: actionPayload.clusterId! };
        }
        return s;
      });
      setScreenshots(updatedScreenshots);
      for (const s of updatedScreenshots) {
        if (actionPayload.nodeIds!.includes(s.id)) await saveScreenshot(s);
      }
    } else if (actionType === 'mask_sensitive' && actionPayload.nodeIds) {
      const updatedScreenshots = screenshots.map((s) => {
        if (actionPayload.nodeIds!.includes(s.id)) {
          return { ...s, lgpdMasked: true, isSensitive: true };
        }
        return s;
      });
      setScreenshots(updatedScreenshots);
      for (const s of updatedScreenshots) {
        if (actionPayload.nodeIds!.includes(s.id)) await saveScreenshot(s);
      }
    }
  };

  const pendingDecisions = redundancyGroups.filter((g) => g.status === 'pending_decision').length;
  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#06090F] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <h1 className="text-base font-bold tracking-tight">AURA Sovereign Visual Brain</h1>
        <p className="text-xs text-slate-400 mt-1 font-normal">Carregando Cognitive Graph Fabric e Vault Local...</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#06090F] text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <HeaderNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        screenshotCount={screenshots.length}
        clusterCount={clusters.length}
        alertCount={activeAlertsCount}
        onOpenSpecialist={() => setIsSpecialistOpen(true)}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenLaya={() => setIsLayaOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeTab === 'graph' && (
          <CognitiveGraphCanvas
            screenshots={screenshots}
            clusters={clusters}
            edges={edges}
            searchQuery={searchQuery}
            selectedNodeId={selectedNode?.id || null}
            onSelectNode={setSelectedNode}
            densityFilter={densityFilter}
            onDensityFilterChange={setDensityFilter}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineView
            screenshots={screenshots}
            clusters={clusters}
            redundancyGroups={redundancyGroups}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setActiveTab('graph');
            }}
            onResolveRedundancy={handleResolveRedundancy}
          />
        )}

        {activeTab === 'vaults' && (
          <VaultLibrary
            vaults={vaults}
            screenshots={screenshots}
            clusters={clusters}
            onImportNewScreenshot={handleImportScreenshot}
            onRefreshStorage={refreshStorage}
          />
        )}

        {activeTab === 'chat' && (
          <CognitiveChat
            screenshots={screenshots}
            focusedNodeId={focusedNodeId}
            onClearFocus={() => setFocusedNodeId(null)}
            onHighlightNodeInGraph={handleHighlightNodeInGraph}
          />
        )}

        {/* Bottom Sheet Details Drawer */}
        {selectedNode && (
          <BottomSheetDetails
            node={selectedNode}
            allScreenshots={screenshots}
            allClusters={clusters}
            edges={edges}
            onClose={() => setSelectedNode(null)}
            onUpdateScreenshot={handleUpdateScreenshot}
            onUpdateCluster={handleUpdateCluster}
            onOpenChatWithNode={handleOpenChatWithNode}
            onAcceptEdge={handleAcceptEdge}
            onDismissEdge={handleDismissEdge}
            onPurgeNode={handlePurgeNode}
          />
        )}
      </main>

      {/* Sovereign Bottom Tab Bar */}
      <SovereignTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCapture={() => setIsCaptureOpen(true)}
        pendingDecisionCount={pendingDecisions}
      />

      {/* Quick Capture Modal */}
      {isCaptureOpen && (
        <QuickCaptureModal
          isOpen={isCaptureOpen}
          onClose={() => setIsCaptureOpen(false)}
          clusters={clusters}
          screenshots={screenshots}
          onAddScreenshot={handleImportScreenshot}
        />
      )}

      {/* Aura Specialist Panel */}
      {isSpecialistOpen && (
        <AuraSpecialistPanel
          isOpen={isSpecialistOpen}
          onClose={() => setIsSpecialistOpen(false)}
          clusters={clusters}
          screenshots={screenshots}
          edges={edges}
          onUpdateClusterSummary={handleUpdateClusterSummary}
          onAddProposedEdges={handleAddProposedEdges}
          onAddRedundancies={handleAddRedundancies}
        />
      )}

      {/* Cognitive Alerts & Proactive Insights Modal */}
      {isAlertsOpen && (
        <CognitiveAlertsModal
          isOpen={isAlertsOpen}
          onClose={() => setIsAlertsOpen(false)}
          alerts={alerts}
          screenshots={screenshots}
          clusters={clusters}
          onDismissAlert={handleDismissAlert}
          onResolveAlert={handleResolveAlert}
          onNavigateToNode={handleNavigateToNode}
          onGenerateNewInsights={handleGenerateNewInsights}
          isGeneratingInsights={isGeneratingInsights}
        />
      )}

      {/* LAYA Autonomous Yield Decision Modal */}
      {isLayaOpen && (
        <LayaDecisionModal
          isOpen={isLayaOpen}
          onClose={() => setIsLayaOpen(false)}
          screenshots={screenshots}
          clusters={clusters}
          edges={edges}
          redundancyGroups={redundancyGroups}
          alerts={alerts}
          onExecuteDecision={handleExecuteLayaDecision}
          onRefreshGraph={refreshStorage}
        />
      )}

      {/* Sovereign Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
