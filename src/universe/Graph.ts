/**
 * Graph.ts
 *
 * The blockchain network itself.
 *
 * Generation
 * ──────────
 * · Nodes are placed on a jittered grid (even coverage, no clumps).
 * · Roles: few validators, some relays, many clients (Config ratios).
 * · Each node connects to its k nearest neighbours (k depends on role),
 *   then a union-find pass stitches any disconnected components together
 *   so the graph is always fully connected.
 *
 * Motion
 * ──────
 * Nodes never integrate velocity. Each frame:
 *   position = home + FlowField(home, t) · driftAmplitude + MouseField offset
 * Smooth, deterministic, and the topology stays legible because nodes
 * orbit their anchors instead of wandering.
 *
 * Rewiring
 * ────────
 * Every rewireInterval seconds one client edge fades out and re-grows
 * toward a different nearby node — the network quietly reorganizes.
 */

import { CONFIG } from "./Config";
import { FlowField } from "./FlowField";
import { MouseField } from "./MouseField";
import { UNode } from "./Node";
import { UEdge, EdgeState } from "./Edge";
import { createRandom, dist2, rgba } from "./Utils";
import type { FrameContext, NodeKind, Subsystem } from "./Types";

export class Graph implements Subsystem {
  readonly nodes: UNode[] = [];
  readonly edges: UEdge[] = [];
  /** Validator ids — packet routing targets. */
  readonly validators: number[] = [];
  /** Client ids — packet spawn points. */
  readonly clients: number[] = [];

  private readonly flow: FlowField;
  private readonly mouse: MouseField;
  private readonly rand: () => number;
  private rewireTimer = 0;
  private width = 0;
  private height = 0;

  /** Scratch buffers reused across frames — zero allocations in update/render. */
  private readonly nnDist: number[] = [];
  private readonly nnIdx: number[] = [];

  constructor(seed: number, flow: FlowField, mouse: MouseField) {
    this.flow = flow;
    this.mouse = mouse;
    this.rand = createRandom(seed);
  }

