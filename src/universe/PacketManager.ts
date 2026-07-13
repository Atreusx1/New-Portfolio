/**
 * PacketManager.ts
 *
 * Spawns, routes, moves and draws transaction packets.
 *
 * Routing: breadth-first search from a random client to the nearest
 * validator (in hops), walking the live adjacency lists. BFS scratch
 * arrays are preallocated and reused — no per-spawn allocation beyond
 * the packet's own (reused) path array.
 *
 * Arrival at a validator triggers a consensus ripple via the callback
 * the Renderer wires in.
 */

import { CONFIG } from "./Config";
import { Graph } from "./Graph";
import { Packet } from "./Packet";
import { createRandom, lerp, randRange, rgba } from "./Utils";
import type { FrameContext, Subsystem } from "./Types";

export class PacketManager implements Subsystem {
  private readonly graph: Graph;
  private readonly rand: () => number;
  private readonly pool: Packet[] = [];
  private readonly onConsensus: (validatorId: number) => void;

  private spawnTimer = 0;
  private nextSpawnIn = 0;

  // BFS scratch (sized on resize) — reused every route computation.
  private visited: Int32Array = new Int32Array(0);
  private cameFrom: Int32Array = new Int32Array(0);
  private queue: Int32Array = new Int32Array(0);
  private visitStamp = 0;
  private readonly routeScratch: number[] = [];

  constructor(
    seed: number,
    graph: Graph,
    onConsensus: (validatorId: number) => void,
  ) {
    this.graph = graph;
    this.onConsensus = onConsensus;
    this.rand = createRandom(seed);
    for (let i = 0; i < CONFIG.packets.poolSize; i++) this.pool.push(new Packet());
    this.scheduleNext();
  }

  resize(): void {
    const n = this.graph.nodes.length;
    this.visited = new Int32Array(n);
    this.cameFrom = new Int32Array(n);
    this.queue = new Int32Array(n);
    this.visitStamp = 0;
    for (const p of this.pool) p.kill();
  }

  private scheduleNext(): void {
    this.nextSpawnIn = randRange(this.rand, CONFIG.packets.spawnMin, CONFIG.packets.spawnMax);
    this.spawnTimer = 0;
  }

  // ── Routing ────────────────────────────────────────────────────────────────

  /** BFS client → nearest validator. Writes into routeScratch; returns success. */
  private route(from: number): boolean {
    const nodes = this.graph.nodes;
    if (this.visited.length !== nodes.length) this.resize();

    this.visitStamp++;
    const stamp = this.visitStamp;
    let head = 0;
    let tail = 0;
    this.queue[tail++] = from;
    this.visited[from] = stamp;
    this.cameFrom[from] = -1;

    let found = -1;
    let depth = 0;
    let layerEnd = tail;

    while (head < tail && depth <= CONFIG.packets.maxRouteHops) {
      const cur = this.queue[head++];
      const kind = nodes[cur].kind;
      if (kind === "validator" && cur !== from) {
        found = cur;
        break;
      }
      for (const nb of nodes[cur].neighbors) {
        if (this.visited[nb] === stamp) continue;
        this.visited[nb] = stamp;
        this.cameFrom[nb] = cur;
        if (tail < this.queue.length) this.queue[tail++] = nb;
      }
      if (head === layerEnd) {
        depth++;
        layerEnd = tail;
      }
    }

    if (found < 0) return false;

    // Walk back, then reverse in place.
    this.routeScratch.length = 0;
    let cur = found;
    while (cur !== -1) {
      this.routeScratch.push(cur);
      cur = this.cameFrom[cur];
    }
    this.routeScratch.reverse();
    return this.routeScratch.length >= 2;
  }

  private trySpawn(): void {
    const clients = this.graph.clients;
    if (clients.length === 0) return;

    let active = 0;
    let free: Packet | null = null;
    for (const p of this.pool) {
      if (p.alive) active++;
      else if (free === null) free = p;
    }
    if (active >= CONFIG.packets.maxActive || free === null) return;

    const from = clients[Math.floor(this.rand() * clients.length)];
    if (!this.route(from)) return;

    const start = this.graph.nodes[this.routeScratch[0]];
    free.spawn(
      this.routeScratch,
      randRange(this.rand, CONFIG.packets.speedMin, CONFIG.packets.speedMax),
      randRange(this.rand, CONFIG.packets.sizeMin, CONFIG.packets.sizeMax),
      start.x,
      start.y,
    );
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(frame: FrameContext): void {
    this.spawnTimer += frame.dt;
    if (this.spawnTimer >= this.nextSpawnIn) {
      this.trySpawn();
      this.scheduleNext();
    }

    const nodes = this.graph.nodes;
    for (const p of this.pool) {
      if (!p.alive) continue;

      const a = nodes[p.path[p.seg]];
      const b = nodes[p.path[p.seg + 1]];
      const segLen = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      p.t += (p.speed * frame.dt) / segLen;

      if (p.t >= 1) {
        p.seg++;
        p.t = 0;
        if (p.seg >= p.path.length - 1) {
          // Arrived at the validator → consensus.
          this.onConsensus(p.path[p.path.length - 1]);
          p.kill();
          continue;
        }
      }

      const na = nodes[p.path[p.seg]];
      const nb = nodes[p.path[p.seg + 1]];
      p.x = lerp(na.x, nb.x, p.t);
      p.y = lerp(na.y, nb.y, p.t);
      p.pushTrail();

      // Light up the edge under the packet briefly.
      for (const e of this.graph.edges) {
        if (
          (e.a === p.path[p.seg] && e.b === p.path[p.seg + 1]) ||
          (e.b === p.path[p.seg] && e.a === p.path[p.seg + 1])
        ) {
          e.litUntil = frame.time + 0.15;
          break;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void {
    const TAU = Math.PI * 2;
    const ac = frame.accent;
    const trailLen = CONFIG.packets.trailLength;

    for (const p of this.pool) {
      if (!p.alive) continue;

      // Trail — fading dots from the ring buffer (cheaper than stroked path,
      // and it reads as light being left behind rather than a solid tail).
      for (let i = 0; i < p.trailCount; i++) {
        const idx = (p.trailHead - 1 - i + trailLen * 2) % trailLen;
        const tx = p.trail[idx * 2];
        const ty = p.trail[idx * 2 + 1];
        const fade = 1 - i / trailLen;
        ctx.fillStyle = rgba(ac, CONFIG.packets.trailAlpha * fade * fade);
        ctx.beginPath();
        ctx.arc(tx, ty, p.size * fade * 0.8, 0, TAU);
        ctx.fill();
      }

      // Head.
      ctx.fillStyle = rgba(ac, 0.95);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
  }

  /** Live packets — the Bloom pass reads this to draw glows. */
  get packets(): readonly Packet[] {
    return this.pool;
  }
}
