/**
 * Convergence.tsx — Contact (waypoint 5).
 *
 * The flight opens by blowing a globe apart and closes by putting one back
 * together. Same Fibonacci distribution, same shader, same dispersal uniform —
 * driven backwards. As you arrive at Contact, scattered particles fly *inward*
 * and resolve into a sphere.
 *
 * This costs almost nothing to implement (it is the stage 2 material with
 * `uDisperse = 1 - presence`) and it is the single cheapest way to make five
 * sections feel like one journey rather than five stops: the last thing you see
 * is the first thing you saw, reassembled. Arrival, not just another waypoint.
 *
 * ── Making the arrival land (stage 4) ──
 * Running the departure backwards gets you a sphere, but it gets you exactly
 * the *same* sphere — and an arrival that is merely equal to the departure is
 * an anticlimax. Four things now make the reassembled globe read as more
 * resolved than the one that came apart, all of them the hero's own mechanisms
 * inverted:
 *
 *  · **It tightens.** `uTighten` scales out the radial jitter that gives a shell
 *    its thickness, so this globe closes on a clean surface where the hero's was
 *    a loose cloud. Same buffer, one uniform.
 *  · **It unifies.** The stagger starts wide — particles trickling in reads as
 *    gathering, which is the right note for "get in touch" — and narrows as it
 *    closes, so the last of the shell arrives together rather than dribbling in.
 *  · **It has a core.** A second, denser shell inside gathers from closer and
 *    therefore lands first. The globe is solid before its surface finishes.
 *  · **It gains a lattice.** The hero globe *loses* its structure as it opens;
 *    this one earns one as it closes, fading in over the last of the gather.
 *
 * The seam before this one is the other half of the same idea: the grid's
 * graduation marks lift off the floor toward the corridor axis while this globe
 * rises to meet them, so the chronology visibly resolves into the arrival.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, LineSegments, Points, ShaderMaterial } from "three";
import { BufferAttribute, BufferGeometry, MathUtils } from "three";
import { fibonacciSphere, phyllotacticLattice } from "../fibonacciSphere";
import {
  applyParticleTheme,
  createParticleMaterial,
} from "../particleMaterial";
import { applyLineTheme, createLineMaterial } from "../lineMaterial";
import { MOTION, damp, waypointZ } from "../motion";
import {
  PRESENCE_EPSILON,
  WAYPOINT,
  handoffEnergy,
  presenceHeld,
  seamBefore,
} from "../useMotif";
import type { FlightState } from "../useFlightProgress";
import type { MutableRefObject } from "react";

export interface ConvergenceProps {
  accentRaw: string;
  isDark: boolean;
  count: number;
  flight: MutableRefObject<FlightState>;
  still?: boolean;
}

const RADIUS = 3.4;
const SCATTER = 9;
/** The inner shell, as a fraction of the outer. */
const CORE_SCALE = 0.52;
/** How far the globe sits toward the grid floor at the midpoint of the seam. */
const RISE = 3.2;

