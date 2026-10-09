export type VisualContentType =
  | 'code'
  | 'diagram'
  | 'tweet'
  | 'ui_mockup'
  | 'table'
  | 'article'
  | 'receipt'
  | 'chat'
  | 'voice_memo'
  | 'quick_note'
  | 'reminder'
  | 'other';

export type AuraItemType = 'screenshot' | 'text_note' | 'voice_audio';

export interface LgpdFinding {
  type: 'cpf' | 'credit_card' | 'password' | 'email';
  maskedPreview: string;
  position?: string;
}

export interface ScreenshotNode {
  id: string;
  itemType?: AuraItemType; // 'screenshot' | 'text_note' | 'voice_audio'
  contentHash: string; // SHA-256
  vaultSourceId: string;
  filename: string;
  timestamp: string; // ISO date
  imageUrl: string;
  thumbnailUrl?: string;
  audioUrl?: string; // For voice audio memos
  audioDuration?: number; // In seconds
  width?: number;
  height?: number;
  sourceApp: string; // 'Figma', 'Twitter/X', 'Voice Memo', 'Quick Note', etc.
  ocrText: string; // Used for extracted text, note body, or voice transcription
  userEditedText?: string; // Sovereignty of correction
  visualContext: {
    type: VisualContentType;
    confidence: number;
    summary: string;
  };
  clusterId: string;
  tags: string[];
  lgpdMasked: boolean;
  lgpdFindings: LgpdFinding[];
  isSensitive?: boolean;
  isDuplicate?: boolean;
  duplicateGroupId?: string;
  isArchived?: boolean;
  isReminder?: boolean;
  reminderDate?: string;
  reminderResolved?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface ClusterSummary {
  keyTakeaways: string[];
  entities: string[];
  actionPoints: string[];
  quotes: string[];
}

export interface ClusterNode {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  screenshotCount: number;
  summary: ClusterSummary;
  lastSynthesized: string;
  tags: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export type EdgeType = 'factual' | 'deep_link';
export type TruthClass = 'factual' | 'inference';
export type ConfidenceLevel = 'extracted' | 'inferred' | 'canonical';
export type RelationType = 'member_of' | 'semantic_analogy' | 'temporal_sequence' | 'citation';

export interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: EdgeType;
  truthClass: TruthClass;
  confidence: ConfidenceLevel;
  relation: RelationType;
  analogyReason?: string;
  affinityScore?: number; // 0.0 - 1.0
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface RedundancyGroup {
  id: string;
  clusterId: string;
  screenshotIds: string[];
  reason: string;
  recommendedKeepId: string;
  status: 'pending_decision' | 'merged' | 'kept_all';
  decidedAt?: string;
}

export interface VaultSource {
  id: string;
  name: string;
  type: 'local' | 'google-drive' | 'icloud' | 'dropbox';
  status: 'connected' | 'syncing' | 'idle' | 'auth_required';
  itemCount: number;
  lastSync: string;
  driveFolderId?: string;
}

export interface LgpdReceipt {
  receiptId: string;
  timestamp: string;
  targetId: string;
  targetType: 'screenshot' | 'cluster' | 'vault';
  contentHash: string;
  cryptographicSignature: string;
  action: 'purged_with_right_to_be_forgotten';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  isThinking?: boolean;
}

export type AlertType = 'reminder' | 'insight' | 'conflict' | 'action_required';
export type AlertPriority = 'low' | 'medium' | 'high';

export interface CognitiveAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  timestamp: string;
  relatedNodeId?: string;
  priority: AlertPriority;
  status: 'active' | 'dismissed' | 'resolved';
  actionLabel?: string;
}

// LAYA: Layered Autonomous Yield & Arbitration Agent
export type LayaCategory =
  | 'redundancy_resolution'
  | 'cluster_consolidation'
  | 'deep_link_projection'
  | 'temporal_urgency'
  | 'privacy_shield';

export type LayaRiskLevel = 'low' | 'medium' | 'high';
export type LayaActionType =
  | 'merge_nodes'
  | 'link_nodes'
  | 'create_alert'
  | 'reassign_cluster'
  | 'mask_sensitive';

export interface LayaDecision {
  id: string;
  title: string;
  category: LayaCategory;
  reasoning: string;
  confidence: number; // 0.0 - 1.0
  riskLevel: LayaRiskLevel;
  actionType: LayaActionType;
  actionPayload: {
    sourceId?: string;
    targetId?: string;
    nodeIds?: string[];
    clusterId?: string;
    alertTitle?: string;
    alertDescription?: string;
    edgeRelation?: string;
    analogyReason?: string;
  };
  impact: string;
  autoExecutable: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  timestamp: string;
}

// Multimodal Vector Embeddings
export interface MultimodalVector {
  id: string;
  targetId: string;
  modality: 'text' | 'image' | 'audio' | 'multimodal';
  dimensions: number;
  values: number[];
  norm?: number;
  model: string;
  createdAt: string;
}

export interface SemanticSearchResult {
  nodeId: string;
  similarity: number;
  itemType: AuraItemType;
  title: string;
  summary: string;
  clusterName?: string;
}

