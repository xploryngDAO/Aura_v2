import {
  ScreenshotNode,
  ClusterNode,
  GraphEdge,
  RedundancyGroup,
  VaultSource,
  LgpdReceipt,
  CognitiveAlert,
} from '../types/aura';

const DB_NAME = 'aura_sovereign_vault_v1';
const DB_VERSION = 1;

/**
 * SHA-256 Content-Hash Generator for Sovereign Ingestion Idempotency
 */
export async function computeContentHash(input: string | ArrayBuffer): Promise<string> {
  const buffer = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Open IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains('screenshots')) {
        db.createObjectStore('screenshots', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('clusters')) {
        db.createObjectStore('clusters', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('edges')) {
        db.createObjectStore('edges', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('redundancy_groups')) {
        db.createObjectStore('redundancy_groups', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vault_sources')) {
        db.createObjectStore('vault_sources', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('lgpd_receipts')) {
        db.createObjectStore('lgpd_receipts', { keyPath: 'receiptId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Initial Mock Seed Data showcasing Cognitive Graph Fabric
const INITIAL_CLUSTERS: ClusterNode[] = [
  {
    id: 'cluster_design',
    name: 'Design Systems & UI Tokens',
    icon: 'Palette',
    description: 'Componentes, paletas Sovereign Glass, microinterações cinéticas e design tokens.',
    color: '#06b6d4',
    screenshotCount: 3,
    summary: {
      keyTakeaways: [
        'Adoção de tokens CSS variables para suporte nativo a modo escuro profundo (bg-[#090D16]).',
        'Uso de bordas translúcidas (white/[0.08]) e desfoques de vidro (backdrop-blur-md) para ergonomia visual.',
        'Hierarquia tipográfica rigorosa com Inter para heads pesados e badges uppercase tracking-widest.',
      ],
      entities: ['Tailwind CSS', 'Figma Tokens', 'Personia Sovereign Glass', 'Inter Font'],
      actionPoints: [
        'Padronizar raios de borda em 16px para Bottom Sheets.',
        'Garantir contraste de 7:1 em textos brancos sobre acentos ciano.',
      ],
      quotes: ['"O vidro translúcido deve conferir profundidade sem ofuscar a densidade de dados do grafo."'],
    },
    lastSynthesized: '2026-10-04T14:20:00Z',
    tags: ['design-system', 'tokens', 'ui-glass', 'mobile-first'],
    x: 260,
    y: 220,
  },
  {
    id: 'cluster_arch',
    name: 'Arquitetura Local-First & CGF',
    icon: 'Boxes',
    description: 'Topologia do Cognitive Graph Fabric, sincronização determinística e custódia local.',
    color: '#38bdf8',
    screenshotCount: 3,
    summary: {
      keyTakeaways: [
        'Content-Hash SHA-256 garante que nenhuma imagem duplicada seja reprocessada no vault.',
        'Indexação soberana em IndexedDB com replicação segura sem vazamento para nuvens de terceiros.',
        'Topologia de arestas separadas entre fatuais (diretas) e inferências (Deep Connections).',
      ],
      entities: ['Personia OS', 'IndexedDB', 'Content-Hash SHA-256', 'Cognitive Graph Fabric'],
      actionPoints: [
        'Implementar verificador de integridade criptográfica semanal nos vaults.',
        'Auditar chamadas de extração multimodal com sanitização LGPD prévia.',
      ],
      quotes: ['"Soberania não é isolamento; é o direito inalienável de manter a chave dos seus dados."'],
    },
    lastSynthesized: '2026-10-05T09:15:00Z',
    tags: ['local-first', 'cgf', 'graph', 'sovereignty', 'indexeddb'],
    x: 800,
    y: 220,
  },
  {
    id: 'cluster_ai',
    name: 'Modelos & Vetores Cognitivos',
    icon: 'Cpu',
    description: 'Embeddings semânticos, agentes autônomos Aura e raciocínio multimodal com Gemini.',
    color: '#818cf8',
    screenshotCount: 2,
    summary: {
      keyTakeaways: [
        'Slot multimodal-vision extrai texto, tipo de conteúdo e metadados contextuais com alta fidelidade.',
        'Deep Connections calculam proximidade semântica para sugerir analogias entre áreas desconexas.',
        'Interactive Decision Gates previnem perda destrutiva de dados na resolução de redundância.',
      ],
      entities: ['Gemini 3.8 Flash', 'Aura Specialist', 'Vector Embeddings', 'RAG Visual'],
      actionPoints: [
        'Configurar threshold de afinidade para deep links em 0.85.',
        'Permitir edição direta de OCR pelo usuário para soberania de correção.',
      ],
      quotes: ['"O agente não decide pelo humano; o agente orquestra alternativas com clareza auditável."'],
    },
    lastSynthesized: '2026-10-05T12:00:00Z',
    tags: ['ai-agent', 'gemini', 'embeddings', 'spec-aura', 'multimodal'],
    x: 800,
    y: 640,
  },
  {
    id: 'cluster_fin',
    name: 'Finanças & Custódia Criptográfica',
    icon: 'ShieldCheck',
    description: 'Comprovantes, chaves públicas, recibos de transações e relatórios com escudo LGPD.',
    color: '#34d399',
    screenshotCount: 1,
    summary: {
      keyTakeaways: [
        'Capturas com dados sensíveis (CPF, cartões) recebem máscara LGPD antes de qualquer indexação.',
        'Direito ao esquecimento gera comprovante criptográfico auditável.',
      ],
      entities: ['LGPD Shield', 'Pix', 'Ethereum Vault', 'SHA-256 Erasure Receipt'],
      actionPoints: [
        'Revisar dados sensíveis mascarados sob demanda.',
      ],
      quotes: ['"Privacidade é a primeira linha de defesa da soberania pessoal."'],
    },
    lastSynthesized: '2026-10-03T18:45:00Z',
    tags: ['financas', 'lgpd', 'recibos', 'seguranca'],
    x: 260,
    y: 640,
  },
];

const INITIAL_SCREENSHOTS: ScreenshotNode[] = [
  {
    id: 'node_figma_tokens',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    vaultSourceId: 'local-photos',
    filename: 'figma_design_tokens_atlas08.png',
    timestamp: '2026-10-04T10:15:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'Figma',
    ocrText: `Atlas 08 Tokens System
--color-bg-deep: #090D16;
--color-surface-glass: rgba(255, 255, 255, 0.04);
--color-border-glow: rgba(56, 189, 248, 0.25);
--color-neon-cyan: #06b6d4;
--radius-sheet: 24px;
Kinetic easing: cubic-bezier(0.16, 1, 0.3, 1)`,
    userEditedText: undefined,
    visualContext: {
      type: 'ui_mockup',
      confidence: 0.98,
      summary: 'Especificação de design tokens Sovereign Glass com paleta escura e constantes de aceleração.',
    },
    clusterId: 'cluster_design',
    tags: ['figma', 'tokens', 'sovereign-glass', 'ui'],
    lgpdMasked: false,
    lgpdFindings: [],
    x: 150,
    y: 120,
  },
  {
    id: 'node_tailwind_css',
    contentHash: 'f4b9c51239fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c911',
    vaultSourceId: 'local-photos',
    filename: 'vscode_tailwind_v4_config.png',
    timestamp: '2026-10-04T11:40:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'VS Code',
    ocrText: `@import "tailwindcss";
@theme {
  --color-primary-cyan: #06b6d4;
  --color-neon-indigo: #6366f1;
  --font-display: "Inter", sans-serif;
}
.sovereign-card {
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}`,
    visualContext: {
      type: 'code',
      confidence: 0.99,
      summary: 'Trecho de configuração de folha de estilos Tailwind CSS v4 para cards de vidro translúcido.',
    },
    clusterId: 'cluster_design',
    tags: ['code', 'tailwind', 'css', 'frontend'],
    lgpdMasked: false,
    lgpdFindings: [],
    x: 370,
    y: 120,
  },
  {
    id: 'node_ux_microinteractions',
    contentHash: 'c7a8b90129fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852f333',
    vaultSourceId: 'google-drive',
    filename: 'chrome_ux_kinetic_bottomsheet.png',
    timestamp: '2026-10-04T16:10:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'Chrome',
    ocrText: `Princípios de Microinterações Cinéticas Mobile:
1. Inércia Elástica: Toques no canvas devem reagir com amortecimento natural de 60fps.
2. Bottom Sheets com Snapping: Folhas que deslizam entre 60% e 85% fornecem imersão sem perder o contexto do grafo.
3. Indicadores de Inferência: Arestas com pulsos ciano e índigo comunicam visualmente que o insight veio de IA.`,
    visualContext: {
      type: 'article',
      confidence: 0.94,
      summary: 'Artigo web com heurísticas para interação cinemática e gavetas inferiores em apps soberanos.',
    },
    clusterId: 'cluster_design',
    tags: ['ux', 'bottom-sheet', 'kinetics', 'mobile'],
    lgpdMasked: false,
    lgpdFindings: [],
    x: 370,
    y: 320,
  },
  {
    id: 'node_arch_diagram',
    contentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
    vaultSourceId: 'local-photos',
    filename: 'cgf_topology_specification.png',
    timestamp: '2026-10-05T08:30:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'Obsidian',
    ocrText: `Cognitive Graph Fabric (CGF) Architecture
Layer 1: Vault Sources (Local Storage, Google Drive, iCloud)
Layer 2: Sovereign Vision ETL (OCR, LGPD Sanitizer, Content-Hash)
Layer 3: Community Clustering & Deep Connections (spec-aura)
Layer 4: Sovereign Glass Canvas & Interactive Decision Gates
Principle: Local-First IndexedDB custody with optional encrypted cloud mirrors.`,
    visualContext: {
      type: 'diagram',
      confidence: 0.96,
      summary: 'Diagrama conceitual das quatro camadas do Personia Cognitive Graph Fabric e custódia local.',
    },
    clusterId: 'cluster_arch',
    tags: ['cgf', 'architecture', 'diagram', 'sovereign-os'],
    lgpdMasked: false,
    lgpdFindings: [],
    x: 690,
    y: 120,
  },
  {
    id: 'node_storage_code',
    contentHash: 'd9e8f7a6b5c4d3e2f1a09b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e',
    vaultSourceId: 'local-photos',
    filename: 'indexeddb_content_hash_service.png',
    timestamp: '2026-10-05T09:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'VS Code',
    ocrText: `export async function storeScreenshotSovereign(node: ScreenshotNode) {
  const hash = await crypto.subtle.digest('SHA-256', node.buffer);
  const exists = await db.screenshots.get({ contentHash: hash });
  if (exists) return { idempotent: true, node: exists };
  return await db.screenshots.put(node);
}`,
    visualContext: {
      type: 'code',
      confidence: 0.97,
      summary: 'Implementação de ingestão idempotente com hash criptográfico e armazenamento local IndexedDB.',
    },
    clusterId: 'cluster_arch',
    tags: ['code', 'indexeddb', 'hash', 'idempotency'],
    lgpdMasked: false,
    lgpdFindings: [],
    x: 910,
    y: 120,
  },
  {
    id: 'node_terminal_sync',
    contentHash: 'b5c4d3e2f1a09b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8ed9e8f7a6',
    vaultSourceId: 'local-photos',
    filename: 'terminal_aura_sync_status.png',
    timestamp: '2026-10-05T09:12:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'Terminal',
    ocrText: `$ aura-vault sync --source "Google Drive: /Screenshots/Mobile"
[AURA] Verificando integridade SHA-256... 142 arquivos verificados.
[AURA] 0 novas duplicatas encontradas.
[AURA] 2 novas capturas enviadas para Sovereign Vision ETL.
[AURA] Status: 100% Sincronizado e Criptografado Localmente.`,
    visualContext: {
      type: 'code',
      confidence: 0.99,
      summary: 'Log de execução da CLI Aura confirmando verificação de integridade e ingestão sem duplicatas.',
    },
    clusterId: 'cluster_arch',
    tags: ['cli', 'terminal', 'sync', 'audit'],
    lgpdMasked: false,
    lgpdFindings: [],
    x: 910,
    y: 320,
  },
  {
    id: 'node_slack_frame1',
    contentHash: '11223344556677889900aabbccddeeff00112233445566778899aabbccddeeff',
    vaultSourceId: 'local-photos',
    filename: 'slack_discussao_arquitetura_part1.png',
    timestamp: '2026-10-05T11:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'Slack',
    ocrText: `@lucas: Nós precisamos garantir que o modelo Gemini receba apenas o texto sanitizado de dados pessoais.
@amanda: Concordo. O LGPD Shield deve rodar localmente no client antes de disparar o prompt para a API.
@lucas: Perfeito, vou implementar o regex e mascaramento de CPF e cartões.`,
    visualContext: {
      type: 'chat',
      confidence: 0.95,
      summary: 'Conversa no Slack alinhando que o LGPD Shield deve sanitizar dados antes do envio ao Gemini.',
    },
    clusterId: 'cluster_ai',
    tags: ['slack', 'chat', 'discussao', 'redundancia'],
    isDuplicate: true,
    duplicateGroupId: 'red_slack_conversa',
    lgpdMasked: false,
    lgpdFindings: [],
    x: 680,
    y: 640,
  },
  {
    id: 'node_slack_frame2',
    contentHash: '223344556677889900aabbccddeeff00112233445566778899aabbccddeeff11',
    vaultSourceId: 'local-photos',
    filename: 'slack_discussao_arquitetura_part2_completa.png',
    timestamp: '2026-10-05T11:02:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'Slack',
    ocrText: `@lucas: Nós precisamos garantir que o modelo Gemini receba apenas o texto sanitizado de dados pessoais.
@amanda: Concordo. O LGPD Shield deve rodar localmente no client antes de disparar o prompt para a API.
@lucas: Perfeito, vou implementar o regex e mascaramento de CPF e cartões.
@amanda: Ótimo! E já criei o Interactive Decision Gate para que o usuário decida se quer mesclar prints intermediários!`,
    visualContext: {
      type: 'chat',
      confidence: 0.96,
      summary: 'Frame completo da conversa no Slack incluindo a conclusão sobre o Interactive Decision Gate.',
    },
    clusterId: 'cluster_ai',
    tags: ['slack', 'chat', 'completo', 'redundancia'],
    isDuplicate: true,
    duplicateGroupId: 'red_slack_conversa',
    lgpdMasked: false,
    lgpdFindings: [],
    x: 920,
    y: 640,
  },
  {
    id: 'node_crypto_receipt',
    contentHash: '99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
    vaultSourceId: 'local-photos',
    filename: 'comprovante_custodia_mascarado_lgpd.png',
    timestamp: '2026-10-03T18:30:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=200&q=70',
    sourceApp: 'Nubank / Web3',
    ocrText: `Comprovante de Transferência e Custódia
Favorecido: Personia Sovereign Reserve
CPF Mascarado: ***.456.***-00 [LGPD SHIELD ATIVADO]
Cartão Final: **** **** **** 8829
Autenticação Criptográfica: 0x4a9f...3c81
Valor: R$ 4.250,00`,
    visualContext: {
      type: 'receipt',
      confidence: 0.99,
      summary: 'Comprovante bancário e recibo de custódia com dados altamente sensíveis devidamente anonimizados.',
    },
    clusterId: 'cluster_fin',
    tags: ['recibo', 'comprovante', 'lgpd-mascarado', 'financas'],
    lgpdMasked: true,
    isSensitive: true,
    lgpdFindings: [
      {
        type: 'cpf',
        maskedPreview: '***.456.***-00',
        position: 'Linha de Favorecido',
      },
      {
        type: 'credit_card',
        maskedPreview: '**** **** **** 8829',
        position: 'Cartão de Origem',
      },
    ],
    x: 140,
    y: 640,
  },
  {
    id: 'node_note_hybrid_rag',
    itemType: 'text_note',
    contentHash: '7766554433221100aabbccddeeff0011223344556677889900aabbccddeeff11',
    vaultSourceId: 'local-photos',
    filename: 'Nota: Arquitetura de Embeddings Híbridos',
    timestamp: '2026-10-05T15:20:00Z',
    imageUrl: '',
    sourceApp: 'Nota de Texto',
    ocrText: `# Arquitetura de Embeddings Híbridos
Planejamento de RAG Local-First para o Aura:
1. Usar busca textual exata em memória (BM25) para termos exatos, nomes de arquivos e IDs.
2. Usar vetores semânticos com distância de cosseno para analogias conceituais.

⚠️ Lembrete: Testar latência de inferência com Gemini 3.8 Flash e validar benchmark de 500 nós locais.`,
    visualContext: {
      type: 'quick_note',
      confidence: 0.99,
      summary: 'Ideia técnica para combinar busca BM25 e vetores no RAG com lembrete de teste de latência.',
    },
    clusterId: 'cluster_arch',
    tags: ['arquitetura', 'embeddings', 'rag', 'ideia'],
    isReminder: true,
    reminderDate: '2026-10-08',
    lgpdMasked: false,
    lgpdFindings: [],
    x: 690,
    y: 320,
  },
  {
    id: 'node_voice_figma_tokens',
    itemType: 'voice_audio',
    contentHash: '33445566778899001122aabbccddeeff00112233445566778899aabbccddeeff',
    vaultSourceId: 'local-photos',
    filename: 'Áudio de Voz: Refinamento de Raios nos Cards',
    timestamp: '2026-10-05T16:15:00Z',
    imageUrl: '',
    audioDuration: 14,
    sourceApp: 'Áudio de Voz',
    ocrText: `"Gravei este áudio rápido andando: os cards de vidro no modo escuro precisam respeitar o aninhamento com r_inner = r_outer - padding. Lembrar de atualizar a spec no Figma amanhã cedo!"`,
    visualContext: {
      type: 'voice_memo',
      confidence: 0.97,
      summary: 'Nota de voz gravada com regra matemática para raio de borda dos cards e lembrete para Figma.',
    },
    clusterId: 'cluster_design',
    tags: ['audio', 'voz', 'figma', 'tokens', 'lembrete'],
    isReminder: true,
    reminderDate: '2026-10-06',
    lgpdMasked: false,
    lgpdFindings: [],
    x: 150,
    y: 320,
  },
];

export const INITIAL_ALERTS: CognitiveAlert[] = [
  {
    id: 'alert_1',
    type: 'reminder',
    title: 'Lembrete Iminente: Atualizar spec no Figma',
    description: 'Extraído do seu áudio de voz: "Lembrar de atualizar a spec no Figma amanhã cedo!"',
    timestamp: '2026-10-05T17:00:00Z',
    relatedNodeId: 'node_voice_figma_tokens',
    priority: 'high',
    status: 'active',
    actionLabel: 'Ver Áudio no Grafo',
  },
  {
    id: 'alert_2',
    type: 'insight',
    title: 'Sinergia Cognitiva: Embeddings Híbridos & CGF',
    description: 'Sua nota técnica sobre busca BM25 se conecta diretamente ao diagrama de topologia CGF.',
    timestamp: '2026-10-05T16:30:00Z',
    relatedNodeId: 'node_note_hybrid_rag',
    priority: 'medium',
    status: 'active',
    actionLabel: 'Explorar Conexão',
  },
  {
    id: 'alert_3',
    type: 'conflict',
    title: 'Atenção LGPD: 1 Comprovante Mascarado',
    description: 'Um recibo financeiro recente contém dados protegidos pelo LGPD Shield.',
    timestamp: '2026-10-05T15:00:00Z',
    relatedNodeId: 'node_crypto_receipt',
    priority: 'low',
    status: 'active',
    actionLabel: 'Revisar Custódia',
  },
];

const INITIAL_EDGES: GraphEdge[] = [
  // Factual Edges (Screenshots, Notes & Audio to Clusters)
  {
    id: 'edge_f10',
    source: 'node_note_hybrid_rag',
    target: 'cluster_arch',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f11',
    source: 'node_voice_figma_tokens',
    target: 'cluster_design',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f1',
    source: 'node_figma_tokens',
    target: 'cluster_design',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f2',
    source: 'node_tailwind_css',
    target: 'cluster_design',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f3',
    source: 'node_ux_microinteractions',
    target: 'cluster_design',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f4',
    source: 'node_arch_diagram',
    target: 'cluster_arch',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f5',
    source: 'node_storage_code',
    target: 'cluster_arch',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f6',
    source: 'node_terminal_sync',
    target: 'cluster_arch',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f7',
    source: 'node_slack_frame1',
    target: 'cluster_ai',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f8',
    source: 'node_slack_frame2',
    target: 'cluster_ai',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },
  {
    id: 'edge_f9',
    source: 'node_crypto_receipt',
    target: 'cluster_fin',
    type: 'factual',
    truthClass: 'factual',
    confidence: 'canonical',
    relation: 'member_of',
    status: 'accepted',
  },

  // Deep Connection Inferred Edges (Aura Specialist Inference)
  {
    id: 'edge_deep_1',
    source: 'cluster_design',
    target: 'cluster_arch',
    type: 'deep_link',
    truthClass: 'inference',
    confidence: 'inferred',
    relation: 'semantic_analogy',
    analogyReason:
      'Os design tokens de Sovereign Glass desacoplam a camada visual da mesma forma que a arquitetura CGF isola os adaptadores de custódia de dados.',
    affinityScore: 0.91,
    status: 'accepted',
  },
  {
    id: 'edge_deep_2',
    source: 'node_ux_microinteractions',
    target: 'node_terminal_sync',
    type: 'deep_link',
    truthClass: 'inference',
    confidence: 'inferred',
    relation: 'semantic_analogy',
    analogyReason:
      'A fluidez tátil e imediata das microinterações visuais em 60fps compartilha a mesma filosofia de feedback instantâneo da CLI do Aura.',
    affinityScore: 0.86,
    status: 'pending',
  },
  {
    id: 'edge_deep_3',
    source: 'node_crypto_receipt',
    target: 'node_storage_code',
    type: 'deep_link',
    truthClass: 'inference',
    confidence: 'inferred',
    relation: 'semantic_analogy',
    analogyReason:
      'A imutabilidade das chaves de custódia no recibo financeiro fundamenta o mecanismo de content-hash SHA-256 para o vault de screenshots.',
    affinityScore: 0.89,
    status: 'pending',
  },
];

const INITIAL_REDUNDANCY_GROUPS: RedundancyGroup[] = [
  {
    id: 'red_slack_conversa',
    clusterId: 'cluster_ai',
    screenshotIds: ['node_slack_frame1', 'node_slack_frame2'],
    reason: 'Capturas consecutivas do mesmo canal de Slack com 85% de texto sobreposto.',
    recommendedKeepId: 'node_slack_frame2',
    status: 'pending_decision',
  },
];

const INITIAL_VAULTS: VaultSource[] = [
  {
    id: 'local-photos',
    name: 'Capturas do Dispositivo (Local Vault)',
    type: 'local',
    status: 'connected',
    itemCount: 7,
    lastSync: '2026-10-05T16:50:00Z',
  },
  {
    id: 'google-drive',
    name: 'Google Drive Vault (/Screenshots)',
    type: 'google-drive',
    status: 'idle',
    itemCount: 1,
    lastSync: '2026-10-05T15:30:00Z',
    driveFolderId: 'root',
  },
  {
    id: 'icloud-backup',
    name: 'Backup Soberano (iCloud)',
    type: 'icloud',
    status: 'idle',
    itemCount: 0,
    lastSync: '2026-10-04T12:00:00Z',
  },
];

/**
 * Initialize storage with default seeds if empty
 */
export async function initializeStorage(): Promise<{
  screenshots: ScreenshotNode[];
  clusters: ClusterNode[];
  edges: GraphEdge[];
  redundancyGroups: RedundancyGroup[];
  vaults: VaultSource[];
  alerts: CognitiveAlert[];
}> {
  try {
    const db = await openDB();
    const tx = db.transaction(
      ['screenshots', 'clusters', 'edges', 'redundancy_groups', 'vault_sources'],
      'readonly'
    );

    const getCount = (storeName: string): Promise<number> => {
      return new Promise((res) => {
        const req = tx.objectStore(storeName).count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      });
    };

    const count = await getCount('screenshots');

    if (count === 0) {
      // Seed initial database
      const writeTx = db.transaction(
        ['screenshots', 'clusters', 'edges', 'redundancy_groups', 'vault_sources'],
        'readwrite'
      );

      INITIAL_CLUSTERS.forEach((c) => writeTx.objectStore('clusters').put(c));
      INITIAL_SCREENSHOTS.forEach((s) => writeTx.objectStore('screenshots').put(s));
      INITIAL_EDGES.forEach((e) => writeTx.objectStore('edges').put(e));
      INITIAL_REDUNDANCY_GROUPS.forEach((r) => writeTx.objectStore('redundancy_groups').put(r));
      INITIAL_VAULTS.forEach((v) => writeTx.objectStore('vault_sources').put(v));

      await new Promise<void>((resolve) => {
        writeTx.oncomplete = () => resolve();
      });

      return {
        screenshots: INITIAL_SCREENSHOTS,
        clusters: INITIAL_CLUSTERS,
        edges: INITIAL_EDGES,
        redundancyGroups: INITIAL_REDUNDANCY_GROUPS,
        vaults: INITIAL_VAULTS,
        alerts: INITIAL_ALERTS,
      };
    }

    // Load from DB
    const getAll = <T>(storeName: string): Promise<T[]> => {
      return new Promise((res, rej) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    };

    const [screenshots, clusters, edges, redundancyGroups, vaults] = await Promise.all([
      getAll<ScreenshotNode>('screenshots'),
      getAll<ClusterNode>('clusters'),
      getAll<GraphEdge>('edges'),
      getAll<RedundancyGroup>('redundancy_groups'),
      getAll<VaultSource>('vault_sources'),
    ]);

    // Ensure initial rich multimodal seed nodes exist if missing
    let mergedScreenshots = [...screenshots];
    INITIAL_SCREENSHOTS.forEach((seed) => {
      if (!mergedScreenshots.some((s) => s.id === seed.id)) {
        mergedScreenshots.push(seed);
      }
    });

    // Retrieve alerts from localStorage cache or fallback to INITIAL_ALERTS
    let cachedAlertsList: CognitiveAlert[] = INITIAL_ALERTS;
    try {
      const raw = localStorage.getItem('aura_alerts_cache');
      if (raw) {
        cachedAlertsList = JSON.parse(raw);
      } else {
        localStorage.setItem('aura_alerts_cache', JSON.stringify(INITIAL_ALERTS));
      }
    } catch {
      cachedAlertsList = INITIAL_ALERTS;
    }

    return {
      screenshots: mergedScreenshots,
      clusters,
      edges,
      redundancyGroups,
      vaults,
      alerts: cachedAlertsList,
    };
  } catch (err) {
    console.warn('Falling back to in-memory initial seed:', err);
    return {
      screenshots: INITIAL_SCREENSHOTS,
      clusters: INITIAL_CLUSTERS,
      edges: INITIAL_EDGES,
      redundancyGroups: INITIAL_REDUNDANCY_GROUPS,
      vaults: INITIAL_VAULTS,
      alerts: INITIAL_ALERTS,
    };
  }
}

/**
 * Save or update an Alert in persistent cache
 */
export async function saveAlert(alert: CognitiveAlert): Promise<void> {
  try {
    const raw = localStorage.getItem('aura_alerts_cache');
    const alerts: CognitiveAlert[] = raw ? JSON.parse(raw) : INITIAL_ALERTS;
    const updated = alerts.some((a) => a.id === alert.id)
      ? alerts.map((a) => (a.id === alert.id ? alert : a))
      : [alert, ...alerts];
    localStorage.setItem('aura_alerts_cache', JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving alert:', err);
  }
}

/**
 * Save bulk alerts list
 */
export async function saveAlertsList(alerts: CognitiveAlert[]): Promise<void> {
  try {
    localStorage.setItem('aura_alerts_cache', JSON.stringify(alerts));
  } catch (err) {
    console.error('Error saving alerts list:', err);
  }
}

/**
 * Save or update a Screenshot
 */
export async function saveScreenshot(node: ScreenshotNode): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('screenshots', 'readwrite');
    tx.objectStore('screenshots').put(node);
  } catch (err) {
    console.error('Error saving screenshot to IDB:', err);
  }
}

/**
 * Save or update a Cluster
 */
export async function saveCluster(cluster: ClusterNode): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('clusters', 'readwrite');
    tx.objectStore('clusters').put(cluster);
  } catch (err) {
    console.error('Error saving cluster to IDB:', err);
  }
}

/**
 * Save or update an Edge
 */
export async function saveEdge(edge: GraphEdge): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('edges', 'readwrite');
    tx.objectStore('edges').put(edge);
  } catch (err) {
    console.error('Error saving edge to IDB:', err);
  }
}

/**
 * Save Redundancy Decision
 */
export async function saveRedundancyGroup(group: RedundancyGroup): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('redundancy_groups', 'readwrite');
    tx.objectStore('redundancy_groups').put(group);
  } catch (err) {
    console.error('Error saving redundancy group to IDB:', err);
  }
}

/**
 * LGPD Right to be Forgotten: Permanently purge node and generate cryptographic exclusion receipt
 */
export async function purgeWithRightToBeForgotten(
  id: string,
  type: 'screenshot' | 'cluster'
): Promise<LgpdReceipt> {
  const timestamp = new Date().toISOString();
  const rawPayload = `${id}:${type}:${timestamp}:${Math.random().toString(36)}`;
  const signature = await computeContentHash(rawPayload);

  const receipt: LgpdReceipt = {
    receiptId: `lgpd_receipt_${Date.now()}`,
    timestamp,
    targetId: id,
    targetType: type,
    contentHash: signature.slice(0, 32),
    cryptographicSignature: `SHA256-SIG-${signature}`,
    action: 'purged_with_right_to_be_forgotten',
  };

  try {
    const db = await openDB();
    if (type === 'screenshot') {
      const tx = db.transaction(['screenshots', 'edges', 'lgpd_receipts'], 'readwrite');
      tx.objectStore('screenshots').delete(id);
      // Clean up connected edges
      const edgeStore = tx.objectStore('edges');
      const edgeReq = edgeStore.getAll();
      edgeReq.onsuccess = () => {
        const allEdges: GraphEdge[] = edgeReq.result || [];
        allEdges.forEach((e) => {
          if (e.source === id || e.target === id) {
            edgeStore.delete(e.id);
          }
        });
      };
      tx.objectStore('lgpd_receipts').put(receipt);
    } else {
      const tx = db.transaction(['clusters', 'edges', 'lgpd_receipts'], 'readwrite');
      tx.objectStore('clusters').delete(id);
      const edgeStore = tx.objectStore('edges');
      const edgeReq = edgeStore.getAll();
      edgeReq.onsuccess = () => {
        const allEdges: GraphEdge[] = edgeReq.result || [];
        allEdges.forEach((e) => {
          if (e.source === id || e.target === id) {
            edgeStore.delete(e.id);
          }
        });
      };
      tx.objectStore('lgpd_receipts').put(receipt);
    }
  } catch (err) {
    console.error('Error purging with right to be forgotten:', err);
  }

  return receipt;
}

/**
 * Universal Knowledge Portability: Export Vault to Obsidian Markdown Bundle
 */
export function generateObsidianExportBundle(
  screenshots: ScreenshotNode[],
  clusters: ClusterNode[]
): { filename: string; content: string } {
  let markdown = `# AURA SOVEREIGN VISUAL BRAIN EXPORT
Gerado em: ${new Date().toLocaleString()}
Identificador: com.personia.aura
Total de Capturas: ${screenshots.length} | Clusters: ${clusters.length}

---

## ÍNDICE DE CLUSTERS TEMÁTICOS
`;

  clusters.forEach((c) => {
    markdown += `\n### [[${c.name}]]\n`;
    markdown += `**Descrição**: ${c.description}\n`;
    markdown += `**Tags**: ${c.tags.map((t) => `#${t}`).join(' ')}\n\n`;
    markdown += `#### Key Takeaways:\n`;
    c.summary.keyTakeaways.forEach((k) => (markdown += `- ${k}\n`));
    markdown += `\n#### Pontos de Ação:\n`;
    c.summary.actionPoints.forEach((a) => (markdown += `- [ ] ${a}\n`));
    markdown += `\n`;
  });

  markdown += `\n---\n\n## ACERVO DE CAPTURAS DE TELA\n`;

  screenshots.forEach((s) => {
    const cluster = clusters.find((c) => c.id === s.clusterId);
    markdown += `\n### ${s.filename}\n`;
    markdown += `\`\`\`yaml\n`;
    markdown += `id: "${s.id}"\n`;
    markdown += `contentHash: "${s.contentHash}"\n`;
    markdown += `timestamp: "${s.timestamp}"\n`;
    markdown += `sourceApp: "${s.sourceApp}"\n`;
    markdown += `cluster: "[[${cluster?.name || 'Inbox'}]]"\n`;
    markdown += `tags: [${s.tags.map((t) => `"${t}"`).join(', ')}]\n`;
    markdown += `lgpdMasked: ${s.lgpdMasked}\n`;
    markdown += `\`\`\`\n\n`;
    markdown += `**Resumo Visual**: ${s.visualContext?.summary || 'N/A'}\n\n`;
    markdown += `#### Texto Extraído (OCR):\n`;
    markdown += `> ${(s.userEditedText || s.ocrText || 'Nenhum texto detectado.').replace(/\n/g, '\n> ')}\n\n`;
    markdown += `---\n`;
  });

  return {
    filename: `Aura_Vault_Obsidian_${new Date().toISOString().slice(0, 10)}.md`,
    content: markdown,
  };
}
