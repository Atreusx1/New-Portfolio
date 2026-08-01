/**
 * graph.ts — the blockchain topology, ported from `universe/Graph.ts`.
 *
 * The generation pipeline is unchanged and deliberately so — this is the part
 * of the old engine that was genuinely good, and it was never 2D-specific:
 *
 *   assignKinds → buildEdges (k-nearest) → ensureConnected (union-find) → adjacency
 *
 * Only the *space* changed. The original placed nodes on a jittered 2-D grid
 * sized from viewport area (`areaPerNode: 11000` px²); this places them on a
 * jittered 3-D lattice inside a world-space box. Everything downstream — the
 * kind ratios, the per-kind edge counts, the union-find bridge pass, the BFS
 * routing and ripple — operates on ids and neighbours and did not care about
 * dimensionality at all.
 *
 * Rendering lives in `motifs/NetworkGraph.tsx`. This file has no three.js
 * import and can be unit-tested without a canvas.
 */
import { createRandom, dist3 } from "./noise";

export type NodeKind = "validator" | "relay" | "client";

export const GRAPH_CONFIG = {
  /** Kind mix — carried over unchanged from the old Config.graph. */
  validatorRatio: 0.06,
  relayRatio: 0.22,
  edgesPerValidator: 5,
  edgesPerRelay: 4,
  edgesPerClient: 2,
  /** Point sizes per role, in the particle material's size units. */
  validatorSize: 3.2,
  relaySize: 2.2,
  clientSize: 1.4,
  /** How far a node may drift from its anchor, in world units. */
  driftAmplitude: 0.55,
  /** Slow heartbeat oscillation of validators. */
  breathePeriod: 4.5,
  breatheAmount: 0.18,
  /** Consensus ripple, unchanged. */
  ripple: { hopDelay: 0.09, maxHops: 5, glowDecay: 0.9, intensity: 0.85 },
} as const;

export class GraphNode {
  readonly id: number;
  readonly kind: NodeKind;
  readonly size: number;
  /** Per-node phase so validators don't breathe in unison. */
  readonly phase: number;

  /** Anchor the node always returns toward. */
  homeX: number;
  homeY: number;
  homeZ: number;

  /** Resolved render position (home + flow drift), updated each frame. */
  x: number;
  y: number;
  z: number;

  readonly neighbors: number[] = [];

  /** Absolute time at which this node's ripple glow peaks. <0 = none. */
  rippleAt = -1;

  constructor(
    id: number,
    kind: NodeKind,
    x: number,
    y: number,
    z: number,
    phase: number,
  ) {
    this.id = id;
    this.kind = kind;
    this.homeX = x;
    this.homeY = y;
    this.homeZ = z;
    this.x = x;
    this.y = y;
    this.z = z;
    this.phase = phase;
    this.size =
      kind === "validator"
        ? GRAPH_CONFIG.validatorSize
        : kind === "relay"
          ? GRAPH_CONFIG.relaySize
          : GRAPH_CONFIG.clientSize;
  }

  /** Ripple glow at `time`, 0..1 with exponential decay. */
  rippleGlow(time: number): number {
    if (this.rippleAt < 0) return 0;
    const dt = time - this.rippleAt;
    if (dt < 0) return 0; // wavefront hasn't reached us yet
    const g = Math.exp(-dt / GRAPH_CONFIG.ripple.glowDecay);
    return g < 0.01 ? 0 : g;
  }
}

export interface GraphEdge {
  a: number;
  b: number;
  /** Absolute time until which a passing packet keeps this edge lit. */
  litUntil: number;
}

export interface GraphBounds {
  width: number;
  height: number;
  depth: number;
}

export class NetworkTopology {
  readonly nodes: GraphNode[] = [];
  readonly edges: GraphEdge[] = [];
  readonly validators: number[] = [];
  readonly clients: number[] = [];

  private readonly rand: () => number;
  private readonly nnDist: number[] = [];
  private readonly nnIdx: number[] = [];

  constructor(seed: number, count: number, bounds: GraphBounds) {
    this.rand = createRandom(seed);
    this.generate(count, bounds);
  }

  private generate(count: number, bounds: GraphBounds): void {
    const kinds = this.assignKinds(count);

    // Jittered 3-D lattice — the direct analogue of the original's jittered
    // grid. Even, organic coverage; no clumping, no visible rows.
    const { width, height, depth } = bounds;
    const cells = Math.cbrt(count);
    const cols = Math.max(2, Math.round(cells * (width / height) ** 0.5));
    const rows = Math.max(2, Math.round(cells));
    const layers = Math.max(2, Math.ceil(count / (cols * rows)));

    const cw = width / cols;
    const ch = height / rows;
    const cd = depth / layers;

    let id = 0;
    for (let l = 0; l < layers && id < count; l++) {
      for (let r = 0; r < rows && id < count; r++) {
        for (let c = 0; c < cols && id < count; c++) {
          const x = (c + 0.15 + this.rand() * 0.7) * cw - width / 2;
          const y = (r + 0.15 + this.rand() * 0.7) * ch - height / 2;
          const z = (l + 0.15 + this.rand() * 0.7) * cd - depth / 2;
          const node = new GraphNode(
            id,
            kinds[id],
            x,
            y,
            z,
            this.rand() * Math.PI * 2,
          );
          this.nodes.push(node);
          if (node.kind === "validator") this.validators.push(id);
          else if (node.kind === "client") this.clients.push(id);
          id++;
        }
      }
    }

    this.buildEdges();
    this.ensureConnected();
    this.rebuildAdjacency();
  }

