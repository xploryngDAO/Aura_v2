import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ScreenshotNode, ClusterNode, GraphEdge } from '../types/aura';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Orbit,
  LayoutGrid,
  Sparkles,
  RefreshCw,
  FileText,
  Mic,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import {
  LayoutMode,
  applyConstellationLayout,
  applyGridLayout,
  applyForceDirectedLayout,
  calculateBoundingBox,
} from '../lib/graphLayout';

interface Props {
  screenshots: ScreenshotNode[];
  clusters: ClusterNode[];
  edges: GraphEdge[];
  searchQuery: string;
  selectedNodeId: string | null;
  onSelectNode: (node: ScreenshotNode | ClusterNode | null) => void;
  densityFilter: 'all' | 'high_confidence' | 'clusters_only';
  onDensityFilterChange: (mode: 'all' | 'high_confidence' | 'clusters_only') => void;
}

export type ModalityFilter = 'all' | 'notes' | 'voice' | 'screenshots';

export const CognitiveGraphCanvas: React.FC<Props> = ({
  screenshots,
  clusters,
  edges,
  searchQuery,
  selectedNodeId,
  onSelectNode,
  densityFilter = 'all',
  onDensityFilterChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const [scaleDisplay, setScaleDisplay] = useState(1);
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('constellation');
  const [isOrganizing, setIsOrganizing] = useState(false);

  // Inertia and interaction state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const draggedNodeRef = useRef<any>(null);
  const pulsePhaseRef = useRef(0);
  const [hoveredNode, setHoveredNode] = useState<{
    node: ScreenshotNode | ClusterNode;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Smooth layout animation ref
  const layoutAnimationRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    targets: Map<string, { startX: number; startY: number; targetX: number; targetY: number }>;
  } | null>(null);

  // Smooth camera pan/zoom animation ref
  const cameraAnimationRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startTx: number;
    startTy: number;
    startScale: number;
    targetTx: number;
    targetTy: number;
    targetScale: number;
  } | null>(null);

  // Loaded images cache for thumbnails
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Multi-touch gestures for mobile pinch-to-zoom
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);

  // High-density counts by knowledge modality
  const modalityCounts = {
    all: screenshots.filter((s) => !s.isArchived).length,
    notes: screenshots.filter((s) => !s.isArchived && s.itemType === 'text_note').length,
    voice: screenshots.filter((s) => !s.isArchived && s.itemType === 'voice_audio').length,
    screenshots: screenshots.filter((s) => !s.isArchived && (!s.itemType || s.itemType === 'screenshot')).length,
  };

  // Filter items based on modality filter and density filter
  const visibleScreenshots = screenshots.filter((s) => {
    if (s.isArchived) return false;
    if (densityFilter === 'clusters_only') return false;
    if (modalityFilter === 'screenshots') {
      return !s.itemType || s.itemType === 'screenshot';
    }
    if (modalityFilter === 'notes') {
      return s.itemType === 'text_note';
    }
    if (modalityFilter === 'voice') {
      return s.itemType === 'voice_audio';
    }
    return true;
  });

  const visibleClusters = clusters;

  const matchesSearch = useCallback(
    (item: ScreenshotNode | ClusterNode) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if ('filename' in item) {
        return (
          item.filename.toLowerCase().includes(q) ||
          item.sourceApp.toLowerCase().includes(q) ||
          (item.ocrText && item.ocrText.toLowerCase().includes(q)) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      } else {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
    },
    [searchQuery]
  );

  // Center on selected node smoothly
  useEffect(() => {
    if (!selectedNodeId || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let targetX = 0;
    let targetY = 0;
    let found = false;

    const cluster = clusters.find((c) => c.id === selectedNodeId);
    if (cluster && cluster.x !== undefined && cluster.y !== undefined) {
      targetX = cluster.x;
      targetY = cluster.y;
      found = true;
    } else {
      const scr = screenshots.find((s) => s.id === selectedNodeId);
      if (scr && scr.x !== undefined && scr.y !== undefined) {
        targetX = scr.x;
        targetY = scr.y;
        found = true;
      }
    }

    if (found) {
      const currentScale = transformRef.current.scale;
      transformRef.current.x = rect.width / 2 - targetX * currentScale;
      transformRef.current.y = rect.height / 2 - targetY * currentScale;
    }
  }, [selectedNodeId, clusters, screenshots]);

  // Fit View: centers & scales camera so all nodes fit comfortably
  const fitView = useCallback(
    (animate = true) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const bounds = calculateBoundingBox(clusters, screenshots);

      const padding = 110;
      const availableWidth = Math.max(rect.width - padding * 2, 200);
      const availableHeight = Math.max(rect.height - padding * 2, 200);

      const scaleX = availableWidth / bounds.width;
      const scaleY = availableHeight / bounds.height;
      const idealScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.15);

      const targetTx = rect.width / 2 - bounds.centerX * idealScale;
      const targetTy = rect.height / 2 - bounds.centerY * idealScale;

      if (!animate) {
        transformRef.current = { x: targetTx, y: targetTy, scale: idealScale };
        setScaleDisplay(idealScale);
        return;
      }

      cameraAnimationRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 550,
        startTx: transformRef.current.x,
        startTy: transformRef.current.y,
        startScale: transformRef.current.scale,
        targetTx,
        targetTy,
        targetScale: idealScale,
      };
    },
    [clusters, screenshots]
  );

  // Trigger Layout: animates nodes into the selected layout
  const handleApplyLayout = useCallback(
    (mode: LayoutMode) => {
      setLayoutMode(mode);
      setIsOrganizing(true);

      let layoutResult: { clusters: ClusterNode[]; screenshots: ScreenshotNode[] };
      if (mode === 'grid') {
        layoutResult = applyGridLayout(clusters, screenshots);
      } else if (mode === 'force') {
        layoutResult = applyForceDirectedLayout(clusters, screenshots, edges, 90);
      } else {
        layoutResult = applyConstellationLayout(clusters, screenshots, edges);
      }

      // Map start and target coordinates for animated ease-out
      const targets = new Map<string, { startX: number; startY: number; targetX: number; targetY: number }>();

      layoutResult.clusters.forEach((targetC) => {
        const c = clusters.find((item) => item.id === targetC.id);
        if (c && c.x !== undefined && c.y !== undefined && targetC.x !== undefined && targetC.y !== undefined) {
          targets.set(c.id, {
            startX: c.x,
            startY: c.y,
            targetX: targetC.x,
            targetY: targetC.y,
          });
        }
      });

      layoutResult.screenshots.forEach((targetS) => {
        const s = screenshots.find((item) => item.id === targetS.id);
        if (s && s.x !== undefined && s.y !== undefined && targetS.x !== undefined && targetS.y !== undefined) {
          targets.set(s.id, {
            startX: s.x,
            startY: s.y,
            targetX: targetS.x,
            targetY: targetS.y,
          });
        }
      });

      layoutAnimationRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 580,
        targets,
      };

      setTimeout(() => {
        setIsOrganizing(false);
        fitView(true);
      }, 600);
    },
    [clusters, screenshots, edges, fitView]
  );

  // Initial auto-centering on canvas mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView(false);
    }, 120);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Main Render Loop (60 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      pulsePhaseRef.current += 0.02;
      const now = performance.now();

      // Smooth layout node animation
      if (layoutAnimationRef.current?.active) {
        const anim = layoutAnimationRef.current;
        const elapsed = now - anim.startTime;
        const progress = Math.min(1, elapsed / anim.duration);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease out

        anim.targets.forEach((coords, id) => {
          const s = screenshots.find((item) => item.id === id);
          if (s) {
            s.x = coords.startX + (coords.targetX - coords.startX) * ease;
            s.y = coords.startY + (coords.targetY - coords.startY) * ease;
          }
          const c = clusters.find((item) => item.id === id);
          if (c) {
            c.x = coords.startX + (coords.targetX - coords.startX) * ease;
            c.y = coords.startY + (coords.targetY - coords.startY) * ease;
          }
        });

        if (progress >= 1) {
          anim.active = false;
        }
      }

      // Smooth camera pan/zoom animation
      if (cameraAnimationRef.current?.active) {
        const anim = cameraAnimationRef.current;
        const elapsed = now - anim.startTime;
        const progress = Math.min(1, elapsed / anim.duration);
        const ease = 1 - Math.pow(1 - progress, 3);

        transformRef.current.x = anim.startTx + (anim.targetTx - anim.startTx) * ease;
        transformRef.current.y = anim.startTy + (anim.targetTy - anim.startTy) * ease;
        transformRef.current.scale = anim.startScale + (anim.targetScale - anim.startScale) * ease;
        setScaleDisplay(transformRef.current.scale);

        if (progress >= 1) {
          anim.active = false;
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Deep, pure obsidian background with minimal ambient lighting
      ctx.fillStyle = '#06090F';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Subtle, quiet grid
      const { x: tx, y: ty, scale } = transformRef.current;
      const gridSize = 48 * scale;
      const offsetX = ((tx % gridSize) + gridSize) % gridSize;
      const offsetY = ((ty % gridSize) + gridSize) % gridSize;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      for (let x = offsetX; x < rect.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
      }
      for (let y = offsetY; y < rect.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
      }
      ctx.stroke();

      // Viewport transform
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Node coordinates lookup map
      const posMap = new Map<string, { x: number; y: number }>();
      visibleClusters.forEach((c) => {
        if (c.x !== undefined && c.y !== undefined) posMap.set(c.id, { x: c.x, y: c.y });
      });
      visibleScreenshots.forEach((s) => {
        if (s.x !== undefined && s.y !== undefined) posMap.set(s.id, { x: s.x, y: s.y });
      });

      // 1. Draw Clean Organic Curves (Synapses)
      edges.forEach((edge) => {
        const p1 = posMap.get(edge.source);
        const p2 = posMap.get(edge.target);
        if (!p1 || !p2) return;

        const isDeep = edge.type === 'deep_link';
        const isConnectedToSelected =
          selectedNodeId === edge.source || selectedNodeId === edge.target;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const normalX = -dy / (dist || 1);
        const normalY = dx / (dist || 1);
        const curvature = isDeep ? Math.min(dist * 0.12, 30) : Math.min(dist * 0.06, 14);
        const ctrlX = midX + normalX * curvature;
        const ctrlY = midY + normalY * curvature;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);

        if (isDeep) {
          // Subtle dashed line for inferred deep links
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -pulsePhaseRef.current * 6;
          ctx.strokeStyle = isConnectedToSelected
            ? 'rgba(129, 140, 248, 0.7)'
            : 'rgba(129, 140, 248, 0.25)';
          ctx.lineWidth = isConnectedToSelected ? 1.5 : 1;
          ctx.stroke();
        } else {
          // Calm factual edge
          ctx.strokeStyle = isConnectedToSelected
            ? 'rgba(56, 189, 248, 0.6)'
            : 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = isConnectedToSelected ? 1.5 : 0.8;
          ctx.stroke();
        }

        ctx.restore();
      });

      // Helper: Uniform flat glassmorphic surface
      const drawGlassTile = (
        x: number,
        y: number,
        width: number,
        height: number,
        borderRadius: number,
        isSelected: boolean,
        accentHighlight?: string
      ) => {
        // Base translucent frosted dark glass body
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, borderRadius);
        ctx.fillStyle = isSelected ? 'rgba(15, 23, 42, 0.88)' : 'rgba(10, 15, 26, 0.72)';
        ctx.fill();

        // Subtle specular wash
        const glassGrad = ctx.createLinearGradient(x, y, x, y + height);
        if (isSelected) {
          glassGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
          glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
          glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        } else {
          glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
          glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
          glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.005)');
        }
        ctx.fillStyle = glassGrad;
        ctx.fill();

        // Hairline glass border (No heavy drop shadows or bloated rings)
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, borderRadius);
        const borderGrad = ctx.createLinearGradient(x, y, x, y + height);
        if (isSelected) {
          borderGrad.addColorStop(0, accentHighlight || 'rgba(56, 189, 248, 0.9)');
          borderGrad.addColorStop(1, 'rgba(56, 189, 248, 0.35)');
          ctx.strokeStyle = borderGrad;
          ctx.lineWidth = 1.25;
        } else {
          borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
          borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
          ctx.strokeStyle = borderGrad;
          ctx.lineWidth = 0.75;
        }
        ctx.stroke();

        // Top glass edge reflection (Precision 1px hairline)
        ctx.beginPath();
        ctx.moveTo(x + borderRadius * 0.7, y + 0.75);
        ctx.lineTo(x + width - borderRadius * 0.7, y + 0.75);
        ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      };

      // 2. Draw Cluster Hubs (Unified Flat Glass Syntheses)
      visibleClusters.forEach((cluster) => {
        if (cluster.x === undefined || cluster.y === undefined) return;
        const cx = cluster.x;
        const cy = cluster.y;
        const isSelected = selectedNodeId === cluster.id;
        const isMatch = matchesSearch(cluster);
        const alpha = isMatch ? 1 : 0.18;

        const hubW = 54;
        const hubH = 54;
        const hubR = 16;
        const hx = cx - hubW / 2;
        const hy = cy - hubH / 2;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw unified glass chassis
        drawGlassTile(hx, hy, hubW, hubH, hubR, isSelected, '#38bdf8');

        // Central Cluster Glyph (Clean, elegant geometric interconnected hub mark)
        ctx.save();
        ctx.translate(cx, cy - 2);

        const r = 7;
        const pA = { x: 0, y: -r };
        const pB = { x: r * 0.866, y: r * 0.5 };
        const pC = { x: -r * 0.866, y: r * 0.5 };

        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.lineTo(pC.x, pC.y);
        ctx.closePath();
        ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        // 3 constellation nodes
        [pA, pB, pC].forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)';
          ctx.fill();
        });

        // Center hub dot
        ctx.beginPath();
        ctx.arc(0, 0, 1.25, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        ctx.restore();

        // Cluster Title (Clean, elegant typography)
        ctx.fillStyle = isSelected ? '#ffffff' : '#f1f5f9';
        ctx.font = '500 11px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cluster.name, cx, hy + hubH + 12);

        // Quiet count badge
        ctx.fillStyle = isSelected ? '#38bdf8' : '#64748b';
        ctx.font = '400 9px Inter, -apple-system, sans-serif';
        ctx.fillText(`${cluster.screenshotCount} itens`, cx, hy + hubH + 24);

        ctx.restore();
      });

      // 3. Draw Multi-Modal Knowledge Nodes (Uniform Flat Glass Cards)
      visibleScreenshots.forEach((node) => {
        if (node.x === undefined || node.y === undefined) return;
        const nx = node.x;
        const ny = node.y;
        const isSelected = selectedNodeId === node.id;
        const isMatch = matchesSearch(node);
        const alpha = isMatch ? 1 : 0.15;

        const w = 50;
        const h = 50;
        const r = 12;
        const rx = nx - w / 2;
        const ry = ny - h / 2;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw unified glass chassis
        drawGlassTile(rx, ry, w, h, r, isSelected);

        // Modality-specific interior
        if (node.itemType === 'voice_audio') {
          // Minimalist Voice Audio Equalizer (Flat, crisp)
          ctx.save();
          const waveCenterX = nx;
          const waveCenterY = ny - 2;
          const barHeights = [7, 16, 22, 12, 7];
          const barWidth = 2;
          const spacing = 3;
          const startX = waveCenterX - ((5 * (barWidth + spacing) - spacing) / 2);

          for (let i = 0; i < 5; i++) {
            const bh = barHeights[i];
            const bx = startX + i * (barWidth + spacing);
            const by = waveCenterY - bh / 2;
            ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.roundRect(bx, by, barWidth, bh, 1);
            ctx.fill();
          }

          // Flat duration label
          ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.8)' : 'rgba(255, 255, 255, 0.35)';
          ctx.font = '500 8px Inter, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${node.audioDuration || 14}s`, nx, ry + h - 6);
          ctx.restore();

        } else if (node.itemType === 'text_note') {
          // Minimalist Text Note Glyphs (Flat etched lines)
          ctx.save();
          const accentBar = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)';
          const bodyBar = 'rgba(255, 255, 255, 0.22)';

          // Header title bar
          ctx.fillStyle = accentBar;
          ctx.beginPath();
          ctx.roundRect(rx + 11, ry + 13, 14, 2, 1);
          ctx.fill();

          // Body text lines
          ctx.fillStyle = bodyBar;
          ctx.beginPath();
          ctx.roundRect(rx + 11, ry + 19, 28, 1.5, 0.75);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(rx + 11, ry + 25, 22, 1.5, 0.75);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(rx + 11, ry + 31, 16, 1.5, 0.75);
          ctx.fill();
          ctx.restore();

        } else {
          // Screenshot Thumbnail - Framed inside glass window
          if (node.thumbnailUrl || node.imageUrl) {
            const url = node.thumbnailUrl || node.imageUrl;
            let img = imageCacheRef.current.get(url);
            if (!img) {
              img = new Image();
              img.src = url;
              imageCacheRef.current.set(url, img);
            }
            if (img.complete && img.naturalWidth !== 0) {
              ctx.save();
              const inset = 3;
              ctx.beginPath();
              ctx.roundRect(rx + inset, ry + inset, w - inset * 2, h - inset * 2, r - 3);
              ctx.clip();
              ctx.drawImage(img, rx + inset, ry + inset, w - inset * 2, h - inset * 2);

              // Flat glass sheen over thumbnail
              ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)';
              ctx.fillRect(rx + inset, ry + inset, w - inset * 2, h - inset * 2);
              ctx.restore();
            }
          }
        }

        // Flat Status Pips (Non-decorative, microscopic precision)
        if (node.isReminder) {
          ctx.beginPath();
          ctx.arc(rx + w - 6, ry + 6, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }

        if (node.lgpdMasked) {
          ctx.beginPath();
          ctx.arc(rx + 6, ry + 6, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
        }

        // Restrained label beneath
        const labelText =
          node.itemType === 'voice_audio'
            ? 'Voz'
            : node.itemType === 'text_note'
            ? 'Nota'
            : node.sourceApp || 'Captura';

        ctx.font = '400 9px Inter, -apple-system, sans-serif';
        ctx.fillStyle = isSelected ? '#38bdf8' : '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, nx, ry + h + 10);

        ctx.restore();
      });

      ctx.restore(); // Restore world
      ctx.restore(); // Restore dpr

      // Kinetic damping
      if (!isDraggingRef.current) {
        transformRef.current.x += velocityRef.current.vx;
        transformRef.current.y += velocityRef.current.vy;
        velocityRef.current.vx *= 0.9;
        velocityRef.current.vy *= 0.9;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    visibleScreenshots,
    visibleClusters,
    edges,
    selectedNodeId,
    matchesSearch,
    modalityFilter,
  ]);

  const screenToWorld = (sx: number, sy: number) => {
    const { x, y, scale } = transformRef.current;
    return {
      x: (sx - x) / scale,
      y: (sy - y) / scale,
    };
  };

  const findNodeAt = (wx: number, wy: number): ScreenshotNode | ClusterNode | null => {
    for (const s of visibleScreenshots) {
      if (s.x === undefined || s.y === undefined) continue;
      const dx = wx - s.x;
      const dy = wy - s.y;
      if (Math.abs(dx) <= 26 && Math.abs(dy) <= 26) return s;
    }
    for (const c of visibleClusters) {
      if (c.x === undefined || c.y === undefined) continue;
      const dist = Math.hypot(wx - c.x, wy - c.y);
      if (dist <= 28) return c;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    activePointersRef.current.set(e.pointerId, { x: sx, y: sy });

    // Multi-touch pinch-to-zoom on mobile
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      initialPinchDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchScaleRef.current = transformRef.current.scale;
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      return;
    }

    const world = screenToWorld(sx, sy);
    isDraggingRef.current = true;
    dragStartRef.current = { x: sx, y: sy };
    velocityRef.current = { vx: 0, vy: 0 };

    const hit = findNodeAt(world.x, world.y);
    draggedNodeRef.current = hit || null;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: sx, y: sy });
    }

    // Two-finger pinch-to-zoom gesture
    if (activePointersRef.current.size === 2 && initialPinchDistRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = currentDist / initialPinchDistRef.current;
      const newScale = Math.min(Math.max(initialPinchScaleRef.current * ratio, 0.35), 3.0);
      transformRef.current.scale = newScale;
      setScaleDisplay(newScale);
      return;
    }

    if (isDraggingRef.current) {
      const dx = sx - dragStartRef.current.x;
      const dy = sy - dragStartRef.current.y;

      if (draggedNodeRef.current) {
        const currentScale = transformRef.current.scale;
        draggedNodeRef.current.x = (draggedNodeRef.current.x || 0) + dx / currentScale;
        draggedNodeRef.current.y = (draggedNodeRef.current.y || 0) + dy / currentScale;
      } else {
        transformRef.current.x += dx;
        transformRef.current.y += dy;
        velocityRef.current = { vx: dx * 0.4, vy: dy * 0.4 };
      }

      dragStartRef.current = { x: sx, y: sy };
      setHoveredNode(null);
    } else if (e.pointerType !== 'touch') {
      const world = screenToWorld(sx, sy);
      const hit = findNodeAt(world.x, world.y);
      if (hit) {
        setHoveredNode({ node: hit, screenX: sx, screenY: sy });
      } else {
        setHoveredNode(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      initialPinchDistRef.current = null;
    }

    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);

      const hit = findNodeAt(world.x, world.y);
      if (hit) {
        onSelectNode(hit);
      }
    }

    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const current = transformRef.current;
    const newScale = Math.min(Math.max(current.scale * zoomFactor, 0.35), 3.0);

    current.x = sx - (sx - current.x) * (newScale / current.scale);
    current.y = sy - (sy - current.y) * (newScale / current.scale);
    current.scale = newScale;
    setScaleDisplay(newScale);
  };

  const handleZoom = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const current = transformRef.current;
    const newScale = Math.min(Math.max(current.scale * factor, 0.35), 3.0);

    current.x = cx - (cx - current.x) * (newScale / current.scale);
    current.y = cy - (cy - current.y) * (newScale / current.scale);
    current.scale = newScale;
    setScaleDisplay(newScale);
  };

  const resetView = () => {
    fitView(true);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none touch-none bg-[#06090F]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Sovereign Glass Command Island: Modality Filters & Graph Modes */}
      <div
        className="absolute top-2.5 sm:top-3.5 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto max-w-2xl z-20 flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-[#070A14]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl transition-all"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Tier 1: Modality Content Types (Tudo, Notas, Áudios, Imagens) */}
        <div className="grid grid-cols-4 sm:flex sm:items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => setModalityFilter('all')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all select-none ${
              modalityFilter === 'all'
                ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
            title="Todos os nós do grafo"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Tudo</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-slate-300 tabular-nums font-semibold">
              {modalityCounts.all}
            </span>
          </button>

          <button
            onClick={() => setModalityFilter('notes')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all select-none ${
              modalityFilter === 'notes'
                ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
            title="Notas de texto e ideias"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Notas</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-slate-300 tabular-nums font-semibold">
              {modalityCounts.notes}
            </span>
          </button>

          <button
            onClick={() => setModalityFilter('voice')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all select-none ${
              modalityFilter === 'voice'
                ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
            title="Áudios de voz e gravações"
          >
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Áudios</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-slate-300 tabular-nums font-semibold">
              {modalityCounts.voice}
            </span>
          </button>

          <button
            onClick={() => setModalityFilter('screenshots')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all select-none ${
              modalityFilter === 'screenshots'
                ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
            title="Capturas de tela e fotos"
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Imagens</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-slate-300 tabular-nums font-semibold">
              {modalityCounts.screenshots}
            </span>
          </button>
        </div>

        {/* Sovereign Glass Hairline Separator */}
        <div className="hidden sm:block w-px h-5 bg-white/10 shrink-0 mx-0.5" />
        <div className="sm:hidden w-full h-px bg-white/[0.06]" />

        {/* Tier 2: Layout Modes & Quick Organize Action */}
        <div className="grid grid-cols-4 sm:flex sm:items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => handleApplyLayout('constellation')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors select-none ${
              layoutMode === 'constellation'
                ? 'bg-white/[0.12] text-white border border-white/[0.12] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
            title="Disposição em Constelações Orbitais"
          >
            <Orbit className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Constelação</span>
          </button>

          <button
            onClick={() => handleApplyLayout('grid')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors select-none ${
              layoutMode === 'grid'
                ? 'bg-white/[0.12] text-white border border-white/[0.12] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
            title="Disposição em Grade Alinhada"
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Grade</span>
          </button>

          <button
            onClick={() => handleApplyLayout('force')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors select-none ${
              layoutMode === 'force'
                ? 'bg-white/[0.12] text-white border border-white/[0.12] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
            title="Relaxação Orgânica (Física)"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Física</span>
          </button>

          <button
            onClick={() => handleApplyLayout(layoutMode)}
            disabled={isOrganizing}
            className="flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] text-xs font-medium transition-all active:scale-95 disabled:opacity-50 select-none border border-transparent hover:border-white/[0.06]"
            title="Reorganizar e eliminar sobreposições de nós"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isOrganizing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="truncate text-[11px] sm:text-xs">Organizar</span>
          </button>
        </div>
      </div>

      {/* Sovereign Glass Viewport Island (Bottom-Right, Compact & Non-Obtrusive) */}
      <div
        className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex items-center gap-0.5 sm:gap-1 p-1 bg-[#070A14]/85 backdrop-blur-2xl border border-white/[0.08] rounded-xl sm:rounded-2xl shadow-xl text-slate-400"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Viewport Fit */}
        <button
          onClick={() => fitView(true)}
          className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Enquadrar todos os nós na tela"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Subtle Glass Hairline Separator */}
        <div className="w-px h-3.5 bg-white/10 mx-0.5" />

        {/* Zoom Controls */}
        <button
          onClick={() => handleZoom(0.85)}
          className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Diminuir zoom"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={resetView}
          className="px-1.5 py-1 text-[10px] font-mono hover:text-white transition-colors tabular-nums"
          title="Redefinir escala (100%)"
        >
          {Math.round(scaleDisplay * 100)}%
        </button>

        <button
          onClick={() => handleZoom(1.15)}
          className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Aumentar zoom"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compact Hover Tooltip (Mouse only) */}
      {hoveredNode && !isDraggingRef.current && (
        <div
          className="absolute z-30 pointer-events-none p-3 rounded-xl bg-[#080C16]/90 backdrop-blur-2xl border border-white/[0.08] space-y-1 max-w-xs"
          style={{
            left: Math.min(hoveredNode.screenX + 12, window.innerWidth - 260),
            top: Math.min(hoveredNode.screenY + 12, window.innerHeight - 140),
          }}
        >
          <div className="text-[10px] text-slate-500 font-mono">
            {'itemType' in hoveredNode.node
              ? hoveredNode.node.itemType === 'voice_audio'
                ? 'Áudio de Voz'
                : hoveredNode.node.itemType === 'text_note'
                ? 'Nota de Texto'
                : hoveredNode.node.sourceApp
              : 'Cluster Temático'}
          </div>

          <h5 className="text-xs font-semibold text-white truncate">
            {'filename' in hoveredNode.node ? hoveredNode.node.filename : hoveredNode.node.name}
          </h5>

          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {'visualContext' in hoveredNode.node
              ? hoveredNode.node.visualContext?.summary
              : hoveredNode.node.description}
          </p>
        </div>
      )}
    </div>
  );
};
