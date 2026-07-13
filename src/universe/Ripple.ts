/**
 * Ripple.ts
 *
 * Consensus propagation.
 *
 * When a packet reaches a validator, this system BFS-walks the live
 * topology outward from that validator and *schedules* a glow time on
 * every node it reaches: `node.rippleAt = now + hops * hopDelay`.
 *
 * Nodes and edges then read their own glow from those timestamps
 * (see UNode.rippleGlow), so the wave visibly travels along the actual
 * graph structure — hop by hop — never as a circular shockwave.
 *
 * There is deliberately no per-frame state here: scheduling is O(reached
 * nodes) once per consensus event, and rendering is folded into Graph.
 */

import { CONFIG } from "./Config";
import { Graph } from "./Graph";

export class Ripple {
  private readonly graph: Graph;

  // Reused BFS scratch.
  private visited: Int32Array = new Int32Array(0);
  private queue: Int32Array = new Int32Array(0);
  private stamp = 0;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  resize(): void {
    const n = this.graph.nodes.length;
    this.visited = new Int32Array(n);
    this.queue = new Int32Array(n);
    this.stamp = 0;
  }

  /** Trigger a consensus wave from `validatorId` at engine-time `now`. */
  trigger(validatorId: number, now: number): void {
    const nodes = this.graph.nodes;
    if (this.visited.length !== nodes.length) this.resize();

    this.stamp++;
    const stamp = this.stamp;
    let head = 0;
    let tail = 0;
    this.queue[tail++] = validatorId;
    this.visited[validatorId] = stamp;
    nodes[validatorId].rippleAt = now;

    let depth = 0;
    let layerEnd = tail;

    while (head < tail && depth < CONFIG.ripple.maxHops) {
      const cur = this.queue[head++];
      const arriveAt = now + (depth + 1) * CONFIG.ripple.hopDelay;
      for (const nb of nodes[cur].neighbors) {
        if (this.visited[nb] === stamp) continue;
        this.visited[nb] = stamp;
        // Keep the *earlier* wavefront if two ripples overlap.
        const existing = nodes[nb].rippleAt;
        if (existing < now || arriveAt < existing) nodes[nb].rippleAt = arriveAt;
        if (tail < this.queue.length) this.queue[tail++] = nb;
      }
      if (head === layerEnd) {
        depth++;
        layerEnd = tail;
      }
    }
  }
}
