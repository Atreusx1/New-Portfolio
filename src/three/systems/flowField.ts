/**
 * flowField.ts — the 2-D FlowField, one axis richer.
 *
 * The original's key insight is preserved exactly, because it is the reason the
 * old background looked calm instead of chaotic: **nodes do not integrate
 * velocity from this field.** Integration drifts, needs containment hacks, and
 * produces the "random bouncing" look. Instead the field is sampled as a
 * *displacement* — a node's position is `home + field(home, t) * amplitude`.
 *
 * Because simplex noise is continuous in space and time, motion stays smooth
 * and deterministic, and every node eventually returns near its anchor. The
 * graph breathes rather than wandering off.
 *
 * The only change from the original is a third output axis and a third noise
 * instance. `noise3` was already 3-D; the old code just fed it (x, y, time).
 * Here it gets (x, y, z) offset per axis, with time folded in as a slow drift
 * along the sample coordinates — a true 4-D field would need a noise4 the old
 * engine never had, and the difference is not visible at these speeds.
 */
import { SimplexNoise } from "./noise";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FlowFieldOptions {
  /** Spatial scale — bigger = broader, calmer currents. Old default: 340px. */
  cellSize?: number;
  /** Seconds for the field to evolve one full noise unit. */
  timeScale?: number;
  strength?: number;
}

export class FlowField3 {
  private readonly nx: SimplexNoise;
  private readonly ny: SimplexNoise;
  private readonly nz: SimplexNoise;
  private readonly invCell: number;
  private readonly timeScale: number;
  private readonly strength: number;

  /** Reused output — sample() never allocates. Read it immediately. */
  private readonly out: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(seed: number, opts: FlowFieldOptions = {}) {
    this.nx = new SimplexNoise(seed);
    this.ny = new SimplexNoise(seed + 4099);
    this.nz = new SimplexNoise(seed + 8191);
    // World units here, not CSS px: the old 340px cell over a ~1400px viewport
    // is roughly a quarter of the visible field, so we match that ratio
    // against a corridor about 24 units wide.
    this.invCell = 1 / (opts.cellSize ?? 6);
    this.timeScale = opts.timeScale ?? 0.045;
    this.strength = opts.strength ?? 1;
  }

  sample(x: number, y: number, z: number, time: number): Readonly<Vec3> {
    const sx = x * this.invCell;
    const sy = y * this.invCell;
    const sz = z * this.invCell;
    const t = time * this.timeScale;

    // Offsets keep the three axes decorrelated — sampling the same noise at the
    // same point for all three would give a purely radial field.
    this.out.x = this.nx.noise3(sx, sy, sz + t) * this.strength;
    this.out.y = this.ny.noise3(sx + 31.7, sy - 17.3, sz + t) * this.strength;
    this.out.z = this.nz.noise3(sx - 11.9, sy + 43.1, sz + t) * this.strength;
    return this.out;
  }
}
