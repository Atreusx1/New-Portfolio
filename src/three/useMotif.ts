/**
 * useMotif.ts: how a section's motif knows whether it exists yet.
 *
 * `presenceAt(t, waypoint)` is a pure function of the flight coordinate: 1 when
 * the camera is at that waypoint, tapering to 0 roughly one section away in
 * either direction. Every motif reads it the same way, which is what keeps the
 * five of them behaving like one system.
 *
 * Presence does two jobs, and the second is the important one:
 *
 *  1. **Opacity.** Motifs fade rather than pop.
 *  2. **Culling.** At presence 0 a motif sets `group.visible = false` *and*
 *     skips its simulation entirely: no flow-field sampling, no packet
 *     integration, no buffer uploads. Five motifs are affordable only because
 *     at most two are ever awake.
 *
 * The taper is deliberately wider than the gap between waypoints (0.9 vs 1.0),
 * so there is always a brief overlap where the motif you are leaving and the
 * one you are approaching are both faintly present. Zero overlap would read as
 * a cut, which is the thing this whole redesign exists to avoid.
 *
 * ── Seams: the second half of the same idea ──
 * Overlap alone only guarantees two motifs are on screen together; it does not
 * make the transition feel *authored*. `seamAt` gives every surface in the
 * scene a second shared coordinate: how deep the flight is into the gap
 * between two waypoints: 0 at either end, 1 at the midpoint. Two things ride
 * on it:
 *
 *  1. `handoffEnergy`: one number, read by every particle and line material in
 *     the app as `uEnergy`. Because it is the *same* number everywhere, a seam
 *     reads as a single substance pulsing as it changes shape rather than as
 *     one effect fading out while an unrelated one fades in.
 *  2. Per-motif *rhymes*: each motif leans slightly toward its neighbour's
 *     visual language across the seam (FlowDrift clusters hexagonally just
 *     before HexBelt arrives; the graph stratifies into layers just before the
 *     grid does). Deliberately approximate: the goal is a visual rhyme, not
 *     literal particle reuse, which would couple the motifs to each other and
 *     cost exactly the sync problem this architecture exists to avoid.
 *
 * Note the split of responsibility. Presence decides *whether* a motif is drawn
 * and simulated; seams only decide how it behaves while it already is. Nothing
 * below can keep a motif awake past its taper, so the culling guarantees above
 * still hold exactly as written.
 */
import { MOTION } from "./motion";

export const WAYPOINT = {
  hero: 0,
  about: 1,
  projects: 2,
  skills: 3,
  experience: 4,
  contact: 5,
} as const;

export type WaypointName = keyof typeof WAYPOINT;

/** Below this, a motif is fully asleep: not drawn, not simulated. */
export const PRESENCE_EPSILON = 0.012;

/**
 * @param t        flight coordinate
 * @param waypoint the motif's home waypoint
 * @param reach    how far, in waypoints, the motif remains partly present
 */
export const presenceAt = (t: number, waypoint: number, reach = 0.9): number => {
  const d = Math.abs(t - waypoint) / reach;
  if (d >= 1) return 0;
  // Symmetric ease so approaching and leaving mirror each other exactly , 
  // scrolling back up must undo what scrolling down did, frame for frame.
  return MOTION.easeInOutCubic(1 - d);
};

/**
 * First and last motifs get an asymmetric reach: there is nothing before Hero
 * and nothing after Contact, so they hold rather than fading into a void.
 */
export const presenceHeld = (
  t: number,
  waypoint: number,
  { holdBefore = false, holdAfter = false, reach = 0.9 } = {},
): number => {
  if (holdBefore && t <= waypoint) return 1;
  if (holdAfter && t >= waypoint) return 1;
  return presenceAt(t, waypoint, reach);
};

// ── Seams ───────────────────────────────────────────────────────────────────

/** Tuning for the shared handoff behaviour: one place, in the spirit of MOTION. */
export const HANDOFF = {
  /**
   * Ceiling on the shared energy value. It is filling in a dip rather than
   * adding a flash: at a seam's midpoint each of the two neighbouring motifs is
   * at ~0.35 presence, so the seam is where the scene is at its dimmest and
   * least resolved. That trough is exactly what this exists to carry across.
   */
  energy: 1,
  /** How far FlowDrift leans into hexagonal clustering before HexBelt. */
  hexBias: 0.55,
  /** How far graph nodes stratify toward flat layers before the grid. */
  strata: 0.7,
} as const;

/**
 * How deep the flight is into the gap between two adjacent waypoints: 0 at
 * either waypoint, 1 exactly between them. Symmetric like `presenceAt`, so
 * scrolling back up retraces the identical curve.
 */
export const seamAt = (t: number, from: number, to: number): number => {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  if (t <= lo || t >= hi) return 0;
  const u = (t - lo) / (hi - lo);
  return MOTION.easeInOutCubic(1 - Math.abs(u * 2 - 1));
};

/** The seam a motif leaves by: waypoint → waypoint + 1. */
export const seamAfter = (t: number, waypoint: number): number =>
  seamAt(t, waypoint, waypoint + 1);

/** The seam a motif arrives by: waypoint - 1 → waypoint. */
export const seamBefore = (t: number, waypoint: number): number =>
  seamAt(t, waypoint - 1, waypoint);

/**
 * The connective thread: one energy value for the whole scene, peaking between
 * waypoints and zero at them. Every material's `uEnergy` reads this, which is
 * how six motifs share a heartbeat without any of them knowing the others exist.
 *
 * Seams never overlap, so the enclosing gap is simply floor(t) → floor(t) + 1.
 */
export const handoffEnergy = (t: number): number => {
  if (t <= WAYPOINT.hero || t >= WAYPOINT.contact) return 0;
  const i = Math.floor(t);
  return seamAt(t, i, i + 1) * HANDOFF.energy;
};
