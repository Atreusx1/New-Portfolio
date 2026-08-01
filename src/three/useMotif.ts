/**
 * useMotif.ts — how a section's motif knows whether it exists yet.
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
 *     skips its simulation entirely — no flow-field sampling, no packet
 *     integration, no buffer uploads. Five motifs are affordable only because
 *     at most two are ever awake.
 *
 * The taper is deliberately wider than the gap between waypoints (0.9 vs 1.0),
 * so there is always a brief overlap where the motif you are leaving and the
 * one you are approaching are both faintly present. Zero overlap would read as
 * a cut, which is the thing this whole redesign exists to avoid.
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
  // Symmetric ease so approaching and leaving mirror each other exactly —
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
