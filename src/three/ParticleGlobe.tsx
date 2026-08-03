/**
 * ParticleGlobe.tsx: the hero globe, and the shell we fly through.
 *
 * Three shells, not one:
 *  · a dense surface shell that reads as the globe itself
 *  · an inner lattice shell at ~0.74x radius, with its nearest-neighbour links
 *    actually drawn, so the globe has visible internal structure instead of a
 *    hollow silhouette
 *  · a sparse halo at ~1.55x radius, counter-rotating, which gives real
 *    parallax as the camera moves and stops the silhouette from looking like
 *    a decal. It is also the shell that opens first during the dive.
 *
 * They open in that order reversed, halo, then surface, then lattice, so the
 * structure is the last thing to let go. A globe whose skeleton survives a
 * moment longer than its skin reads as something being taken apart; everything
 * leaving at once reads as a particle preset.
 *
 * Stage 2 added dispersal. The choreography lives in FLIGHT (motion.ts), the
 * displacement happens in the vertex shader, and this component only maps
 * scroll → uniforms. Nothing here re-renders React while scrolling: uniform
 * writes on a ref are the R3F-sanctioned way to animate.
 *
 * ── Pointer repulsion (stage 4) ──
 * The one place in the scene that reacts to the cursor. Points near the pointer
 * ease outward and ease back when it leaves; both directions are damped, so it
 * behaves like a field rather than a hover state. It is scoped hard to the hero:
 * authority is `hero presence × (1 - dispersal)`, which means it is already gone
 * before About and completely gone once the shell opens. See the notes on the
 * frame loop below for why this is a per-frame CPU write and not a uniform.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type {
  BufferGeometry,
  Group,
  LineSegments,
  PerspectiveCamera,
  Points,
  ShaderMaterial,
} from "three";
import {
  BufferAttribute,
  BufferGeometry as BG,
  MathUtils,
  Vector3,
} from "three";
import {
  fibonacciSphere,
  phyllotacticLattice,
  type ShellOptions,
} from "./fibonacciSphere";

import { applyParticleTheme, createParticleMaterial } from "./particleMaterial";
import { applyLineTheme, createLineMaterial } from "./lineMaterial";
import { pointerOnPlane, type PointerState } from "./usePointer";
import { FLIGHT, MOTION, damp, range } from "./motion";
import { WAYPOINT, handoffEnergy, presenceHeld } from "./useMotif";
import type { FlightState } from "./useFlightProgress";
import type { MutableRefObject } from "react";

const useShellGeometry = (opts: ShellOptions): BufferGeometry =>
  useMemo(() => {
    const { positions, scales, phases, jitters } = fibonacciSphere(opts);
    const g = new BG();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aScale", new BufferAttribute(scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    g.setAttribute("aJitter", new BufferAttribute(jitters, 1));
    g.computeBoundingSphere();
    return g;
    // Counts/radii are stable per quality tier; rebuilding on every render
    // would thrash GPU buffers for no visual gain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.count, opts.radius, opts.thickness, opts.seed]);

/**
 * Pointer field tuning. Deliberately small numbers: the brief for this effect
 * is "you notice the globe noticed you", not "the globe scatters".
 */
const POINTER = {
  /** Radius of influence, as a fraction of the globe's radius. */
  radius: 0.62,
  /** Peak displacement in local units: about 10% of the radius. */
  strength: 0.2,
  /** Approach rate for the displacement, both outward and back. */
  lambda: 3.2,
  /** Below this maximum offset the field is treated as settled and skipped. */
  rest: 1e-3,
} as const;

export interface ParticleGlobeProps {
  accentRaw: string;
  isDark: boolean;
  /** Total budget across all three shells. */
  particleCount: number;
  flight: MutableRefObject<FlightState>;
  /** Cursor in NDC. Absent, or inactive, and the repulsion never runs. */
  pointer?: MutableRefObject<PointerState>;
  radius?: number;
  /** Freezes spin, twinkle, dispersal, parallax and pointer repulsion. */
  still?: boolean;
}

