import { ClusterNode, ScreenshotNode, GraphEdge } from '../types/aura';

export type LayoutMode = 'constellation' | 'grid' | 'force';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculates the bounding box of all visible nodes on the canvas.
 */
export function calculateBoundingBox(
  clusters: ClusterNode[],
  screenshots: ScreenshotNode[]
): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  clusters.forEach((c) => {
    if (c.x !== undefined && c.y !== undefined) {
      minX = Math.min(minX, c.x - 35);
      maxX = Math.max(maxX, c.x + 35);
      minY = Math.min(minY, c.y - 35);
      maxY = Math.max(maxY, c.y + 50);
    }
  });

  screenshots.forEach((s) => {
    if (s.x !== undefined && s.y !== undefined) {
      minX = Math.min(minX, s.x - 30);
      maxX = Math.max(maxX, s.x + 30);
      minY = Math.min(minY, s.y - 30);
      maxY = Math.max(maxY, s.y + 45);
    }
  });

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600, centerX: 400, centerY: 300 };
  }

  const width = Math.max(maxX - minX, 100);
  const height = Math.max(maxY - minY, 100);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Constellation Orbital Layout:
 * Distributes clusters in a spacious macro-grid and arranges satellite items
 * in non-overlapping, harmonious orbits around their parent cluster hub.
 */
export function applyConstellationLayout(
  clusters: ClusterNode[],
  screenshots: ScreenshotNode[],
  edges: GraphEdge[] = []
): { clusters: ClusterNode[]; screenshots: ScreenshotNode[] } {
  const updatedClusters = [...clusters];
  const updatedScreenshots = [...screenshots];

  const clusterCount = updatedClusters.length;
  if (clusterCount === 0) return { clusters: updatedClusters, screenshots: updatedScreenshots };

  // 1. Position Cluster Hubs in a balanced spacious formation
  // For 4 clusters: 2x2 macro-grid centered at origin (500, 420)
  // Distance between cluster centers: ~540px horizontally, ~460px vertically
  const originX = 540;
  const originY = 440;

  if (clusterCount <= 4) {
    const macroOffset = 270;
    const vOffset = 230;
    const positions = [
      { x: originX - macroOffset, y: originY - vOffset }, // Top-Left
      { x: originX + macroOffset, y: originY - vOffset }, // Top-Right
      { x: originX + macroOffset, y: originY + vOffset }, // Bottom-Right
      { x: originX - macroOffset, y: originY + vOffset }, // Bottom-Left
    ];

    updatedClusters.forEach((c, idx) => {
      const pos = positions[idx % positions.length];
      c.x = pos.x;
      c.y = pos.y;
    });
  } else {
    // Equidistant polygon ring for arbitrary cluster counts
    const macroRadius = Math.max(380, clusterCount * 85);
    updatedClusters.forEach((c, idx) => {
      const angle = (2 * Math.PI * idx) / clusterCount - Math.PI / 2;
      c.x = Math.round(originX + macroRadius * Math.cos(angle));
      c.y = Math.round(originY + macroRadius * Math.sin(angle));
    });
  }

  // Map cluster coordinates for rapid lookup
  const clusterPosMap = new Map<string, { x: number; y: number }>();
  updatedClusters.forEach((c) => {
    if (c.x !== undefined && c.y !== undefined) {
      clusterPosMap.set(c.id, { x: c.x, y: c.y });
    }
  });

  // Group screenshots by parent cluster
  const itemsByCluster = new Map<string, ScreenshotNode[]>();
  const unassignedItems: ScreenshotNode[] = [];

  updatedScreenshots.forEach((s) => {
    if (s.clusterId && clusterPosMap.has(s.clusterId)) {
      const list = itemsByCluster.get(s.clusterId) || [];
      list.push(s);
      itemsByCluster.set(s.clusterId, list);
    } else {
      unassignedItems.push(s);
    }
  });

  // 2. Position satellite nodes in concentric orbital rings around each cluster
  itemsByCluster.forEach((items, cId) => {
    const cPos = clusterPosMap.get(cId)!;
    const count = items.length;
    if (count === 0) return;

    if (count <= 6) {
      // Single orbital ring with comfortable radius
      const orbitRadius = Math.max(130, 22 * count);
      // Slight angular offset to prevent strictly horizontal/vertical alignment
      const startAngle = -Math.PI / 4;

      items.forEach((item, idx) => {
        const angle = startAngle + (2 * Math.PI * idx) / count;
        item.x = Math.round(cPos.x + orbitRadius * Math.cos(angle));
        item.y = Math.round(cPos.y + orbitRadius * Math.sin(angle));
      });
    } else {
      // Double concentric orbits for dense clusters
      const innerCount = Math.min(5, Math.ceil(count / 2));
      const outerCount = count - innerCount;
      const r1 = 125;
      const r2 = 195;

      items.forEach((item, idx) => {
        if (idx < innerCount) {
          const angle = -Math.PI / 4 + (2 * Math.PI * idx) / innerCount;
          item.x = Math.round(cPos.x + r1 * Math.cos(angle));
          item.y = Math.round(cPos.y + r1 * Math.sin(angle));
        } else {
          const outerIdx = idx - innerCount;
          // Stagger outer orbit by half a step
          const angle = -Math.PI / 4 + ((outerIdx + 0.5) * 2 * Math.PI) / outerCount;
          item.x = Math.round(cPos.x + r2 * Math.cos(angle));
          item.y = Math.round(cPos.y + r2 * Math.sin(angle));
        }
      });
    }
  });

  // Position unassigned or orphan items in an outer peripheral arc
  if (unassignedItems.length > 0) {
    const peripheralRadius = 580;
    unassignedItems.forEach((item, idx) => {
      const angle = (2 * Math.PI * idx) / unassignedItems.length;
      item.x = Math.round(originX + peripheralRadius * Math.cos(angle));
      item.y = Math.round(originY + peripheralRadius * Math.sin(angle));
    });
  }

  // 3. Collision Relaxation Pass: push apart any pairs that are closer than minDistance
  const minDistance = 88; // 50px card + 38px breathing space
  for (let step = 0; step < 40; step++) {
    for (let i = 0; i < updatedScreenshots.length; i++) {
      for (let j = i + 1; j < updatedScreenshots.length; j++) {
        const n1 = updatedScreenshots[i];
        const n2 = updatedScreenshots[j];
        if (n1.x === undefined || n1.y === undefined || n2.x === undefined || n2.y === undefined) continue;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < minDistance) {
          const overlap = (minDistance - dist) / 2;
          const nx = (dx / dist) * overlap * 0.8;
          const ny = (dy / dist) * overlap * 0.8;

          n1.x -= nx;
          n1.y -= ny;
          n2.x += nx;
          n2.y += ny;
        }
      }
    }
  }

  return { clusters: updatedClusters, screenshots: updatedScreenshots };
}

