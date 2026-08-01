/**
 * HexBelt.tsx — Projects (waypoint 2).
 *
 * The old `HexField` was "a handful of enormous, nearly invisible hexagon
 * outlines at different depths, rotating over minutes" — structure you register
 * subconsciously as *blocks* without ever competing with content. In 2-D
 * "different depths" was a fiction implemented as alpha. Here they are actually
 * at different depths and the camera flies through them, which is the payoff
 * the original was gesturing at.
 *
 * Consequence worth noting: the old alpha of 0.035 was calibrated for shapes
 * that never moved closer. A hexagon you pass *through* needs more presence or
 * it reads as a rendering artefact, so the base alpha is up while the depth
 * falloff does the work of keeping distant ones subliminal.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, LineSegments, ShaderMaterial } from "three";
import { BufferAttribute, BufferGeometry } from "three";
import { applyLineTheme, createLineMaterial } from "../lineMaterial";
import { createRandom, randRange } from "../systems/noise";
import { MOTION, damp, waypointZ } from "../motion";
import { PRESENCE_EPSILON, WAYPOINT, presenceAt } from "../useMotif";
import type { FlightState } from "../useFlightProgress";
import type { MutableRefObject } from "react";

export interface HexBeltProps {
  accentRaw: string;
  isDark: boolean;
  flight: MutableRefObject<FlightState>;
  /** Ported from CONFIG.hex.count. */
  count?: number;
  still?: boolean;
}

interface Hex {
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Seconds per full rotation — the original's 90–200s, unchanged. */
  spinPeriod: number;
  direction: 1 | -1;
  phase: number;
  depth: number;
}

const TAU = Math.PI * 2;

export const HexBelt = ({
  accentRaw,
  isDark,
  flight,
  count = 7,
  still = false,
}: HexBeltProps) => {
  const groupRef = useRef<Group>(null);
  const linesRef = useRef<LineSegments>(null);
  const { invalidate } = useThree();

  const hexes = useMemo<Hex[]>(() => {
    const rand = createRandom(60613);
    const out: Hex[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        // Spread along the corridor so they arrive one at a time rather than
        // as a single wall of wireframe.
        z: (i / Math.max(1, count - 1) - 0.5) * 22,
        x: (rand() - 0.5) * 9,
        y: (rand() - 0.5) * 6,
        radius: randRange(rand, 4.5, 11),
        spinPeriod: randRange(rand, 90, 200),
        direction: rand() > 0.5 ? 1 : -1,
        phase: rand() * TAU,
        depth: 0.4 + rand() * 0.6,
      });
    }
    return out;
  }, [count]);

  /**
   * One geometry for every hexagon. Six segments each, twelve vertices, built
   * once — the rotation happens per-hexagon on the CPU into a shared buffer,
   * because seven independent Object3Ds would be seven draw calls for what is
   * 84 vertices total.
   */
  const geometry = useMemo(() => {
    const verts = new Float32Array(count * 6 * 2 * 3);
    const alphas = new Float32Array(count * 6 * 2);
    let a = 0;
    for (const hex of hexes) {
      const base = 0.075 * hex.depth;
      for (let v = 0; v < 12; v++) alphas[a + v] = base;
      a += 12;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(verts, 3));
    g.setAttribute("aAlpha", new BufferAttribute(alphas, 1));
    return g;
  }, [count, hexes]);

  const material = useMemo(
    () =>
      createLineMaterial({
        accentRaw,
        isDark,
        opacity: 0,
        fadeNear: 10,
        fadeFar: 32,
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
    applyLineTheme(material as ShaderMaterial, accentRaw, isDark);
    peak.current = isDark ? 1 : 0.8;
    invalidate();
  }, [accentRaw, isDark, material, invalidate]);

  const opacity = useRef(0);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;

    const presence = presenceAt(flight.current.t, WAYPOINT.projects);
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

    // Rebuild the ring vertices. Spin periods are in minutes, so this is a
    // near-static buffer — but it is cheap enough not to warrant a cache.
    const attr = geometry.getAttribute("position") as BufferAttribute;
    const pos = attr.array as Float32Array;
    let o = 0;
    for (const hex of hexes) {
      const angle = hex.phase + hex.direction * (time / hex.spinPeriod) * TAU;
      for (let v = 0; v < 6; v++) {
        const a0 = angle + (v / 6) * TAU;
        const a1 = angle + ((v + 1) / 6) * TAU;
        pos[o++] = hex.x + Math.cos(a0) * hex.radius;
        pos[o++] = hex.y + Math.sin(a0) * hex.radius;
        pos[o++] = hex.z;
        pos[o++] = hex.x + Math.cos(a1) * hex.radius;
        pos[o++] = hex.y + Math.sin(a1) * hex.radius;
        pos[o++] = hex.z;
      }
    }
    attr.needsUpdate = true;

    if (linesRef.current) {
      linesRef.current.rotation.z += MOTION.speed.starDrift * dt;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, waypointZ(WAYPOINT.projects)]}
      visible={false}
    >
      <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false}>
        <primitive object={material} attach="material" />
      </lineSegments>
    </group>
  );
};