  /** Unchanged from the original: spread roles through placement order. */
  private assignKinds(count: number): NodeKind[] {
    const nValidators = Math.max(3, Math.round(count * GRAPH_CONFIG.validatorRatio));
    const nRelays = Math.round(count * GRAPH_CONFIG.relayRatio);
    const kinds: NodeKind[] = new Array<NodeKind>(count).fill("client");
    for (let v = 0; v < nValidators; v++) {
      kinds[Math.floor(((v + 0.5) / nValidators) * count)] = "validator";
    }
    let placed = 0;
    let i = 0;
    while (placed < nRelays && i < count) {
      const idx = Math.floor(((placed + 0.25) / nRelays) * count + i) % count;
      if (kinds[idx] === "client") {
        kinds[idx] = "relay";
        placed++;
      }
      i++;
    }
    return kinds;
  }

  private edgeCountFor(kind: NodeKind): number {
    return kind === "validator"
      ? GRAPH_CONFIG.edgesPerValidator
      : kind === "relay"
        ? GRAPH_CONFIG.edgesPerRelay
        : GRAPH_CONFIG.edgesPerClient;
  }

  /** k-nearest-neighbour edges, deduplicated. */
  private buildEdges(): void {
    const n = this.nodes.length;
    const seen = new Set<number>();
    for (let i = 0; i < n; i++) {
      this.kNearest(i, this.edgeCountFor(this.nodes[i].kind));
      for (let m = 0; m < this.nnIdx.length; m++) {
        const j = this.nnIdx[m];
        const key = i < j ? i * n + j : j * n + i;
        if (seen.has(key)) continue;
        seen.add(key);
        this.edges.push({ a: i, b: j, litUntil: -1 });
      }
    }
  }

  /** Insertion into a tiny sorted list (k ≤ 6) — cheaper than sorting all. */
  private kNearest(i: number, k: number): void {
    this.nnDist.length = 0;
    this.nnIdx.length = 0;
    const a = this.nodes[i];
    for (let j = 0; j < this.nodes.length; j++) {
      if (j === i) continue;
      const b = this.nodes[j];
      const d = dist3(a.homeX, a.homeY, a.homeZ, b.homeX, b.homeY, b.homeZ);
      let pos = this.nnDist.length;
      while (pos > 0 && this.nnDist[pos - 1] > d) pos--;
      if (pos < k) {
        this.nnDist.splice(pos, 0, d);
        this.nnIdx.splice(pos, 0, j);
        if (this.nnDist.length > k) {
          this.nnDist.pop();
          this.nnIdx.pop();
        }
      }
    }
  }

  /**
   * Union-find pass: stitch disconnected components with their nearest bridge.
   *
   * This matters more in 3-D than it did in 2-D — k-nearest in a volume
   * fragments into isolated clusters far more readily than on a plane, and an
   * unconnected client is a node the packet router can never route from.
   */
  private ensureConnected(): void {
    const n = this.nodes.length;
    const parent = new Array<number>(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const union = (a: number, b: number): void => {
      parent[find(a)] = find(b);
    };
    for (const e of this.edges) union(e.a, e.b);

    let guard = n;
    while (guard-- > 0) {
      let bestA = -1;
      let bestB = -1;
      let bestD = Infinity;
      let distinct = false;
      const root0 = find(0);
      for (let i = 0; i < n; i++) {
        if (find(i) === root0) continue;
        distinct = true;
        for (let j = 0; j < n; j++) {
          if (find(j) !== root0) continue;
          const a = this.nodes[i];
          const b = this.nodes[j];
          const d = dist3(a.homeX, a.homeY, a.homeZ, b.homeX, b.homeY, b.homeZ);
          if (d < bestD) {
            bestD = d;
            bestA = i;
            bestB = j;
          }
        }
      }
      if (!distinct) break;
      this.edges.push({ a: bestA, b: bestB, litUntil: -1 });
      union(bestA, bestB);
    }
  }

  private rebuildAdjacency(): void {
    for (const node of this.nodes) node.neighbors.length = 0;
    for (const e of this.edges) {
      this.nodes[e.a].neighbors.push(e.b);
      this.nodes[e.b].neighbors.push(e.a);
    }
  }

  /**
   * Consensus ripple — BFS outward from a validator, scheduling a glow time on
   * every node reached: `rippleAt = now + hops * hopDelay`.
   *
   * Unchanged from `universe/Ripple.ts`, including the "keep the earlier
   * wavefront when two ripples overlap" rule. Nodes read their own glow from
   * these timestamps, so the wave visibly travels along the real topology hop
   * by hop rather than as a circular shockwave.
   */
  triggerRipple(validatorId: number, now: number): void {
    const nodes = this.nodes;
    const visited = new Int32Array(nodes.length);
    const queue = new Int32Array(nodes.length);

    let head = 0;
    let tail = 0;
    queue[tail++] = validatorId;
    visited[validatorId] = 1;
    nodes[validatorId].rippleAt = now;

    let depth = 0;
    let layerEnd = tail;

    while (head < tail && depth < GRAPH_CONFIG.ripple.maxHops) {
      const cur = queue[head++];
      const arriveAt = now + (depth + 1) * GRAPH_CONFIG.ripple.hopDelay;
      for (const nb of nodes[cur].neighbors) {
        if (visited[nb]) continue;
        visited[nb] = 1;
        const existing = nodes[nb].rippleAt;
        if (existing < now || arriveAt < existing) nodes[nb].rippleAt = arriveAt;
        if (tail < queue.length) queue[tail++] = nb;
      }
      if (head === layerEnd) {
        depth++;
        layerEnd = tail;
      }
    }
  }
}