/**
 * Grid Layout:
 * Aligns clusters as semantic columns with their items arranged neatly below.
 */
export function applyGridLayout(
  clusters: ClusterNode[],
  screenshots: ScreenshotNode[]
): { clusters: ClusterNode[]; screenshots: ScreenshotNode[] } {
  const updatedClusters = [...clusters];
  const updatedScreenshots = [...screenshots];

  const colWidth = 240;
  const rowHeight = 110;
  const startX = 220;
  const startY = 160;

  updatedClusters.forEach((cluster, colIdx) => {
    const cx = startX + colIdx * colWidth;
    cluster.x = cx;
    cluster.y = startY;

    const clusterScreenshots = updatedScreenshots.filter((s) => s.clusterId === cluster.id);
    clusterScreenshots.forEach((item, rowIdx) => {
      item.x = cx;
      item.y = startY + 130 + rowIdx * rowHeight;
    });
  });

  // Any unassigned
  const unassigned = updatedScreenshots.filter((s) => !clusters.some((c) => c.id === s.clusterId));
  unassigned.forEach((item, idx) => {
    item.x = startX + clusters.length * colWidth;
    item.y = startY + 130 + idx * rowHeight;
  });

  return { clusters: updatedClusters, screenshots: updatedScreenshots };
}

/**
 * Force-Directed Layout:
 * Physics-based relaxation using Coulomb node repulsion and Hooke spring tension.
 */
