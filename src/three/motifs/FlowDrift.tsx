/**
 * FlowDrift.tsx — About (waypoint 1).
 *
 * The first thing on the other side of the shattered globe. A loose volume of
 * particles whose positions are `home + flowField(home, t) * amplitude` — the
 * ported FlowField behaviour exactly, just in three axes.
 *
 * This is the one motif where the CPU does the work per frame rather than the
 * GPU, and that is deliberate: the whole point of the original field was that
 * it is a *displacement* sampled at a stable anchor, not an integration. Doing
 * it in a vertex shader would mean reimplementing simplex noise in GLSL and
 * re-tuning every constant against a different noise implementation. At the
 * counts used here the cost is a fraction of a millisecond, and it stops
 * entirely when presence hits zero.
 *
 * ── Settle time (stage 4) ──
 * The section header says this is what is on the other side of the shattered
 * globe, but a uniform noise field does not read as *debris* — it reads as
 * weather. So every particle now has two anchors and its own clock:
 *
 *   anchor(i) = mix(origin(i), home(i), settled(i))
 *
 * `origin` is a point on a shell where the globe used to be — literally six
 * units in front of this motif's centre, which is where the hero globe sits in
 * world space. `home` is its final position in the ambient volume. `settled`
 * runs 0 → 1 across the flight with a per-particle delay, so at any moment part
 * of the field has dispersed and part is still visibly arriving from the
 * wreckage. The tail is what sells it; a synchronised transition would just be
 * a different uniform.
 *
 * Unsettled particles also carry less of the flow field (they have not joined
 * the ambient current yet), which keeps early debris moving coherently instead
 * of wandering like everything around it.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Points, ShaderMaterial } from "three";
import { BufferAttribute, BufferGeometry } from "three";
import {
  applyParticleTheme,
  createParticleMaterial,
} from "../particleMaterial";
import { fibonacciSphere } from "../fibonacciSphere";
import { FlowField3 } from "../systems/flowField";
import { createRandom } from "../systems/noise";
import { MOTION, damp, range, waypointZ } from "../motion";
import {
  HANDOFF,
  PRESENCE_EPSILON,
  WAYPOINT,
  handoffEnergy,
  presenceAt,
  seamAfter,
} from "../useMotif";
import type { FlightState } from "../useFlightProgress";
import type { MutableRefObject } from "react";

export interface FlowDriftProps {
  accentRaw: string;
  isDark: boolean;
  count: number;
  flight: MutableRefObject<FlightState>;
  still?: boolean;
}

const AMPLITUDE = 1.9;
const BOX = { w: 26, h: 16, d: 20 };

/**
 * Where the wreckage comes from. The hero globe lives at world z = 0 and this
 * motif's group sits at waypointZ(1) = -6, so +6 on the local z axis is exactly
 * the globe's position — the debris starts where the thing that broke was.
 */
const ORIGIN_Z = 6;
const ORIGIN_RADIUS = 2.7;

/** Flight-coordinate window over which the debris finishes dispersing. */
const SETTLE = { start: 0.4, end: 1.3 };
/** Longest per-particle delay, as a fraction of that window. */
const SETTLE_SPREAD = 0.55;

/**
 * The handoff into HexBelt. Particles bias toward six-fold spokes and discrete
 * rings — near enough to a hex lattice that the eye reads the next motif
 * beginning to form in the previous one's material, without either motif
 * knowing the other exists.
 */
const RHYME_RING = 5.5;
/** sin(60°). The only constant the trig-free spoke test below needs. */
const SQRT3_2 = Math.sqrt(3) / 2;
/** Below this the bias is invisible and not worth the trigonometry. */
const RHYME_EPSILON = 0.05;

