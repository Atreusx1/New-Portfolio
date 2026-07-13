/**
 * Node.ts
 *
 * A single network participant. Plain data + tiny behavior:
 * position resolution (home + flow drift + mouse offset) lives here
 * so Graph / PacketManager / Ripple all read one authoritative `x, y`.
 */

import { CONFIG } from "./Config";
import type { NodeKind } from "./Types";

export class UNode {
  readonly id: number;
  readonly kind: NodeKind;
  readonly radius: number;
  /** Per-node phase so validators don't breathe in unison. */
  readonly phase: number;

  /** Anchor the node always returns toward. */
  homeX: number;
  homeY: number;

  /** Resolved render position (home + drift + mouse), updated each frame. */
  x: number;
  y: number;

  /** Adjacent node ids — rebuilt by Graph when edges change. */
  readonly neighbors: number[] = [];

  /** Absolute engine-time at which this node's ripple glow peaks. <0 = none. */
  rippleAt = -1;

  constructor(id: number, kind: NodeKind, x: number, y: number, phase: number) {
    this.id = id;
    this.kind = kind;
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    this.phase = phase;
    this.radius =
      kind === "validator"
        ? CONFIG.graph.validatorRadius
        : kind === "relay"
          ? CONFIG.graph.relayRadius
          : CONFIG.graph.clientRadius;
  }

  /** Ripple glow contribution at `time`, 0..1 with exponential decay. */
  rippleGlow(time: number): number {
    if (this.rippleAt < 0) return 0;
    const dt = time - this.rippleAt;
    if (dt < 0) return 0; // wavefront hasn't reached us yet
    const g = Math.exp(-dt / CONFIG.ripple.glowDecay);
    return g < 0.01 ? 0 : g;
  }
}