export function applyForceDirectedLayout(
  clusters: ClusterNode[],
  screenshots: ScreenshotNode[],
  edges: GraphEdge[],
  iterations = 80
): { clusters: ClusterNode[]; screenshots: ScreenshotNode[] } {
  const updatedClusters = [...clusters];
  const updatedScreenshots = [...screenshots];

  interface NodeItem {
    id: string;
    isCluster: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    clusterId?: string;
  }

  const allNodes: NodeItem[] = [
    ...updatedClusters.map((c) => ({
      id: c.id,
      isCluster: true,
      x: c.x ?? Math.random() * 500,
      y: c.y ?? Math.random() * 500,
      vx: 0,
      vy: 0,
    })),
    ...updatedScreenshots.map((s) => ({
      id: s.id,
      isCluster: false,
      x: s.x ?? Math.random() * 500,
      y: s.y ?? Math.random() * 500,
      vx: 0,
      vy: 0,
      clusterId: s.clusterId,
    })),
  ];

  const nodeMap = new Map<string, NodeItem>();
  allNodes.forEach((n) => nodeMap.set(n.id, n));

  const kRepulse = 9000;
  const kSpring = 0.04;
  const idealDist = 130;
  const damping = 0.88;

  for (let it = 0; it < iterations; it++) {
    // 1. Coulomb Repulsion between all pairs
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const n1 = allNodes[i];
        const n2 = allNodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 400) {
          const force = kRepulse / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // 2. Spring Attraction along Edges
    edges.forEach((edge) => {
      const n1 = nodeMap.get(edge.source);
      const n2 = nodeMap.get(edge.target);
      if (!n1 || !n2) return;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const displacement = dist - idealDist;
      const force = displacement * kSpring;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      n1.vx += fx;
      n1.vy += fy;
      n2.vx -= fx;
      n2.vy -= fy;
    });

    // 3. Cluster Gravity: items attracted to their parent cluster hub
    allNodes.forEach((n) => {
      if (!n.isCluster && n.clusterId) {
        const clusterHub = nodeMap.get(n.clusterId);
        if (clusterHub) {
          const dx = clusterHub.x - n.x;
          const dy = clusterHub.y - n.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = (dist - 120) * 0.03;
          n.vx += (dx / dist) * pull;
          n.vy += (dy / dist) * pull;
        }
      }
    });

    // 4. Position Update with damping
    allNodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= damping;
      n.vy *= damping;
    });
  }

  // Transfer back coordinates
  updatedClusters.forEach((c) => {
    const item = nodeMap.get(c.id);
    if (item) {
      c.x = Math.round(item.x);
      c.y = Math.round(item.y);
    }
  });

  updatedScreenshots.forEach((s) => {
    const item = nodeMap.get(s.id);
    if (item) {
      s.x = Math.round(item.x);
      s.y = Math.round(item.y);
    }
  });

  return { clusters: updatedClusters, screenshots: updatedScreenshots };
}

/**
 * Calculates a collision-free orbital spot for newly ingested items.
 */
export function calculateNextNodePosition(
  clusterId: string,
  existingNodes: ScreenshotNode[],
  clusters: ClusterNode[]
): { x: number; y: number } {
  const cluster = clusters.find((c) => c.id === clusterId) || clusters[0];
  if (!cluster || cluster.x === undefined || cluster.y === undefined) {
    return { x: 500, y: 400 };
  }

  const siblings = existingNodes.filter(
    (n) => n.clusterId === cluster.id && n.x !== undefined && n.y !== undefined
  );

  const radius = 135;
  if (siblings.length === 0) {
    return {
      x: Math.round(cluster.x + radius),
      y: Math.round(cluster.y),
    };
  }

  // Calculate angles of existing siblings
  const angles = siblings.map((s) => {
    const dx = s.x! - cluster.x!;
    const dy = s.y! - cluster.y!;
    let ang = Math.atan2(dy, dx);
    if (ang < 0) ang += 2 * Math.PI;
    return ang;
  }).sort((a, b) => a - b);

  // Find the largest angular gap
  let maxGap = 0;
  let targetAngle = 0;

  for (let i = 0; i < angles.length; i++) {
    const nextIdx = (i + 1) % angles.length;
    let gap = angles[nextIdx] - angles[i];
    if (gap <= 0) gap += 2 * Math.PI;

    if (gap > maxGap) {
      maxGap = gap;
      targetAngle = angles[i] + gap / 2;
    }
  }

  return {
    x: Math.round(cluster.x + radius * Math.cos(targetAngle)),
    y: Math.round(cluster.y + radius * Math.sin(targetAngle)),
  };
}
