/**
 * packets.ts: in-flight transactions, ported from `universe/PacketManager.ts`.
 *
 * The routing is unchanged: BFS from a random client to the nearest validator,
 * capped at `maxRouteHops`, walking `cameFrom` back and reversing in place.
 * Packets are pooled and `alive`-toggled: nothing allocates after construction,
 * which is the property that let the original run 10 concurrent packets on a
 * phone without GC sawtooth.
 *
 * Two changes for 3-D:
 *  · positions and segment lengths are 3-D
 *  · the trail ring buffer stores 3 components per sample instead of 2
 *
 * The edge-lighting scan at the end of `update` was O(edges) per packet per
 * frame in the original: with ~500 edges and 10 packets that is 5,000
 * comparisons a frame for a cosmetic effect. Replaced with a precomputed
 * edge-index map; behaviour identical, cost constant.
 */
import { createRandom, randRange } from "./noise";
import type { NetworkTopology } from "./graph";

/**
 * Stage 4 raised the traffic: more concurrent packets, spawning sooner, with
 * longer trails. The cost is entirely in the shared packet buffer, which is
 * `poolSize * (1 + trailLength)` points, 630 here, against 360 before, and
 * every one of them is a point the vertex shader may skip via aScale 0. Routing
 * cost is unchanged, because it is per *spawn* rather than per frame, and the
 * pool still allocates nothing after construction.
 */
export const PACKET_CONFIG = {
  poolSize: 30,
  maxActive: 13,
  /** Spawn cadence range (seconds). */
  spawnMin: 0.34,
  spawnMax: 0.85,
  /** Travel speed range, world units/second (was 110–190 px/s). */
  speedMin: 3.4,
  speedMax: 5.8,
  sizeMin: 1.6,
  sizeMax: 2.6,
  trailLength: 20,
  maxRouteHops: 8,
  trailAlpha: 0.42,
  /** Seconds an edge stays lit after a packet crosses it. */
  edgeLitDuration: 0.18,
} as const;

export class Packet {
  alive = false;
  readonly path: number[] = [];
  seg = 0;
  t = 0;
  speed = 0;
  size = 0;
  x = 0;
  y = 0;
  z = 0;

  /** Trail ring buffer, (x, y, z) interleaved. */
  readonly trail = new Float32Array(PACKET_CONFIG.trailLength * 3);
  trailHead = 0;
  trailCount = 0;

  spawn(
    path: readonly number[],
    speed: number,
    size: number,
    x: number,
    y: number,
    z: number,
  ): void {
    this.path.length = 0;
    for (const id of path) this.path.push(id);
    this.seg = 0;
    this.t = 0;
    this.speed = speed;
    this.size = size;
    this.x = x;
    this.y = y;
    this.z = z;
    this.trailHead = 0;
    this.trailCount = 0;
    this.alive = true;
  }

  pushTrail(): void {
    const i = this.trailHead * 3;
    this.trail[i] = this.x;
    this.trail[i + 1] = this.y;
    this.trail[i + 2] = this.z;
    this.trailHead = (this.trailHead + 1) % PACKET_CONFIG.trailLength;
    if (this.trailCount < PACKET_CONFIG.trailLength) this.trailCount++;
  }

  kill(): void {
    this.alive = false;
  }
}

export class PacketRouter {
  readonly pool: Packet[] = [];

  private readonly graph: NetworkTopology;
  private readonly rand: () => number;
  private readonly onConsensus: (validatorId: number, time: number) => void;

  /** BFS scratch: reused, never reallocated per route. */
  private readonly visited: Int32Array;
  private readonly cameFrom: Int32Array;
  private readonly queue: Int32Array;
  private visitStamp = 0;
  private readonly routeScratch: number[] = [];

  /** "a,b" → edge index. Replaces the old O(edges) linear scan. */
  private readonly edgeIndex = new Map<number, number>();

  private spawnTimer = 0;
  private nextSpawnIn = 0;

  constructor(
    graph: NetworkTopology,
    seed: number,
    onConsensus: (validatorId: number, time: number) => void,
  ) {
    this.graph = graph;
    this.rand = createRandom(seed);
    this.onConsensus = onConsensus;

    const n = graph.nodes.length;
    this.visited = new Int32Array(n);
    this.cameFrom = new Int32Array(n);
    this.queue = new Int32Array(n);

    for (let i = 0; i < PACKET_CONFIG.poolSize; i++) this.pool.push(new Packet());

    graph.edges.forEach((e, i) => {
      this.edgeIndex.set(this.key(e.a, e.b), i);
    });

    this.scheduleNext();
  }

  private key(a: number, b: number): number {
    const n = this.graph.nodes.length;
    return a < b ? a * n + b : b * n + a;
  }

  private scheduleNext(): void {
    this.nextSpawnIn = randRange(
      this.rand,
      PACKET_CONFIG.spawnMin,
      PACKET_CONFIG.spawnMax,
    );
    this.spawnTimer = 0;
  }

  /** BFS client → nearest validator. Writes routeScratch; returns success. */
  private route(from: number): boolean {
    const nodes = this.graph.nodes;
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

    while (head < tail && depth <= PACKET_CONFIG.maxRouteHops) {
      const cur = this.queue[head++];
      if (nodes[cur].kind === "validator" && cur !== from) {
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
    if (active >= PACKET_CONFIG.maxActive || free === null) return;

    const from = clients[Math.floor(this.rand() * clients.length)];
    if (!this.route(from)) return;

    const start = this.graph.nodes[this.routeScratch[0]];
    free.spawn(
      this.routeScratch,
      randRange(this.rand, PACKET_CONFIG.speedMin, PACKET_CONFIG.speedMax),
      randRange(this.rand, PACKET_CONFIG.sizeMin, PACKET_CONFIG.sizeMax),
      start.x,
      start.y,
      start.z,
    );
  }

  /**
   * @param intensity 0..1 presence of the motif. At 0 the router idles
   *        completely, no spawns, no integration, so an off-screen section
   *        costs nothing. This is the main reason the flight can carry five
   *        motifs at once.
   */
  update(dt: number, time: number, intensity: number): void {
    if (intensity <= 0.01) return;

    this.spawnTimer += dt * intensity;
    if (this.spawnTimer >= this.nextSpawnIn) {
      this.trySpawn();
      this.scheduleNext();
    }

    const nodes = this.graph.nodes;
    for (const p of this.pool) {
      if (!p.alive) continue;

      const a = nodes[p.path[p.seg]];
      const b = nodes[p.path[p.seg + 1]];
      const segLen = Math.max(
        0.001,
        Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z),
      );
      p.t += (p.speed * dt) / segLen;

      if (p.t >= 1) {
        p.seg++;
        p.t = 0;
        if (p.seg >= p.path.length - 1) {
          // Arrived at the validator → consensus.
          this.onConsensus(p.path[p.path.length - 1], time);
          p.kill();
          continue;
        }
      }

      const na = nodes[p.path[p.seg]];
      const nb = nodes[p.path[p.seg + 1]];
      p.x = na.x + (nb.x - na.x) * p.t;
      p.y = na.y + (nb.y - na.y) * p.t;
      p.z = na.z + (nb.z - na.z) * p.t;
      p.pushTrail();

      // Light the edge under the packet. O(1) via the precomputed index.
      const ei = this.edgeIndex.get(this.key(p.path[p.seg], p.path[p.seg + 1]));
      if (ei !== undefined) {
        this.graph.edges[ei].litUntil = time + PACKET_CONFIG.edgeLitDuration;
      }
    }
  }
}
