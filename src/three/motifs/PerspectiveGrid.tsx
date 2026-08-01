/**
 * PerspectiveGrid.tsx — Experience (waypoint 4).
 *
 * `universe/Grid.ts` faked perspective on a 2-D canvas: 24 columns and 9 rows
 * drawn with hand-computed foreshortening, scrolling toward a painted horizon
 * over a 14-second period. That is the one motif in the old engine that was
 * purely a workaround for not having a camera — here it is just a plane, and
 * the projection matrix does the foreshortening for free.
 *
 * The scroll is implemented as a modulo shift of the whole grid rather than
 * per-row animation, so rows recycle seamlessly and the buffer is built once.
 * Timeline work reading as a receding floor of years is the point: it is the
 * only motif with a horizon, and Experience is the only section that is a
 * chronology.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, LineSegments, ShaderMaterial } from "three";
import { BufferAttribute, BufferGeometry } from "three";
import { applyLineTheme, createLineMaterial } from "../lineMaterial";
import { MOTION, damp, waypointZ } from "../motion";
import { PRESENCE_EPSILON, WAYPOINT, presenceAt } from "../useMotif";
import type { FlightState } from "../useFlightProgress";
import type { MutableRefObject } from "react";

export interface PerspectiveGridProps {
  accentRaw: string;
  isDark: boolean;
  flight: MutableRefObject<FlightState>;
  still?: boolean;
}

/** Ported from CONFIG.grid: 24 columns, 9 rows, 14s scroll period. */
const COLUMNS = 24;
const ROWS = 11;
const SPACING = 3.2;
const SCROLL_PERIOD = 14;
/** Below the corridor axis, so the camera flies over it. */
const FLOOR_Y = -5.5;

export const PerspectiveGrid = ({
  accentRaw,
  isDark,
  flight,
  still = false,
}: PerspectiveGridProps) => {
  const groupRef = useRef<Group>(null);
  const gridRef = useRef<LineSegments>(null);
  const { invalidate } = useThree();

  const geometry = useMemo(() => {
    const halfW = (COLUMNS * SPACING) / 2;
    const depth = ROWS * SPACING;

    const segments = COLUMNS + 1 + ROWS + 1;
    const pos = new Float32Array(segments * 2 * 3);
    const alpha = new Float32Array(segments * 2);
    let o = 0;
    let a = 0;

    // Longitudinal lines (running away from the camera).
    for (let c = 0; c <= COLUMNS; c++) {
      const x = -halfW + c * SPACING;
      pos[o++] = x; pos[o++] = 0; pos[o++] = -depth / 2;
      pos[o++] = x; pos[o++] = 0; pos[o++] = depth / 2;
      // Centre lines slightly brighter — gives the floor a spine to read along.
      const centreBias = 1 - Math.abs(c / COLUMNS - 0.5) * 1.2;
      alpha[a++] = 0.05 + centreBias * 0.05;
      alpha[a++] = 0.05 + centreBias * 0.05;
    }

    // Lateral lines (the ones that appear to scroll).
    for (let r = 0; r <= ROWS; r++) {
      const z = -depth / 2 + r * SPACING;
      pos[o++] = -halfW; pos[o++] = 0; pos[o++] = z;
      pos[o++] = halfW; pos[o++] = 0; pos[o++] = z;
      alpha[a++] = 0.09;
      alpha[a++] = 0.09;
    }

    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aAlpha", new BufferAttribute(alpha, 1));
    return g;
  }, []);

  const material = useMemo(
    () =>
      createLineMaterial({
        accentRaw,
        isDark,
        opacity: 0,
        fadeNear: 6,
        fadeFar: 30,
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
    peak.current = isDark ? 1 : 0.85;
    invalidate();
  }, [accentRaw, isDark, material, invalidate]);

  const opacity = useRef(0);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);

    const presence = presenceAt(flight.current.t, WAYPOINT.experience);
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

    // Modulo shift: the grid slides one cell then snaps back, and because every
    // cell is identical the snap is invisible. One float per frame, no buffer
    // rewrite — the 2-D original rebuilt every row every frame to do this.
    if (gridRef.current) {
      const phase = (state.clock.elapsedTime / SCROLL_PERIOD) % 1;
      gridRef.current.position.z = phase * SPACING;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, FLOOR_Y, waypointZ(WAYPOINT.experience)]}
      visible={false}
    >
      <lineSegments ref={gridRef} geometry={geometry} frustumCulled={false}>
        <primitive object={material} attach="material" />
      </lineSegments>
    </group>
  );
};
