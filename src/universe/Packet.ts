/**
 * Packet.ts
 *
 * One in-flight transaction. Pooled: PacketManager owns a fixed array of
 * these and toggles `alive` — nothing is allocated after construction.
 * The glowing trail is a fixed-size ring buffer of past positions.
 */

import { CONFIG } from "./Config";

export class Packet {
  alive = false;

  /** Route as node ids (client → … → validator). */
  readonly path: number[] = [];
  /** Index of the segment currently being traversed. */
  seg = 0;
  /** 0..1 progress along the current segment. */
  t = 0;

  speed = 0; // px / s
  size = 0;

  /** Current interpolated position. */
  x = 0;
  y = 0;

  /** Trail ring buffer (x, y interleaved). */
  readonly trail: Float32Array;
  trailHead = 0;
  trailCount = 0;

  constructor() {
    this.trail = new Float32Array(CONFIG.packets.trailLength * 2);
  }

  spawn(path: readonly number[], speed: number, size: number, x: number, y: number): void {
    this.path.length = 0;
    for (const id of path) this.path.push(id);
    this.seg = 0;
    this.t = 0;
    this.speed = speed;
    this.size = size;
    this.x = x;
    this.y = y;
    this.trailHead = 0;
    this.trailCount = 0;
    this.alive = true;
  }

  pushTrail(): void {
    this.trail[this.trailHead * 2] = this.x;
    this.trail[this.trailHead * 2 + 1] = this.y;
    this.trailHead = (this.trailHead + 1) % CONFIG.packets.trailLength;
    if (this.trailCount < CONFIG.packets.trailLength) this.trailCount++;
  }

  kill(): void {
    this.alive = false;
  }
}