export const FlowDrift = ({
  accentRaw,
  isDark,
  count,
  flight,
  still = false,
}: FlowDriftProps) => {
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const { invalidate } = useThree();
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const field = useMemo(() => new FlowField3(7331, { cellSize: 7 }), []);

  /** Anchors stay fixed; only the rendered copy moves. */
  const homes = useMemo(() => {
    const rand = createRandom(5150);
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (rand() - 0.5) * BOX.w;
      a[i * 3 + 1] = (rand() - 0.5) * BOX.h;
      a[i * 3 + 2] = (rand() - 0.5) * BOX.d;
    }
    return a;
  }, [count]);

  /**
   * The other anchor: a shell where the globe was. Built with the same
   * golden-angle sampler the hero shell uses, so the debris starts from a
   * genuinely globe-shaped distribution rather than a random cloud that happens
   * to be in the right place.
   */
  const origins = useMemo(() => {
    const { positions } = fibonacciSphere({
      count,
      radius: ORIGIN_RADIUS,
      thickness: 0.3,
      seed: 20260801,
    });
    for (let i = 0; i < count; i++) positions[i * 3 + 2] += ORIGIN_Z;
    return positions;
  }, [count]);

  /** Per-particle settle delay, 0..1. The reason the field has a tail. */
  const delays = useMemo(() => {
    const rand = createRandom(4242);
    const a = new Float32Array(count);
    // Biased toward early: most of the field should be settled by About, with
    // a minority still visibly catching up.
    for (let i = 0; i < count; i++) a[i] = rand() ** 1.6;
    return a;
  }, [count]);

  const geometry = useMemo(() => {
    const rand = createRandom(9001);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      scales[i] = 0.4 + rand() ** 2 * 1.1;
      phases[i] = rand();
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(homes.slice(), 3));
    g.setAttribute("aScale", new BufferAttribute(scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    g.computeBoundingSphere();
    // Generous once, rather than recomputed per frame: points move every frame
    // and an exact bounds recompute would cost more than the culling saves.
    const bs = g.boundingSphere;
    if (bs) bs.radius += AMPLITUDE * 2 + ORIGIN_Z;
    return g;
  }, [count, homes]);

  const material = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 30,
        opacity: 0,
        fadeNear: 6,
        fadeFar: 26,
        nearFade: 1.6,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const peak = useRef(0.85);
  useEffect(() => {
    const mat = material as ShaderMaterial;
    applyParticleTheme(mat, accentRaw, isDark);
    mat.uniforms.uTwinkle.value = still ? 0 : 1;
    mat.uniforms.uPixelRatio.value = dpr;
    peak.current = isDark ? 0.85 : 0.6;
    invalidate();
  }, [accentRaw, isDark, still, dpr, material, invalidate]);

  const opacity = useRef(0);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    const t = flight.current.t;

    const presence = presenceAt(t, WAYPOINT.about);
    const awake = presence > PRESENCE_EPSILON;
    if (groupRef.current) groupRef.current.visible = awake;
    if (!awake) {
      opacity.current = 0;
      material.uniforms.uOpacity.value = 0;
      return; // asleep: no noise sampling, no buffer upload
    }

    opacity.current = damp(
      opacity.current,
      peak.current * presence,
      MOTION.lambda.opacity,
      dt,
    );
    material.uniforms.uOpacity.value = opacity.current;
    material.uniforms.uTime.value = time * MOTION.speed.twinkle;
    material.uniforms.uEnergy.value = handoffEnergy(t);

    // How far the dispersal has progressed overall. Per-particle delays are
    // applied against this, below.
    const settle = MOTION.easeInOutCubic(range(t, SETTLE.start, SETTLE.end));

    // The hex rhyme, gated so the trigonometry only runs inside the seam.
    const toHex = seamAfter(t, WAYPOINT.about);
    const bias = toHex > RHYME_EPSILON ? toHex * HANDOFF.hexBias : 0;

    const attr = geometry.getAttribute("position") as BufferAttribute;
    const pos = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Per-particle settle: starts at delay * SPREAD, takes the remainder of
      // the window. smoothstep rather than a linear ramp so a particle eases
      // into its home instead of arriving and stopping dead.
      const d0 = delays[i] * SETTLE_SPREAD;
      const raw = (settle - d0) / (1 - d0);
      const u = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
      const s = u * u * (3 - 2 * u);

      const hx = homes[i3];
      const hy = homes[i3 + 1];
      const hz = homes[i3 + 2];

      // Anchor sweeps from the wreckage to the ambient volume.
      const ax = origins[i3] + (hx - origins[i3]) * s;
      const ay = origins[i3 + 1] + (hy - origins[i3 + 1]) * s;
      const az = origins[i3 + 2] + (hz - origins[i3 + 2]) * s;

      // Sampled at the anchor, as the original field was — so the motion stays
      // a displacement rather than becoming an integration with drift.
      const f = field.sample(ax, ay, az, time);
      // Debris that has not joined the ambient current carries less of it.
      const amp = AMPLITUDE * (0.45 + 0.55 * s);

      let px = ax + f.x * amp;
      let py = ay + f.y * amp;
      const pz = az + f.z * amp;

      if (bias > 0) {
        // Snap toward the nearest of six spokes and the nearest ring radius.
        // Approximate on purpose: an exact hex lattice would read as HexBelt
        // arriving early rather than as FlowDrift anticipating it.
        //
        // No trigonometry. A hexagon's six directions are +/-(1, 0),
        // +/-(1/2, sqrt3/2) and +/-(-1/2, sqrt3/2), so three signed dot
        // products pick the axis and their sign picks the orientation. The
        // obvious atan2/cos/sin version measured 3.3x the cost of this one for
        // an identical result, and it ran on every particle of the field.
        const d0 = px;
        const d1 = px * 0.5 + py * SQRT3_2;
        const d2 = -px * 0.5 + py * SQRT3_2;
        const a0 = Math.abs(d0);
        const a1 = Math.abs(d1);
        const a2 = Math.abs(d2);

        let sx: number;
        let sy: number;
        let dm: number;
        if (a0 >= a1 && a0 >= a2) {
          sx = 1; sy = 0; dm = d0;
        } else if (a1 >= a2) {
          sx = 0.5; sy = SQRT3_2; dm = d1;
        } else {
          sx = -0.5; sy = SQRT3_2; dm = d2;
        }
        if (dm < 0) {
          sx = -sx;
          sy = -sy;
        }

        const r = Math.sqrt(px * px + py * py);
        const ring = Math.max(1, Math.round(r / RHYME_RING)) * RHYME_RING;
        px += (sx * ring - px) * bias;
        py += (sy * ring - py) * bias;
      }

      pos[i3] = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;
    }
    attr.needsUpdate = true;

    if (pointsRef.current) {
      pointsRef.current.rotation.y += MOTION.speed.starDrift * 1.5 * dt;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, waypointZ(WAYPOINT.about)]} visible={false}>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
        <primitive object={material} attach="material" />
      </points>
    </group>
  );
};
