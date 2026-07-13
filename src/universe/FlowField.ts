/**
 * FlowField.ts
 *
 * A time-evolving simplex-noise vector field.
 *
 * Nodes don't integrate velocity from this field (integration drifts and
 * needs containment hacks — the source of the "random bouncing" look).
 * Instead the field is sampled as a *displacement*: a node's rendered
 * position = home anchor + field(home, time) * amplitude.
 *
 * Because simplex noise is continuous in space and time, motion is
 * perfectly smooth, deterministic, and every node eventually returns
 * near its anchor — the graph breathes instead of wandering.
 */

import { CONFIG } from "./Config";
import { SimplexNoise } from "./Utils";
import type { Vec2 } from "./Types";

export class FlowField {
  private readonly noiseX: SimplexNoise;
  private readonly noiseY: SimplexNoise;
  private readonly invCell: number;
  private readonly timeScale: number;
  private readonly strength: number;

  /** Reused output vector — sample() never allocates. */
  private readonly out: Vec2 = { x: 0, y: 0 };

  constructor(seed: number) {
    this.noiseX = new SimplexNoise(seed);
    this.noiseY = new SimplexNoise(seed + 4099);
    this.invCell = 1 / CONFIG.flowField.cellSize;
    this.timeScale = CONFIG.flowField.timeScale;
    this.strength = CONFIG.flowField.strength;
  }

  /**
   * Sample the field displacement at (x, y) and time t.
   * Returns a shared vector — read it immediately, never store it.
   */
  sample(x: number, y: number, time: number): Readonly<Vec2> {
    const nx = x * this.invCell;
    const ny = y * this.invCell;
    const nt = time * this.timeScale;
    this.out.x = this.noiseX.noise3(nx, ny, nt) * this.strength;
    this.out.y = this.noiseY.noise3(nx + 31.7, ny - 17.3, nt) * this.strength;
    return this.out;
  }
}
