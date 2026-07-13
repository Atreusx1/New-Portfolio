/**
 * Edge.ts
 *
 * A stable connection between two nodes. Edges are long-lived; the
 * occasional rewire animates `life` from 0→1 (birth) or 1→0 (death)
 * over Config.graph.edgeFadeDuration so the topology never pops.
 */

export const enum EdgeState {
  Alive,
  Dying,
  Growing,
}

export class UEdge {
  a: number;
  b: number;
  /** Routing weight — geometric length at creation time. */
  weight: number;
  /** 0..1 opacity multiplier used while (re)wiring. */
  life: number;
  state: EdgeState;
  /** Absolute engine-time until which a packet keeps this edge lit. */
  litUntil = -1;

  constructor(a: number, b: number, weight: number) {
    this.a = a;
    this.b = b;
    this.weight = weight;
    this.life = 0;
    this.state = EdgeState.Growing;
  }

  /** Re-target this edge in place (object reuse — no allocation on rewire). */
  reset(a: number, b: number, weight: number): void {
    this.a = a;
    this.b = b;
    this.weight = weight;
    this.life = 0;
    this.state = EdgeState.Growing;
    this.litUntil = -1;
  }
}
