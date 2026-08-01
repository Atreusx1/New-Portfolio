/**
 * useQuality.ts — decides what this device gets before any GPU work starts.
 *
 * Three independent axes, deliberately not collapsed into one "isLowEnd":
 *  · reducedMotion — a stated user preference. Non-negotiable, wins over
 *    everything, and is live (people toggle it mid-session).
 *  · webgl — a capability. No WebGL means the static fallback, not a blank div.
 *  · tier — a performance guess. Only this one is allowed to be wrong.
 */
import { useEffect, useState } from "react";

export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return reduced;
};

export const hasWebGL = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ??
      c.getContext("webgl") ??
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
};

export type QualityTier = "high" | "medium" | "low";

/**
 * Cheap, synchronous tiering. Intentionally not detect-gpu: pulling a 1MB
 * benchmark database to decide a particle count is a worse trade than being
 * occasionally conservative, and PerformanceMonitor corrects us at runtime.
 */
export const detectTier = (): QualityTier => {
  if (typeof window === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 720;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;

  if (coarse && (narrow || cores <= 4 || mem <= 3)) return "low";
  if (cores <= 4 || mem <= 4) return "medium";
  return "high";
};

/**
 * Particle budget per tier — the single place counts are decided.
 *
 * This is the hero globe's budget (the starfield takes a fraction of it on
 * top). Raising it is the cheapest density win in the whole scene: the globe's
 * only per-frame CPU work is a handful of uniform writes, because dispersal,
 * twinkle, rim and tighten all happen in the vertex shader. What it does cost
 * is fill rate — every point is a translucent quad, and under additive blending
 * they overdraw each other — so these numbers are bounded by the weakest GPU in
 * each tier rather than by frame-time arithmetic.
 */
export const PARTICLE_BUDGET: Record<QualityTier, number> = {
  high: 11500,
  medium: 7000,
  low: 3000,
};

export const MAX_DPR: Record<QualityTier, number> = {
  high: 2,
  medium: 1.5,
  low: 1.25,
};

/** Ascending, so a tier can be stepped rather than looked up by name. */
export const TIER_ORDER = ["low", "medium", "high"] as const;

/**
 * Move `tier` by `delta` steps, clamped. This is what PerformanceMonitor pulls
 * on when a device turns out to be slower than `detectTier` guessed: dropping a
 * whole tier re-derives every budget below at once, which is a real reduction
 * in work rather than a dpr nudge that leaves the same geometry on the GPU.
 */
export const stepTier = (tier: QualityTier, delta: number): QualityTier => {
  const i = TIER_ORDER.indexOf(tier);
  const next = Math.min(TIER_ORDER.length - 1, Math.max(0, i + delta));
  return TIER_ORDER[next];
};

/**
 * Per-motif budgets. Separate from PARTICLE_BUDGET because the hero globe is
 * always present while motifs are mutually exclusive in practice — at most two
 * are ever awake, so their budgets overlap rather than add.
 *
 * Measured on this machine (node, 3000-frame average, JIT warmed):
 *
 *   NetworkGraph  220 nodes / 382 edges → 0.067 ms/frame
 *   NetworkGraph  140 nodes / 237 edges → 0.041 ms/frame
 *   FlowDrift    1400 points            → 0.373 ms/frame
 *   FlowDrift     850 points            → 0.231 ms/frame
 *
 * FlowDrift is the expensive one, not the graph — it samples three octaves of
 * simplex per point with no early exit, while the graph only samples per *node*
 * and its edges are pure arithmetic. Budget accordingly: the intuition that the
 * network is the heavy motif is wrong. Assume 3–5x these numbers on a
 * mid-range phone, which is what the `low` tier is sized against.
 *
 * ── Stage 4, re-measured ──
 * Same harness, different machine, so the old baseline was re-run alongside to
 * make the two sets comparable: FlowDrift at 1,400 points measures 0.295 ms
 * here against the 0.373 ms recorded above, i.e. this box is about 1.25x
 * faster. Scale accordingly before trusting either column.
 *
 *   FlowDrift    2300 points, settling             → 0.464 ms/frame
 *   FlowDrift    2300 points, settling + hex rhyme → 0.546 ms/frame
 *   FlowDrift    1350 points, settling + hex rhyme → 0.309 ms/frame
 *   FlowDrift     620 points, settling + hex rhyme → 0.120 ms/frame
 *   NetworkGraph  320 nodes / 556 edges            → 0.064 ms/frame
 *   NetworkGraph  320 nodes, stratifying           → 0.070 ms/frame
 *   NetworkGraph  200 nodes / 339 edges            → 0.039 ms/frame
 *
 * Two things worth reading off that table. The per-particle settle work is
 * nearly free — 2,300 points now cost what ~2,200 would have cost without it —
 * so the density raise, not the new behaviour, is where the time went. And the
 * hex rhyme only bills inside its seam, which is why it is gated on a threshold
 * rather than multiplied by a bias that is usually zero.
 *
 * FlowDrift is still the only motif worth watching, and it is still the reason
 * these numbers are not simply doubled again. Everything else here is either
 * GPU-side (Convergence disperses in the vertex shader and has no per-frame
 * loop at all, which is why its budget can be the largest number on the page)
 * or trivially small (HexBelt rebuilds a few hundred vertices). The stage 3
 * warning holds unchanged: assume 3–5x on a mid-range phone, which is what the
 * `low` tier is sized against, and what PerformanceMonitor's ladder in
 * UniverseCanvas exists to catch when the guess is wrong anyway.
 */
export const MOTIF_BUDGET: Record<
  QualityTier,
  { flowDrift: number; hexes: number; graphNodes: number; convergence: number }
> = {
  high: { flowDrift: 2300, hexes: 11, graphNodes: 320, convergence: 4200 },
  medium: { flowDrift: 1350, hexes: 8, graphNodes: 200, convergence: 2600 },
  low: { flowDrift: 620, hexes: 6, graphNodes: 110, convergence: 1200 },
};
