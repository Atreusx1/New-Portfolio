/**
 * fibonacciSphere.ts — even point coverage on a sphere, no random jitter.
 *
 * Random spherical sampling clumps at the poles and leaves visible voids;
 * the golden-angle spiral gives near-uniform spacing at any count, which is
 * what makes the globe read as a *surface* instead of noise.
 *
 * Pure math, no three.js types beyond the Float32Arrays it fills, so this is
 * testable in isolation and reusable by any future shell (starfield, hex belt).
 */

/** Deterministic PRNG — same globe every reload, so visual diffs are real diffs. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface ShellOptions {
  count: number;
  radius: number;
  /** Fraction of `radius` each point may drift in/out, giving the shell thickness. */
  thickness?: number;
  /** Min/max point size multiplier. A little variance reads as depth. */
  scaleRange?: [number, number];
  seed?: number;
}

export interface ShellBuffers {
  positions: Float32Array;
  /** Per-point size multiplier. */
  scales: Float32Array;
  /** Per-point twinkle phase offset, 0..1. */
  phases: Float32Array;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const fibonacciSphere = ({
  count,
  radius,
  thickness = 0.06,
  scaleRange = [0.55, 1.5],
  seed = 1337,
}: ShellOptions): ShellBuffers => {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const rand = mulberry32(seed);
  const [sMin, sMax] = scaleRange;

  for (let i = 0; i < count; i++) {
    // y sweeps -1..1 linearly; equal-area bands are what keeps spacing even.
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;

    // Radial jitter only — angular jitter would undo the even coverage.
    const r = radius * (1 + (rand() * 2 - 1) * thickness);

    positions[i * 3] = Math.cos(theta) * ring * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = Math.sin(theta) * ring * r;

    // Bias small: a few bright points against many faint ones beats uniform mid.
    const t = rand() ** 2.2;
    scales[i] = sMin + t * (sMax - sMin);
    phases[i] = rand();
  }

  return { positions, scales, phases };
};
