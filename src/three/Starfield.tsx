/**
 * Starfield.tsx — the space on the other side of the globe.
 *
 * Without this, breaking through the shell delivers you into an empty black
 * page and the dive reads as "the graphic went away" rather than "we arrived
 * somewhere". It fades in from leg 0.34, so deep space is already visible
 * through the widening gaps in the shell before the camera reaches them —
 * that overlap is the whole trick.
 *
 * Stage 3 promoted it from a leg-1 destination to the ambient backdrop of the
 * entire corridor: once faded in, it stays, and it re-centres on the camera
 * every frame so the flight never outruns it. A fixed starfield at the origin
 * would be 100 units behind you by Contact, and deep space would simply run
 * out — the one artefact that would give away that the corridor is finite.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Points, ShaderMaterial } from "three";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  MathUtils,
  NormalBlending,
} from "three";
import { fibonacciSphere } from "./fibonacciSphere";
import { createParticleMaterial, parseAccent } from "./particleMaterial";
import { FLIGHT, MOTION, damp, range } from "./motion";
import { cameraZAt } from "./CameraRig";
import { handoffEnergy } from "./useMotif";
import type { FlightState } from "./useFlightProgress";
import type { MutableRefObject } from "react";

export interface StarfieldProps {
  accentRaw: string;
  isDark: boolean;
  count: number;
  flight: MutableRefObject<FlightState>;
  still?: boolean;
}

export const Starfield = ({
  accentRaw,
  isDark,
  count,
  flight,
  still = false,
}: StarfieldProps) => {
  const ref = useRef<Points>(null);
  const { invalidate } = useThree();
  const dpr = useThree((s) => s.gl.getPixelRatio());

  // A thick shell rather than a surface: radius 14 with 0.5 thickness spans
  // roughly 7–21 world units, so the camera ends up genuinely inside it.
  const geometry = useMemo(() => {
    const { positions, scales, phases } = fibonacciSphere({
      count,
      radius: 14,
      thickness: 0.5,
      scaleRange: [0.35, 1.2],
      seed: 424242,
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aScale", new BufferAttribute(scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    g.computeBoundingSphere();
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 62,
        opacity: 0,
        fadeNear: 7,
        fadeFar: 30,
        nearFade: 2.5,
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

  const peak = useRef(isDark ? 0.62 : 0.34);

  useEffect(() => {
    const mat = material as ShaderMaterial;
    mat.uniforms.uColor.value = parseAccent(accentRaw);
    mat.blending = isDark ? AdditiveBlending : NormalBlending;
    mat.uniforms.uTwinkle.value = still ? 0 : 1;
    mat.uniforms.uPixelRatio.value = dpr;
    mat.needsUpdate = true;
    // Light mode gets a much fainter field: teal specks on warm paper read as
    // dust at 0.62 and start competing with body copy.
    peak.current = isDark ? 0.62 : 0.34;
    invalidate();
  }, [accentRaw, isDark, still, dpr, material, invalidate]);

  const opacity = useRef(0);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);

    material.uniforms.uTime.value = state.clock.elapsedTime * MOTION.speed.twinkle * 0.6;
    // The backdrop is present for the entire flight, which makes it the one
    // surface that carries the shared seam energy from end to end.
    material.uniforms.uEnergy.value = handoffEnergy(flight.current.t);

    const t = Math.max(0, flight.current.t);
    // Ramps in across leg 1, then holds for the rest of the flight.
    const target =
      peak.current *
      MOTION.easeInOutCubic(
        range(MathUtils.clamp(t, 0, 1), FLIGHT.starfield.start, FLIGHT.starfield.end),
      );

    opacity.current = damp(opacity.current, target, MOTION.lambda.opacity, dt);
    material.uniforms.uOpacity.value = opacity.current;

    if (ref.current) {
      ref.current.rotation.y += MOTION.speed.starDrift * dt;
      // Travel with the camera. Not damped and not read from camera.position:
      // this must track the *target* z exactly, or the field lags the dolly and
      // the stars visibly slide sideways during the dive.
      ref.current.position.z = cameraZAt(t);
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <primitive object={material} attach="material" />
    </points>
  );
};