export const ParticleGlobe = ({
  accentRaw,
  isDark,
  particleCount,
  flight,
  pointer,
  radius = 2.05,
  still = false,
}: ParticleGlobeProps) => {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Points>(null);
  const latticeRef = useRef<Points>(null);
  const linkRef = useRef<LineSegments>(null);
  const haloRef = useRef<Points>(null);
  const { viewport, invalidate } = useThree();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const haloCount = Math.round(particleCount * 0.22);
  const latticeCount = Math.round(particleCount * 0.16);
  const coreCount = particleCount - haloCount - latticeCount;

  const coreGeo = useShellGeometry({
    count: coreCount,
    radius,
    thickness: 0.05,
    seed: 20260801,
  });
  const latticeGeo = useShellGeometry({
    count: latticeCount,
    radius: radius * 0.74,
    thickness: 0.03,
    scaleRange: [0.35, 0.85],
    seed: 31415926,
  });
  const haloGeo = useShellGeometry({
    count: haloCount,
    radius: radius * 1.55,
    thickness: 0.22,
    scaleRange: [0.4, 1.0],
    seed: 90210,
  });

  /**
   * The lattice's links. Built once from the inner shell's own positions, so it
   * inherits mulberry32's determinism for free: same globe, same skeleton,
   * every reload.
   *
   * Stride is the density knob. Two links per sampled point is what produces
   * the double spiral: the golden-angle distribution's two shortest
   * parastichies, which is why this reads as a woven surface rather than as a
   * random mesh.
   */
  const linkGeo = useMemo(() => {
    // Read the shell back rather than rebuilding it: the links must sit on
    // exactly the points that are drawn, and a second call with the same
    // arguments is one edit away from silently not being the same shell.
    const positions = latticeGeo.getAttribute("position").array as Float32Array;
    const lattice = phyllotacticLattice({
      positions,
      count: latticeCount,
      stride: latticeCount > 1200 ? 3 : 2,
      links: 2,
    });
    const g = new BG();
    g.setAttribute("position", new BufferAttribute(lattice.positions, 3));
    g.setAttribute("aAlpha", new BufferAttribute(lattice.alphas, 1));
    g.setAttribute("aPhase", new BufferAttribute(lattice.phases, 1));
    g.computeBoundingSphere();
    return g;
  }, [latticeGeo, latticeCount]);

  const coreMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 26,
        disperseDist: FLIGHT.disperse.distance,
        stagger: 0.5,
        // The rim is what turns "many dots" into "one sphere": points near the
        // silhouette brighten, exactly as a lit surface would.
        rim: 0.85,
      }),
    // Theme is pushed through uniforms below, not by rebuilding the material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const latticeMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 15,
        fadeNear: 3,
        fadeFar: 10,
        disperseDist: FLIGHT.disperse.distance * 0.82,
        // Longest stagger of the three shells: the structure lets go last.
        stagger: 0.66,
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
        fadeNear: 3,
        fadeFar: 10.5,
        // Matches the lattice points closely enough that the links stretch with
        // them rather than sliding through them. Not exactly: points scale their
        // travel by aScale and lines have no per-vertex scale, so the lattice
        // tears slightly ahead of its points: which is the correct-looking
        // artefact, and it is gone by the time the fade below finishes anyway.
        disperseDist: FLIGHT.disperse.distance * 0.86,
        stagger: 0.66,
        // Well below the line default. Modelled on paper, 2.6x puts these at
        // 4.5:1 against the background, a hard wireframe cage sitting behind
        // the headline rather than structure glimpsed inside a sphere. 1.0
        // lands at 2.7:1, which reads as the same weave dark mode shows.
        lightGain: 1.0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const haloMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 18,
        fadeNear: 4,
        fadeFar: 14,
        disperseDist: FLIGHT.haloDisperse.distance,
        stagger: 0.34,
        // The halo is the outermost, faintest shell; full ink would turn it
        // into a second silhouette competing with the core.
        lightGain: 1.15,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Theme-driven base opacity; the flight fade multiplies into it. */
  const baseOpacity = useRef({ core: 1, lattice: 0.7, link: 0.5, halo: 0.55 });

  useEffect(
    () => () => {
      coreGeo.dispose();
      latticeGeo.dispose();
      linkGeo.dispose();
      haloGeo.dispose();
      coreMat.dispose();
      latticeMat.dispose();
      linkMat.dispose();
      haloMat.dispose();
    },
    [
      coreGeo,
      latticeGeo,
      linkGeo,
      haloGeo,
      coreMat,
      latticeMat,
      linkMat,
      haloMat,
    ],
  );

  // Theme forwarding: imperative uniform writes, no canvas remount. Mirrors
  // the discipline the old Renderer.setTheme() had, which was worth keeping.
  useEffect(() => {
    for (const mat of [coreMat, latticeMat, haloMat] as ShaderMaterial[]) {
      applyParticleTheme(mat, accentRaw, isDark);
    }
    applyLineTheme(linkMat as ShaderMaterial, accentRaw, isDark);

    // One value per shell for both themes: the light-mode difference is a
    // property of the *material* now (uLightGain), not of every call site
    // guessing at it separately. The lattice links in particular were being
    // discounted twice: once here and once by the line shader's dark-tuned
    // base alphas: which is why the globe's structure was invisible on paper.
    baseOpacity.current.core = 1;
    baseOpacity.current.lattice = 0.7;
    baseOpacity.current.link = 0.5;
    baseOpacity.current.halo = 0.55;

    coreMat.uniforms.uOpacity.value = baseOpacity.current.core;
    latticeMat.uniforms.uOpacity.value = baseOpacity.current.lattice;
    linkMat.uniforms.uOpacity.value = baseOpacity.current.link;
    haloMat.uniforms.uOpacity.value = baseOpacity.current.halo;
    invalidate();
  }, [accentRaw, isDark, coreMat, latticeMat, linkMat, haloMat, invalidate]);

  useEffect(() => {
    const v = still ? 0 : 1;
    for (const mat of [coreMat, latticeMat, haloMat]) {
      mat.uniforms.uTwinkle.value = v;
      mat.uniforms.uPixelRatio.value = dpr;
      if (still) mat.uniforms.uDisperse.value = 0;
    }
    if (still) linkMat.uniforms.uDisperse.value = 0;
    invalidate();
  }, [still, dpr, coreMat, latticeMat, linkMat, haloMat, invalidate]);

  const tilt = useRef({ x: 0, y: 0 });
  const spin = useRef<number>(MOTION.speed.globeSpin);
  const disperse = useRef({ core: 0, lattice: 0, halo: 0 });

  // ── Pointer repulsion state ────────────────────────────────────────────────
  // The untouched shell, kept separately because the position attribute is the
  // buffer the GPU reads: it holds base + offset, so the base has to live
  // somewhere that surviving a frame does not depend on the offset being exactly
  // reversible in floating point.
  const coreBase = useMemo(
    () => (coreGeo.getAttribute("position").array as Float32Array).slice(),
    [coreGeo],
  );
  const coreOffset = useMemo(() => new Float32Array(coreCount * 3), [coreCount]);
  /** False when every offset has settled to zero, so the loop can be skipped. */
  const fieldAwake = useRef(false);
  const hitWorld = useMemo(() => new Vector3(), []);
  const hitLocal = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    if (still) return;
    // Clamped dt: a backgrounded tab must not teleport the simulation.
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;

    coreMat.uniforms.uTime.value = t * MOTION.speed.twinkle;
    latticeMat.uniforms.uTime.value = t * MOTION.speed.twinkle * 1.15;
    haloMat.uniforms.uTime.value = t * MOTION.speed.twinkle * 0.8;

    // The globe is the first stage of the same story, so it reads the same
    // shared energy every motif downstream does.
    const energy = handoffEnergy(flight.current.t);
    coreMat.uniforms.uEnergy.value = energy;
    latticeMat.uniforms.uEnergy.value = energy;
    linkMat.uniforms.uEnergy.value = energy;
    haloMat.uniforms.uEnergy.value = energy;

    // ── Leg 1 of the flight: hero → About ────────────────────────────────
    // Clamped, so scrolling deeper holds the end state rather than
    // extrapolating the shell into the next section's territory.
    const leg = MathUtils.clamp(flight.current.t, 0, 1);

    const coreTarget = MOTION.easeInOutCubic(
      range(leg, FLIGHT.disperse.start, FLIGHT.disperse.end),
    );
    // The lattice lags the surface by a fraction of the window rather than
    // running on its own schedule: same curve, later start.
    const latticeTarget = MOTION.easeInOutCubic(
      range(leg, FLIGHT.disperse.start + 0.08, FLIGHT.disperse.end + 0.06),
    );
    const haloTarget = MOTION.easeInOutCubic(
      range(leg, FLIGHT.haloDisperse.start, FLIGHT.haloDisperse.end),
    );

    // Damping is what makes this survive a trackpad flick or a smooth-scrolled
    // nav jump: the raw scroll value can teleport, the shell never does.
    disperse.current.core = damp(
      disperse.current.core,
      coreTarget,
      MOTION.lambda.disperse,
      dt,
    );
    disperse.current.lattice = damp(
      disperse.current.lattice,
      latticeTarget,
      MOTION.lambda.disperse,
      dt,
    );
    disperse.current.halo = damp(
      disperse.current.halo,
      haloTarget,
      MOTION.lambda.disperse,
      dt,
    );
    coreMat.uniforms.uDisperse.value = disperse.current.core;
    latticeMat.uniforms.uDisperse.value = disperse.current.lattice;
    linkMat.uniforms.uDisperse.value = disperse.current.lattice;
    haloMat.uniforms.uDisperse.value = disperse.current.halo;

    // Fade the shell out once we are through it, so no stragglers hang around
    // behind the camera competing with About's content.
    const fade =
      1 - MOTION.easeInOutCubic(range(leg, FLIGHT.globeFade.start, FLIGHT.globeFade.end));
    coreMat.uniforms.uOpacity.value = baseOpacity.current.core * fade;
    latticeMat.uniforms.uOpacity.value = baseOpacity.current.lattice * fade;
    haloMat.uniforms.uOpacity.value = baseOpacity.current.halo * fade;

    // Links go early and on their own curve: a wireframe of hairlines survives
    // being stretched far less gracefully than a cloud of points does, and
    // structure failing before substance is the right reading anyway.
    linkMat.uniforms.uOpacity.value =
      baseOpacity.current.link *
      fade *
      MathUtils.clamp(1 - disperse.current.lattice * 1.6, 0, 1);

    // Spin-up: the shell whips as it opens, then the fade takes it away.
    const spinTarget = MathUtils.lerp(
      MOTION.speed.globeSpin,
      MOTION.speed.diveSpin,
      coreTarget,
    );
    spin.current = damp(spin.current, spinTarget, MOTION.lambda.rotation, dt);

    if (coreRef.current) coreRef.current.rotation.y += spin.current * dt;
    // The lattice and its links must share a transform exactly or the skeleton
    // slides inside its own points, so they take the same rotation value.
    const innerSpin = spin.current * 0.72 * dt;
    if (latticeRef.current) latticeRef.current.rotation.y += innerSpin;
    if (linkRef.current) linkRef.current.rotation.y += innerSpin;
    if (haloRef.current) {
      haloRef.current.rotation.y += MOTION.speed.haloSpin * dt - spin.current * 0.4 * dt;
      haloRef.current.rotation.x += MOTION.speed.haloSpin * 0.4 * dt;
    }

    // ── Pointer: parallax tilt, then repulsion ───────────────────────────
    // Tapers off during the dive: once you are inside the shell, leaning it
    // looks like a camera wobble.
    const authorityDive = 1 - coreTarget;
    const px = pointer ? pointer.current.x * pointer.current.active : 0;
    const py = pointer ? pointer.current.y * pointer.current.active : 0;

    const targetY = px * MOTION.speed.tilt * authorityDive;
    const targetX = -py * MOTION.speed.tilt * 0.6 * authorityDive;
    tilt.current.y = damp(tilt.current.y, targetY, MOTION.lambda.parallax, dt);
    tilt.current.x = damp(tilt.current.x, targetX, MOTION.lambda.parallax, dt);
    if (groupRef.current) {
      groupRef.current.rotation.y = tilt.current.y;
      groupRef.current.rotation.x = tilt.current.x;
    }

    /**
     * Hero-only gate. Hero is waypoint 0 and there is nothing before it, so
     * presence holds at 1 above the fold and tapers as About approaches;
     * multiplying by the dive authority kills the field the moment the shell
     * starts opening, when a cursor dent would just read as noise.
     */
    const heroAuthority =
      presenceHeld(flight.current.t, WAYPOINT.hero, { holdBefore: true }) *
      authorityDive;
    const live =
      !!pointer && pointer.current.active > 0 && heroAuthority > 0.02;

    if ((live || fieldAwake.current) && coreRef.current) {
      const attr = coreGeo.getAttribute("position") as BufferAttribute;
      const pos = attr.array as Float32Array;

      let hx = 0;
      let hy = 0;
      let hz = 0;
      if (live) {
        // One unproject per frame onto the plane the globe sits on, then one
        // matrix inverse to get it into the shell's own rotating space. The
        // alternative, raycasting the point cloud, would test every point
        // every frame to answer a question this does not even ask.
        pointerOnPlane(
          pointer.current.x,
          pointer.current.y,
          camera,
          groupRef.current ? groupRef.current.position.z : 0,
          hitWorld,
        );
        // R3F updates world matrices after the frame callbacks, so without this
        // the cursor would be tracking last frame's rotation of the shell.
        coreRef.current.updateWorldMatrix(true, false);
        hitLocal.copy(hitWorld);
        coreRef.current.worldToLocal(hitLocal);
        hx = hitLocal.x;
        hy = hitLocal.y;
        hz = hitLocal.z;
      }

      const R = radius * POINTER.radius;
      const r2 = R * R;
      const push = POINTER.strength * heroAuthority;
      // One exp() for the whole shell instead of one per component per point.
      // MathUtils.damp would be 3 × coreCount calls to the same transcendental
      // with identical arguments.
      const k = 1 - Math.exp(-POINTER.lambda * dt);

      let maxOff = 0;
      for (let i = 0; i < coreCount; i++) {
        const i3 = i * 3;
        const bx = coreBase[i3];
        const by = coreBase[i3 + 1];
        const bz = coreBase[i3 + 2];

        let tx = 0;
        let ty = 0;
        let tz = 0;

        if (live) {
          const dx = bx - hx;
          const dy = by - hy;
          const dz = bz - hz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 1e-4;
            // Quadratic falloff: no hard edge where the influence stops, which
            // is what would read as a visible circle cut into the shell.
            const fall = 1 - d / R;
            const amount = (fall * fall * push) / d;
            tx = dx * amount;
            ty = dy * amount;
            tz = dz * amount;
          }
        }

        const ox = (coreOffset[i3] += (tx - coreOffset[i3]) * k);
        const oy = (coreOffset[i3 + 1] += (ty - coreOffset[i3 + 1]) * k);
        const oz = (coreOffset[i3 + 2] += (tz - coreOffset[i3 + 2]) * k);

        pos[i3] = bx + ox;
        pos[i3 + 1] = by + oy;
        pos[i3 + 2] = bz + oz;

        const m = Math.abs(ox) + Math.abs(oy) + Math.abs(oz);
        if (m > maxOff) maxOff = m;
      }

      attr.needsUpdate = true;

      // Once the field has relaxed, snap exactly back to base and stop paying
      // for the loop at all. Damping approaches zero asymptotically and would
      // otherwise keep this running for the rest of the session.
      if (!live && maxOff <= POINTER.rest) {
        pos.set(coreBase);
        coreOffset.fill(0);
        attr.needsUpdate = true;
        fieldAwake.current = false;
      } else {
        fieldAwake.current = true;
      }
    }
  });

  // Shrink the globe on narrow viewports so it frames the copy instead of
  // swallowing it. viewport.width is in world units at z=0, not pixels.
  const scale = Math.min(1, Math.max(0.62, viewport.width / 7.2));

  return (
    <group ref={groupRef} scale={scale}>
      <points ref={coreRef} geometry={coreGeo}>
        <primitive object={coreMat} attach="material" />
      </points>
      <points ref={latticeRef} geometry={latticeGeo}>
        <primitive object={latticeMat} attach="material" />
      </points>
      <lineSegments ref={linkRef} geometry={linkGeo}>
        <primitive object={linkMat} attach="material" />
      </lineSegments>
      <points ref={haloRef} geometry={haloGeo}>
        <primitive object={haloMat} attach="material" />
      </points>
    </group>
  );
};
