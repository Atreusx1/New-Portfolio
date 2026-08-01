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
import { createParticleMaterial, parseAccent } from "../particleMaterial";
import { FlowField3 } from "../systems/flowField";
import { createRandom } from "../systems/noise";
import { MOTION, damp, waypointZ } from "../motion";
import { PRESENCE_EPSILON, WAYPOINT, presenceAt } from "../useMotif";
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
    if (bs) bs.radius += AMPLITUDE * 2;
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
    mat.uniforms.uColor.value = parseAccent(accentRaw);
    mat.blending = isDark ? AdditiveBlending : NormalBlending;
    mat.uniforms.uTwinkle.value = still ? 0 : 1;
    mat.uniforms.uPixelRatio.value = dpr;
    mat.needsUpdate = true;
    peak.current = isDark ? 0.85 : 0.6;
    invalidate();
  }, [accentRaw, isDark, still, dpr, material, invalidate]);

  const opacity = useRef(0);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;

    const presence = presenceAt(flight.current.t, WAYPOINT.about);
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

    const attr = geometry.getAttribute("position") as BufferAttribute;
    const pos = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const hx = homes[i3];
      const hy = homes[i3 + 1];
      const hz = homes[i3 + 2];
      const f = field.sample(hx, hy, hz, time);
      pos[i3] = hx + f.x * AMPLITUDE;
      pos[i3 + 1] = hy + f.y * AMPLITUDE;
      pos[i3 + 2] = hz + f.z * AMPLITUDE;
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