  // ── Generation ─────────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generate();
  }

  private generate(): void {
    const g = CONFIG.graph;
    this.nodes.length = 0;
    this.edges.length = 0;
    this.validators.length = 0;
    this.clients.length = 0;

    const area = this.width * this.height;
    const count = Math.round(
      Math.min(g.maxNodes, Math.max(g.minNodes, area / g.areaPerNode)),
    );

    // Jittered grid placement — even, organic coverage.
    const cols = Math.max(2, Math.round(Math.sqrt((count * this.width) / this.height)));
    const rows = Math.max(2, Math.ceil(count / cols));
    const cellW = this.width / cols;
    const cellH = this.height / rows;

    const kinds = this.assignKinds(count);
    let id = 0;
    for (let r = 0; r < rows && id < count; r++) {
      for (let c = 0; c < cols && id < count; c++) {
        const x = (c + 0.15 + this.rand() * 0.7) * cellW;
        const y = (r + 0.15 + this.rand() * 0.7) * cellH;
        const node = new UNode(id, kinds[id], x, y, this.rand() * Math.PI * 2);
        this.nodes.push(node);
        if (node.kind === "validator") this.validators.push(id);
        else if (node.kind === "client") this.clients.push(id);
        id++;
      }
    }

    this.buildEdges();
    this.ensureConnected();
    this.rebuildAdjacency();

    // Newly generated graphs start fully visible.
    for (const e of this.edges) {
      e.life = 1;
      e.state = EdgeState.Alive;
    }
  }

  private assignKinds(count: number): NodeKind[] {
    const g = CONFIG.graph;
    const nValidators = Math.max(3, Math.round(count * g.validatorRatio));
    const nRelays = Math.round(count * g.relayRatio);
    const kinds: NodeKind[] = new Array<NodeKind>(count).fill("client");
    // Spread validators/relays evenly through placement order so they're
    // distributed across the screen rather than clustered in one corner.
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
    const g = CONFIG.graph;
    return kind === "validator"
      ? g.edgesPerValidator
      : kind === "relay"
        ? g.edgesPerRelay
        : g.edgesPerClient;
  }

  /** k-nearest-neighbour edges, deduplicated. */
  private buildEdges(): void {
    const n = this.nodes.length;
    const seen = new Set<number>();
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const k = this.edgeCountFor(node.kind);
      this.kNearest(i, k);
      for (let m = 0; m < this.nnIdx.length; m++) {
        const j = this.nnIdx[m];
        const key = i < j ? i * n + j : j * n + i;
        if (seen.has(key)) continue;
        seen.add(key);
        this.edges.push(new UEdge(i, j, Math.sqrt(this.nnDist[m])));
      }
    }
  }

  /** Writes the k nearest neighbour ids of `i` into the shared scratch arrays. */
  private kNearest(i: number, k: number, exclude = -1): void {
    this.nnDist.length = 0;
    this.nnIdx.length = 0;
    const a = this.nodes[i];
    for (let j = 0; j < this.nodes.length; j++) {
      if (j === i || j === exclude) continue;
      const b = this.nodes[j];
      const d = dist2(a.homeX, a.homeY, b.homeX, b.homeY);
      // insertion into a tiny sorted list (k ≤ 6) — cheaper than sorting all
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

  /** Union-find pass: stitch disconnected components with their nearest bridge. */
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

    // Repeatedly connect the closest pair of nodes in different components.
    let guard = n;
    while (guard-- > 0) {
      let bestA = -1;
      let bestB = -1;
      let bestD = Infinity;
      let distinct = false;
      const root0 = find(0);
      for (let i = 0; i < n; i++) {
        if (find(i) !== root0) {
          distinct = true;
          for (let j = 0; j < n; j++) {
            if (find(j) !== root0) continue;
            const d = dist2(
              this.nodes[i].homeX, this.nodes[i].homeY,
              this.nodes[j].homeX, this.nodes[j].homeY,
            );
            if (d < bestD) {
              bestD = d;
              bestA = i;
              bestB = j;
            }
          }
        }
      }
      if (!distinct) break;
      this.edges.push(new UEdge(bestA, bestB, Math.sqrt(bestD)));
      union(bestA, bestB);
    }
  }

  private rebuildAdjacency(): void {
    for (const node of this.nodes) node.neighbors.length = 0;
    for (const e of this.edges) {
      if (e.state === EdgeState.Dying) continue;
      this.nodes[e.a].neighbors.push(e.b);
      this.nodes[e.b].neighbors.push(e.a);
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(frame: FrameContext): void {
    const g = CONFIG.graph;

    // Resolve node positions: home + flow drift + mouse gravity.
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const f = this.flow.sample(node.homeX, node.homeY, frame.time);
      let x = node.homeX + f.x * g.driftAmplitude;
      let y = node.homeY + f.y * g.driftAmplitude;
      const m = this.mouse.offsetFor(x, y);
      node.x = x + m.x;
      node.y = y + m.y;
    }

    // Edge fade in/out.
    const fadeStep = frame.dt / g.edgeFadeDuration;
    let adjacencyDirty = false;
    for (const e of this.edges) {
      if (e.state === EdgeState.Growing) {
        e.life += fadeStep;
        if (e.life >= 1) {
          e.life = 1;
          e.state = EdgeState.Alive;
        }
      } else if (e.state === EdgeState.Dying) {
        e.life -= fadeStep;
        if (e.life <= 0) {
          this.retarget(e);
          adjacencyDirty = true;
        }
      }
    }
    if (adjacencyDirty) this.rebuildAdjacency();

    // Occasionally start a rewire.
    this.rewireTimer += frame.dt;
    if (this.rewireTimer >= g.rewireInterval) {
      this.rewireTimer = 0;
      this.beginRewire();
    }
  }

  /** Pick a random client-owned edge and start fading it out. */
  private beginRewire(): void {
    for (let attempt = 0; attempt < 6; attempt++) {
      const e = this.edges[Math.floor(this.rand() * this.edges.length)];
      const aKind = this.nodes[e.a].kind;
      const bKind = this.nodes[e.b].kind;
      if (e.state !== EdgeState.Alive) continue;
      if (aKind !== "client" && bKind !== "client") continue;
      // Never orphan a node — both endpoints must keep ≥2 links.
      if (this.nodes[e.a].neighbors.length < 3) continue;
      if (this.nodes[e.b].neighbors.length < 3) continue;
      e.state = EdgeState.Dying;
      return;
    }
  }

  /** A dead edge grows back toward a different nearby node (object reuse). */
  private retarget(e: UEdge): void {
    const keep = this.nodes[e.a].kind === "client" ? e.a : e.b;
    const old = keep === e.a ? e.b : e.a;
    this.kNearest(keep, 4, old);
    if (this.nnIdx.length === 0) {
      e.reset(e.a, e.b, e.weight); // regrow in place as a fallback
      return;
    }
    const pick = this.nnIdx[Math.floor(this.rand() * this.nnIdx.length)];
    e.reset(keep, pick, Math.sqrt(dist2(
      this.nodes[keep].homeX, this.nodes[keep].homeY,
      this.nodes[pick].homeX, this.nodes[pick].homeY,
    )));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  /** Alpha is quantized into this many buckets; all geometry sharing a bucket
   *  is drawn with a single beginPath/stroke — the dominant render cost is
   *  draw-call count, not vertex count. */
  private static readonly ALPHA_BUCKETS = 24;
  private edgeBuckets = new Int16Array(0);
  private nodeBuckets = new Int16Array(0);
  private nodeRadii = new Float32Array(0);

  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void {
    const g = CONFIG.graph;
    const baseEdge = frame.isDark ? g.edgeAlphaDark : g.edgeAlphaLight;
    const baseNode = frame.isDark ? g.nodeAlphaDark : g.nodeAlphaLight;
    const ac = frame.accent;
    const B = Graph.ALPHA_BUCKETS;
    const TAU = Math.PI * 2;

    if (this.edgeBuckets.length < this.edges.length) {
      this.edgeBuckets = new Int16Array(this.edges.length);
    }
    if (this.nodeBuckets.length < this.nodes.length) {
      this.nodeBuckets = new Int16Array(this.nodes.length);
      this.nodeRadii = new Float32Array(this.nodes.length);
    }

    // Pass 1: classify every edge / node into an alpha bucket.
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      if (e.life <= 0.01) {
        this.edgeBuckets[i] = -1;
        continue;
      }
      const na = this.nodes[e.a];
      const nb = this.nodes[e.b];
      const rip = Math.min(na.rippleGlow(frame.time), nb.rippleGlow(frame.time));
      const lit = e.litUntil > frame.time ? 0.25 : 0;
      const alpha = (baseEdge + rip * CONFIG.ripple.intensity * 0.5 + lit) * e.life;
      this.edgeBuckets[i] = Math.min(B - 1, Math.max(0, Math.round(alpha * (B - 1))));
    }
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      let r = node.radius;
      if (node.kind === "validator") {
        r *= 1 + Math.sin(frame.time * (TAU / g.breathePeriod) + node.phase) * g.breatheAmount;
      }
      const rip = node.rippleGlow(frame.time);
      this.nodeRadii[i] = r + rip * 1.5;
      const alpha = Math.min(1, baseNode + rip * CONFIG.ripple.intensity);
      this.nodeBuckets[i] = Math.min(B - 1, Math.max(0, Math.round(alpha * (B - 1))));
    }

    // Pass 2: one stroke per non-empty edge bucket.
    ctx.lineWidth = 0.8;
    for (let q = 1; q < B; q++) {
      let any = false;
      for (let i = 0; i < this.edges.length; i++) {
        if (this.edgeBuckets[i] !== q) continue;
        if (!any) {
          ctx.beginPath();
          any = true;
        }
        const e = this.edges[i];
        const na = this.nodes[e.a];
        const nb = this.nodes[e.b];
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
      }
      if (any) {
        ctx.strokeStyle = this.styleFor(ac.r, ac.g, ac.b, q / (B - 1));
        ctx.stroke();
      }
    }

    // Pass 3: one fill per non-empty node bucket.
    for (let q = 1; q < B; q++) {
      let any = false;
      for (let i = 0; i < this.nodes.length; i++) {
        if (this.nodeBuckets[i] !== q) continue;
        if (!any) {
          ctx.beginPath();
          any = true;
        }
        const node = this.nodes[i];
        const r = this.nodeRadii[i];
        ctx.moveTo(node.x + r, node.y);
        ctx.arc(node.x, node.y, r, 0, TAU);
      }
      if (any) {
        ctx.fillStyle = this.styleFor(ac.r, ac.g, ac.b, q / (B - 1));
        ctx.fill();
      }
    }
  }

  // Quantized rgba-string cache — avoids building thousands of strings/frame.
  private readonly styleCache = new Map<number, string>();
  private cachedR = -1;
  private cachedG = -1;
  private cachedB = -1;

  private styleFor(r: number, g: number, b: number, alpha: number): string {
    if (r !== this.cachedR || g !== this.cachedG || b !== this.cachedB) {
      this.styleCache.clear();
      this.cachedR = r;
      this.cachedG = g;
      this.cachedB = b;
    }
    const q = Math.min(40, Math.max(0, Math.round(alpha * 40)));
    let s = this.styleCache.get(q);
    if (s === undefined) {
      s = rgba({ r, g, b }, q / 40);
      this.styleCache.set(q, s);
    }
    return s;
  }
}
