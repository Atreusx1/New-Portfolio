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

/** Particle budget per tier — the single place counts are decided. */
export const PARTICLE_BUDGET: Record<QualityTier, number> = {
  high: 7200,
  medium: 4200,
  low: 2000,
};

export const MAX_DPR: Record<QualityTier, number> = {
  high: 2,
  medium: 1.5,
  low: 1.25,
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
 */
export const MOTIF_BUDGET: Record<
  QualityTier,
  { flowDrift: number; hexes: number; graphNodes: number; convergence: number }
> = {
  high: { flowDrift: 1400, hexes: 7, graphNodes: 220, convergence: 2600 },
  medium: { flowDrift: 850, hexes: 5, graphNodes: 140, convergence: 1600 },
  low: { flowDrift: 420, hexes: 4, graphNodes: 80, convergence: 800 },
};
