/**
 * motion.ts — the single motion vocabulary for the whole universe.
 *
 * Every camera move, particle dispersal, opacity cross-fade and text reveal
 * pulls its easing and its speed from this file. If a new 3D surface invents
 * its own `0.05` lerp factor, the sections stop feeling like one continuous
 * system — which is the whole point of the redesign. One file, one language.
 *
 * Damping is frame-rate independent (MathUtils.damp), so a 120Hz display and a
 * throttled 30Hz tab converge at the same wall-clock rate.
 */
import { MathUtils } from "three";

/** Frame-rate-independent exponential approach. Higher lambda = snappier. */
export const damp = (
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number => MathUtils.damp(current, target, lambda, dt);

export const MOTION = {
  /**
   * Damping rates, in "how eagerly does this chase its target".
   * Deliberately few: pick the closest one rather than adding a new entry.
   */
  lambda: {
    /** Camera dolly / fov — heavy, cinematic, never twitchy. */
    camera: 2.2,
    /** Pointer parallax — light and responsive, but still lagged. */
    parallax: 3.0,
    /** Cross-fades between section motifs. */
    opacity: 4.0,
    /** Rotation speed changes (spin-up during the dive). */
    rotation: 1.4,
    /** Dispersal — slightly ahead of the camera so the shell opens first. */
    disperse: 2.8,
  },

  /** Ambient speeds, in units/second. Not per-frame deltas. */
  speed: {
    /** Primary globe shell, radians/sec. Slow enough to read as "alive". */
    globeSpin: 0.036,
    /** Halo shell counter-rotates for parallax depth. */
    haloSpin: -0.021,
    /** Spin rate at full dive — the shell whips as it opens. */
    diveSpin: 0.34,
    /** Starfield drift once through. */
    starDrift: 0.008,
    /** Twinkle oscillation. */
    twinkle: 0.55,
    /** Pointer tilt, in radians at full deflection. */
    tilt: 0.09,
  },

  /**
   * Entrance easing. Matches the CSS `cubic-bezier(0.16, 1, 0.3, 1)` used by
   * .glass panels and Reveal, so DOM and WebGL entrances share a curve.
   */
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),

  /** Scroll-scrub easing — symmetric, so scrolling up mirrors scrolling down. */
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
} as const;

/**
 * FLIGHT — the geometry of leg 1 (hero → About), in flight-coordinate space.
 *
 * All windows are expressed as [start, end] on the leg's 0..1 progress, so the
 * choreography is readable in one glance instead of scattered across four
 * components. Stage 3 adds LEG_2 etc. alongside, it does not edit these.
 */
export const FLIGHT = {
  camera: {
    /** Resting distance — globe frames the copy without crowding it. */
    zRest: 6.2,
    /** Ends behind the shell's original radius: we genuinely break through. */
    zBreak: -1.4,
    fovRest: 52,
    /** Widening fov during the dive is most of the sensation of speed. */
    fovBreak: 76,
  },
  /** Shell dispersal window. Starts before the camera arrives, not on impact. */
  disperse: { start: 0.1, end: 0.86, distance: 5.4 },
  /** Halo is outermost, so it opens first and clears the path. */
  haloDisperse: { start: 0.0, end: 0.62, distance: 7.6 },
  /** The globe itself fades out once we are through it. */
  globeFade: { start: 0.62, end: 0.95 },
  /** Deep space fades in behind the opening shell, so About is never a void. */
  starfield: { start: 0.34, end: 0.92 },
} as const;

/**
 * CORRIDOR — where the flight goes after it breaks through the globe.
 *
 * The organising idea of stage 3: the camera never turns around and never cuts.
 * It keeps flying down −z forever, and each section's motif is a real object
 * parked further down that corridor. "Arriving at Skills" is literally the
 * camera reaching the z where the network graph lives.
 *
 * This is why the sections feel continuous rather than stitched: there is no
 * transition *between* motifs, only travel *through* them. Nothing cross-fades
 * because nothing needs to — the far-fade in the particle shader dissolves what
 * is behind you and reveals what is ahead, exactly as distance would.
 */
export const CORRIDOR = {
  /** World units between consecutive section motifs. */
  spacing: 26,
  /** Where waypoint 1 (About) sits, just past the shattered globe. */
  arrivalZ: -6,
  /** Cruising fov once the dive is over — the dive's 76° is a spike, not a home. */
  fovCruise: 60,
  /**
   * Lateral drift amplitude. Without this a five-section flight down a straight
   * −z line reads as a tube, and the eye stops registering forward motion.
   */
  swayX: 2.4,
  swayY: 1.5,
  /** Sway wavelength in flight-coordinate units. Prime-ish so x and y never sync. */
  swayPeriodX: 2.3,
  swayPeriodY: 3.1,
} as const;

/** World-space z of a section motif, given its waypoint index (1 = About). */
export const waypointZ = (waypoint: number): number =>
  CORRIDOR.arrivalZ - (waypoint - 1) * CORRIDOR.spacing;

/** Map x from [a,b] to [0,1], clamped. The only remap helper we use. */
export const range = (x: number, a: number, b: number): number =>
  MathUtils.clamp((x - a) / (b - a), 0, 1);