export const Convergence = ({
  accentRaw,
  isDark,
  count,
  flight,
  still = false,
}: ConvergenceProps) => {
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const coreRef = useRef<Points>(null);
  const linkRef = useRef<LineSegments>(null);
  const { invalidate } = useThree();
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const coreCount = Math.round(count * 0.32);
  const shellCount = count - coreCount;

  const geometry = useMemo(() => {
    const { positions, scales, phases, jitters } = fibonacciSphere({
      count: shellCount,
      radius: RADIUS,
      thickness: 0.08,
      seed: 777001,
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aScale", new BufferAttribute(scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    g.setAttribute("aJitter", new BufferAttribute(jitters, 1));
    g.computeBoundingSphere();
    return g;
  }, [shellCount]);

  const coreGeo = useMemo(() => {
    const { positions, scales, phases, jitters } = fibonacciSphere({
      count: coreCount,
      radius: RADIUS * CORE_SCALE,
      thickness: 0.05,
      scaleRange: [0.4, 1.0],
      seed: 777002,
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aScale", new BufferAttribute(scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    g.setAttribute("aJitter", new BufferAttribute(jitters, 1));
    g.computeBoundingSphere();
    return g;
  }, [coreCount]);

  /** The structure this globe earns on arrival. Same builder as the hero's. */
  const linkGeo = useMemo(() => {
    const positions = coreGeo.getAttribute("position").array as Float32Array;
    const lattice = phyllotacticLattice({
      positions,
      count: coreCount,
      stride: coreCount > 1200 ? 3 : 2,
      links: 2,
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(lattice.positions, 3));
    g.setAttribute("aAlpha", new BufferAttribute(lattice.alphas, 1));
    g.setAttribute("aPhase", new BufferAttribute(lattice.phases, 1));
    g.computeBoundingSphere();
    return g;
  }, [coreGeo, coreCount]);

  const material = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 28,
        opacity: 0,
        fadeNear: 6,
        fadeFar: 28,
        disperseDist: SCATTER,
        // Wider stagger than the hero shell: particles trickling in over a
        // longer window reads as gathering, whereas a tight window reads as
        // an implosion, which is the wrong emotional note for "get in touch".
        // Narrowed at runtime as the globe closes — see the frame loop.
        stagger: 0.62,
        rim: 0.85,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const coreMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 17,
        opacity: 0,
        fadeNear: 5,
        fadeFar: 26,
        // Gathers from closer in, so it lands before the surface does.
        disperseDist: SCATTER * 0.7,
        stagger: 0.3,
        rim: 0.5,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const linkMat = useMemo(
    () =>
      createLineMaterial({
        accentRaw,
        isDark,
        opacity: 0,
        fadeNear: 5,
        fadeFar: 26,
        disperseDist: SCATTER * 0.74,
        stagger: 0.3,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      coreGeo.dispose();
      linkGeo.dispose();
      material.dispose();
      coreMat.dispose();
      linkMat.dispose();
    },
    [geometry, coreGeo, linkGeo, material, coreMat, linkMat],
  );

  const peak = useRef({ shell: 1, core: 0.8, link: 0.55 });
  useEffect(() => {
    for (const m of [material, coreMat] as ShaderMaterial[]) {
      applyParticleTheme(m, accentRaw, isDark);
      m.uniforms.uTwinkle.value = still ? 0 : 1;
      m.uniforms.uPixelRatio.value = dpr;
    }
    applyLineTheme(linkMat as ShaderMaterial, accentRaw, isDark);
    peak.current.shell = isDark ? 1 : 0.85;
    peak.current.core = isDark ? 0.8 : 0.65;
    peak.current.link = isDark ? 0.55 : 0.38;
    invalidate();
  }, [accentRaw, isDark, still, dpr, material, coreMat, linkMat, invalidate]);

  const opacity = useRef(0);
  const gather = useRef(1);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const t = flight.current.t;

    // holdAfter: Contact is the end of the document. Scrolling to the very
    // bottom must not fade the globe back out into nothing.
    const presence = presenceHeld(t, WAYPOINT.contact, {
      holdAfter: true,
      reach: 1.05,
    });
    const awake = presence > PRESENCE_EPSILON;
    if (groupRef.current) groupRef.current.visible = awake;
    if (!awake) {
      opacity.current = 0;
      material.uniforms.uOpacity.value = 0;
      coreMat.uniforms.uOpacity.value = 0;
      linkMat.uniforms.uOpacity.value = 0;
      return;
    }

    opacity.current = damp(
      opacity.current,
      peak.current.shell * presence,
      MOTION.lambda.opacity,
      dt,
    );
    material.uniforms.uOpacity.value = opacity.current;

    const time = state.clock.elapsedTime;
    material.uniforms.uTime.value = time * MOTION.speed.twinkle;
    coreMat.uniforms.uTime.value = time * MOTION.speed.twinkle * 1.2;

    const energy = handoffEnergy(t);
    material.uniforms.uEnergy.value = energy;
    coreMat.uniforms.uEnergy.value = energy;
    linkMat.uniforms.uEnergy.value = energy;

    // The stage 2 dispersal, run in reverse.
    gather.current = damp(gather.current, 1 - presence, MOTION.lambda.disperse, dt);
    material.uniforms.uDisperse.value = gather.current;

    // The core is ahead of the surface on the same curve rather than on a
    // schedule of its own: raising gather to a power pulls it toward 0 faster
    // while keeping both endpoints identical, so they still start and finish
    // together.
    const coreGather = gather.current * gather.current * gather.current;
    coreMat.uniforms.uDisperse.value = coreGather;
    linkMat.uniforms.uDisperse.value = coreGather;

    // Tighten and unify over the last of the arrival. Both are the difference
    // between this globe and the one the hero blew apart.
    const resolve = MathUtils.smoothstep(presence, 0.5, 1);
    material.uniforms.uTighten.value = resolve;
    coreMat.uniforms.uTighten.value = resolve;
    material.uniforms.uStagger.value = 0.62 - 0.4 * resolve;

    coreMat.uniforms.uOpacity.value = peak.current.core * presence;
    // Structure is the last thing to appear, and only once the core it belongs
    // to has actually landed.
    linkMat.uniforms.uOpacity.value =
      peak.current.link * presence * MathUtils.clamp(1 - coreGather * 2.4, 0, 1);

    // Arriving from the grid: the globe sits low, near the floor the marks are
    // lifting off, and rises into place as Contact resolves.
    if (groupRef.current) {
      groupRef.current.position.y = -RISE * seamBefore(t, WAYPOINT.contact);
    }

    const spin = MOTION.speed.globeSpin * dt;
    if (pointsRef.current) pointsRef.current.rotation.y += spin;
    // Core and lattice share a transform exactly, or the structure slides
    // inside the points it is drawn between.
    if (coreRef.current) coreRef.current.rotation.y -= spin * 0.55;
    if (linkRef.current) linkRef.current.rotation.y -= spin * 0.55;
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, waypointZ(WAYPOINT.contact)]}
      visible={false}
    >
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
        <primitive object={material} attach="material" />
      </points>
      <points ref={coreRef} geometry={coreGeo} frustumCulled={false}>
        <primitive object={coreMat} attach="material" />
      </points>
      <lineSegments ref={linkRef} geometry={linkGeo} frustumCulled={false}>
        <primitive object={linkMat} attach="material" />
      </lineSegments>
    </group>
  );
};
