/**
 * ParticleGlobe.tsx — the hero globe, and the shell we fly through.
 *
 * Two shells, not one:
 *  · a dense surface shell that reads as the globe itself
 *  · a sparse halo at ~1.55x radius, counter-rotating, which gives real
 *    parallax as the camera moves and stops the silhouette from looking like
 *    a decal. It is also the shell that opens first during the dive.
 *
 * Stage 2 adds dispersal. The choreography lives in FLIGHT (motion.ts), the
 * displacement happens in the vertex shader, and this component only maps
 * scroll → uniforms. Nothing here re-renders React while scrolling: uniform
 * writes on a ref are the R3F-sanctioned way to animate.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { BufferGeometry, Group, Points, ShaderMaterial } from "three";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry as BG,
  MathUtils,
  NormalBlending,
} from "three";
import { fibonacciSphere, type ShellOptions } from "./fibonacciSphere";
import { createParticleMaterial, parseAccent } from "./particleMaterial";
import { FLIGHT, MOTION, damp, range } from "./motion";
import type { FlightState } from "./useFlightProgress";
import type { MutableRefObject } from "react";

const useShellGeometry = (opts: ShellOptions): BufferGeometry =>
  useMemo(() => {
    const { positions, scales, phases } = fibonacciSphere(opts);
    const g = new BG();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aScale", new BufferAttribute(scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    g.computeBoundingSphere();
    return g;
    // Counts/radii are stable per quality tier; rebuilding on every render
    // would thrash GPU buffers for no visual gain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.count, opts.radius, opts.thickness, opts.seed]);

export interface ParticleGlobeProps {
  accentRaw: string;
  isDark: boolean;
  /** Total budget across both shells; the halo takes ~28% of it. */
  particleCount: number;
  flight: MutableRefObject<FlightState>;
  radius?: number;
  /** Freezes spin, twinkle, dispersal and parallax for prefers-reduced-motion. */
  still?: boolean;
}

