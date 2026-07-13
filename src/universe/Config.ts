/**
 * Config.ts
 *
 * Every tunable constant for the blockchain-universe renderer.
 * Nothing elsewhere in `universe/` hardcodes a magic number — if you want
 * the scene denser, calmer, brighter or cheaper, this is the only file
 * you should ever need to touch.
 */

export const CONFIG = {
  /** Device-pixel-ratio cap. 3x retina buys nothing visually and costs 2.25x fill rate. */
  maxDpr: 2,

  /** Clamp dt so a background-tab wake-up doesn't teleport the simulation. (seconds) */
  maxDt: 1 / 20,

  // ── Adaptive quality ──────────────────────────────────────────────────────
  quality: {
    /** EMA smoothing factor for frame-time measurement. */
    fpsSmoothing: 0.05,
    /** Drop to reduced quality above this smoothed frame time (ms). */
    degradeAboveMs: 22,
    /** Recover to full quality below this smoothed frame time (ms). */
    recoverBelowMs: 15,
    /** Minimum ms between quality switches — prevents oscillation. */
    switchCooldownMs: 2000,
  },

  // ── Graph ─────────────────────────────────────────────────────────────────
  graph: {
    /** One node per this many px² of viewport. */
    areaPerNode: 11000,
    minNodes: 90,
    maxNodes: 320,
    /** Fraction of nodes per role. Clients take the remainder. */
    validatorRatio: 0.06,
    relayRatio: 0.22,
    /** Stable edge count per role. */
    edgesPerValidator: 5,
    edgesPerRelay: 4,
    edgesPerClient: 2,
    /** Node radii per role (CSS px). */
    validatorRadius: 3.2,
    relayRadius: 2.2,
    clientRadius: 1.4,
    /** How far a node may drift from its home anchor (px). */
    driftAmplitude: 26,
    /** Seconds between random edge re-wirings. */
    rewireInterval: 2.4,
    /** Seconds an edge takes to fade in / out during a rewire. */
    edgeFadeDuration: 1.6,
    /** Base alpha of an idle edge (dark / light theme). */
    edgeAlphaDark: 0.10,
    edgeAlphaLight: 0.16,
    /** Base alpha of an idle node dot (dark / light theme). */
    nodeAlphaDark: 0.5,
    nodeAlphaLight: 0.6,
    /** Slow "heartbeat" size oscillation of validators. */
    breathePeriod: 4.5,
    breatheAmount: 0.18,
  },

  // ── Flow field ────────────────────────────────────────────────────────────
  flowField: {
    /** Spatial scale — bigger = broader, calmer currents. */
    cellSize: 340,
    /** Seconds for the field to evolve one full noise unit. */
    timeScale: 0.045,
    /** Field output is a displacement, scaled by graph.driftAmplitude. */
    strength: 1,
  },

  // ── Packets (transactions) ───────────────────────────────────────────────
  packets: {
    poolSize: 24,
    maxActive: 10,
    /** Spawn cadence range (seconds). */
    spawnMin: 0.45,
    spawnMax: 1.1,
    /** Travel speed range (px / second). */
    speedMin: 110,
    speedMax: 190,
    sizeMin: 1.6,
    sizeMax: 2.6,
    /** Ring-buffer length of the glowing trail. */
    trailLength: 14,
    /** Max BFS hops when routing client → validator. */
    maxRouteHops: 8,
    trailAlpha: 0.35,
  },

  // ── Consensus ripple ─────────────────────────────────────────────────────
  ripple: {
    poolSize: 8,
    /** Seconds per topology hop. */
    hopDelay: 0.09,
    /** How many hops the ripple travels before dying out. */
    maxHops: 5,
    /** Seconds a node stays lit after the wavefront passes. */
    glowDecay: 0.9,
    /** Peak extra alpha added to nodes / edges at the wavefront. */
    intensity: 0.85,
  },

  // ── Mouse gravity field ──────────────────────────────────────────────────
  mouse: {
    radius: 220,
    /** Peak displacement toward the cursor (px). */
    pull: 34,
    /** Seconds to ease influence in / out. */
    easeIn: 0.35,
    easeOut: 0.9,
    /** Radius of the soft cursor glow (px). */
    glowRadius: 260,
    glowAlphaDark: 0.05,
    glowAlphaLight: 0.06,
  },

  // ── Aurora ───────────────────────────────────────────────────────────────
  aurora: {
    blobs: 3,
    /** Rendered at 1/N resolution and upscaled — massively cheaper + softer. */
    downscale: 8,
    /** Peak alpha of the combined layer. Spec: under 10%. */
    alphaDark: 0.07,
    alphaLight: 0.05,
    /** Noise-driven wander speed. */
    timeScale: 0.02,
    /** Blob radius as a fraction of the longer viewport edge. */
    radiusFraction: 0.55,
  },

  // ── Digital dust ─────────────────────────────────────────────────────────
  dust: {
    /** particles per layer at full quality: far, mid, near */
    counts: [70, 45, 26] as const,
    /** parallax drift speed per layer (px/s upward). */
    speeds: [3, 6, 11] as const,
    sizes: [0.7, 1.0, 1.5] as const,
    alphas: [0.10, 0.14, 0.18] as const,
    /** horizontal sway amplitude (px) and period (s). */
    swayAmp: 14,
    swayPeriod: 9,
  },

  // ── Perspective grid ─────────────────────────────────────────────────────
  grid: {
    /** Occupies the bottom fraction of the viewport. */
    heightFraction: 0.35,
    columns: 24,
    rows: 9,
    /** Seconds for one row to scroll from bottom edge to horizon. */
    scrollPeriod: 14,
    alphaDark: 0.06,
    alphaLight: 0.08,
  },

  // ── Hex field ────────────────────────────────────────────────────────────
  hex: {
    count: 5,
    /** Radius range as fraction of viewport min edge. */
    radiusMin: 0.22,
    radiusMax: 0.5,
    /** Full-rotation period range (seconds). */
    spinMin: 90,
    spinMax: 200,
    alpha: 0.035,
  },

  // ── Bloom ────────────────────────────────────────────────────────────────
  bloom: {
    /** Sprite texture size (px). Drawn scaled — one texture serves all glows. */
    spriteSize: 128,
    /** Glow radius multipliers per role. */
    validatorGlow: 9,
    relayGlow: 6,
    clientGlow: 4,
    packetGlow: 7,
    /** Global bloom intensity 0..1. */
    intensityDark: 1,
    intensityLight: 0.55,
  },
} as const;

export type Config = typeof CONFIG;
