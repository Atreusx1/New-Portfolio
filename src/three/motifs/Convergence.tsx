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
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Points, ShaderMaterial } from "three";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
} from "three";
import { fibonacciSphere } from "../fibonacciSphere";
import { createParticleMaterial, parseAccent } from "../particleMaterial";
import { MOTION, damp, waypointZ } from "../motion";
import { PRESENCE_EPSILON, WAYPOINT, presenceHeld } from "../useMotif";
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

export const Convergence = ({
  accentRaw,
  isDark,
  count,
  flight,
  still = false,
}: ConvergenceProps) => {
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const { invalidate } = useThree();
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const geometry = useMemo(() => {
    const { positions, scales, phases } = fibonacciSphere({
      count,
      radius: RADIUS,
      thickness: 0.08,
      seed: 777001,
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
        size: 28,
        opacity: 0,
        fadeNear: 6,
        fadeFar: 28,
        disperseDist: SCATTER,
        // Wider stagger than the hero shell: particles trickling in over a
        // longer window reads as gathering, whereas a tight window reads as
        // an implosion, which is the wrong emotional note for "get in touch".
        stagger: 0.62,
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

  const peak = useRef(1);
  useEffect(() => {
    const mat = material as ShaderMaterial;
    mat.uniforms.uColor.value = parseAccent(accentRaw);
    mat.blending = isDark ? AdditiveBlending : NormalBlending;
    mat.uniforms.uTwinkle.value = still ? 0 : 1;
    mat.uniforms.uPixelRatio.value = dpr;
    mat.needsUpdate = true;
    peak.current = isDark ? 1 : 0.85;
    invalidate();
  }, [accentRaw, isDark, still, dpr, material, invalidate]);

  const opacity = useRef(0);
  const gather = useRef(1);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);

    // holdAfter: Contact is the end of the document. Scrolling to the very
    // bottom must not fade the globe back out into nothing.
    const presence = presenceHeld(flight.current.t, WAYPOINT.contact, {
      holdAfter: true,
      reach: 1.05,
    });
    const awake = presence > PRESENCE_EPSILON;
    if (groupRef.current) groupRef.current.visible = awake;
    if (!awake) {
      opacity.current = 0;
      material.uniforms.uOpacity.value = 0;
      return;
    }

    opacity.current = damp(
      opacity.current,
      peak.current * presence,
      MOTION.lambda.opacity,
      dt,
    );
    material.uniforms.uOpacity.value = opacity.current;
    material.uniforms.uTime.value = state.clock.elapsedTime * MOTION.speed.twinkle;

    // The stage 2 dispersal, run in reverse.
    gather.current = damp(gather.current, 1 - presence, MOTION.lambda.disperse, dt);
    material.uniforms.uDisperse.value = gather.current;

    if (pointsRef.current) {
      pointsRef.current.rotation.y += MOTION.speed.globeSpin * dt;
    }
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
    </group>
  );
};