export const ParticleGlobe = ({
  accentRaw,
  isDark,
  particleCount,
  flight,
  radius = 2.05,
  still = false,
}: ParticleGlobeProps) => {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Points>(null);
  const haloRef = useRef<Points>(null);
  const { viewport, invalidate } = useThree();
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const haloCount = Math.round(particleCount * 0.28);
  const coreCount = particleCount - haloCount;

  const coreGeo = useShellGeometry({
    count: coreCount,
    radius,
    thickness: 0.05,
    seed: 20260801,
  });
  const haloGeo = useShellGeometry({
    count: haloCount,
    radius: radius * 1.55,
    thickness: 0.22,
    scaleRange: [0.4, 1.0],
    seed: 90210,
  });

  const coreMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 26,
        disperseDist: FLIGHT.disperse.distance,
        stagger: 0.5,
      }),
    // Theme is pushed through uniforms below, not by rebuilding the material.
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
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Theme-driven base opacity; the flight fade multiplies into it. */
  const baseOpacity = useRef({ core: 1, halo: 0.55 });

  useEffect(
    () => () => {
      coreGeo.dispose();
      haloGeo.dispose();
      coreMat.dispose();
      haloMat.dispose();
    },
    [coreGeo, haloGeo, coreMat, haloMat],
  );

  // Theme forwarding — imperative uniform writes, no canvas remount. Mirrors
  // the discipline the old Renderer.setTheme() had, which was worth keeping.
  useEffect(() => {
    const color = parseAccent(accentRaw);
    for (const mat of [coreMat, haloMat] as ShaderMaterial[]) {
      mat.uniforms.uColor.value = color;
      mat.blending = isDark ? AdditiveBlending : NormalBlending;
      mat.needsUpdate = true;
    }
    baseOpacity.current.core = isDark ? 1 : 0.85;
    baseOpacity.current.halo = isDark ? 0.55 : 0.4;
    coreMat.uniforms.uOpacity.value = baseOpacity.current.core;
    haloMat.uniforms.uOpacity.value = baseOpacity.current.halo;
    invalidate();
  }, [accentRaw, isDark, coreMat, haloMat, invalidate]);

  useEffect(() => {
    const v = still ? 0 : 1;
    for (const mat of [coreMat, haloMat]) {
      mat.uniforms.uTwinkle.value = v;
      mat.uniforms.uPixelRatio.value = dpr;
      if (still) mat.uniforms.uDisperse.value = 0;
    }
    invalidate();
  }, [still, dpr, coreMat, haloMat, invalidate]);

  const tilt = useRef({ x: 0, y: 0 });
  const spin = useRef<number>(MOTION.speed.globeSpin);
  const disperse = useRef({ core: 0, halo: 0 });

  useFrame((state, delta) => {
    if (still) return;
    // Clamped dt: a backgrounded tab must not teleport the simulation.
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;

    coreMat.uniforms.uTime.value = t * MOTION.speed.twinkle;
    haloMat.uniforms.uTime.value = t * MOTION.speed.twinkle * 0.8;

    // ── Leg 1 of the flight: hero → About ────────────────────────────────
    // Clamped, so scrolling deeper holds the end state rather than
    // extrapolating the shell into the next section's territory.
    const leg = MathUtils.clamp(flight.current.t, 0, 1);

    const coreTarget = MOTION.easeInOutCubic(
      range(leg, FLIGHT.disperse.start, FLIGHT.disperse.end),
    );
    const haloTarget = MOTION.easeInOutCubic(
      range(leg, FLIGHT.haloDisperse.start, FLIGHT.haloDisperse.end),
    );

    // Damping is what makes this survive a trackpad flick or a smooth-scrolled
    // nav jump — the raw scroll value can teleport, the shell never does.
    disperse.current.core = damp(
      disperse.current.core,
      coreTarget,
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
    haloMat.uniforms.uDisperse.value = disperse.current.halo;

    // Fade the shell out once we are through it, so no stragglers hang around
    // behind the camera competing with About's content.
    const fade =
      1 - MOTION.easeInOutCubic(range(leg, FLIGHT.globeFade.start, FLIGHT.globeFade.end));
    coreMat.uniforms.uOpacity.value = baseOpacity.current.core * fade;
    haloMat.uniforms.uOpacity.value = baseOpacity.current.halo * fade;

    // Spin-up: the shell whips as it opens, then the fade takes it away.
    const spinTarget = MathUtils.lerp(
      MOTION.speed.globeSpin,
      MOTION.speed.diveSpin,
      coreTarget,
    );
    spin.current = damp(spin.current, spinTarget, MOTION.lambda.rotation, dt);

    if (coreRef.current) coreRef.current.rotation.y += spin.current * dt;
    if (haloRef.current) {
      haloRef.current.rotation.y += MOTION.speed.haloSpin * dt - spin.current * 0.4 * dt;
      haloRef.current.rotation.x += MOTION.speed.haloSpin * 0.4 * dt;
    }

    // Pointer parallax: the globe leans toward the cursor. Damped, so it feels
    // like mass rather than a mouse-follow gimmick. Tapers off during the dive —
    // once you are inside the shell, leaning it looks like a camera wobble.
    const authority = 1 - coreTarget;
    const targetY = state.pointer.x * MOTION.speed.tilt * authority;
    const targetX = -state.pointer.y * MOTION.speed.tilt * 0.6 * authority;
    tilt.current.y = damp(tilt.current.y, targetY, MOTION.lambda.parallax, dt);
    tilt.current.x = damp(tilt.current.x, targetX, MOTION.lambda.parallax, dt);
    if (groupRef.current) {
      groupRef.current.rotation.y = tilt.current.y;
      groupRef.current.rotation.x = tilt.current.x;
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
      <points ref={haloRef} geometry={haloGeo}>
        <primitive object={haloMat} attach="material" />
      </points>
    </group>
  );
};
