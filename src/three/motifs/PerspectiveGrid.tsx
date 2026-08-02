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
 *
 * ── Graduation marks (stage 4) ──
 * The floor said "chronology" only by analogy. It now carries markers: a small
 * point on the centre line of every row, and every third row promoted with a
 * larger point, two flanking points and a short vertical tick. Which is what an
 * axis looks like — regular divisions with periodic emphasis — without a single
 * digit being drawn. A literal date would be the wrong register entirely; this
 * is a background, and the section's actual chronology is in the DOM.
 *
 * The markers are drawn with the *particle* material while the floor stays
 * lines, which is the connective thread doing its job: the same substance the
 * previous three sections were made of, arranged as a measure.
 *
 * ── Why the scroll period tripled ──
 * The modulo shift only stays invisible while every row is identical to the one
 * that replaces it. With emphasis on a 3-row cycle, the grid has to travel three
 * cells before it can snap back, so SCROLL_PERIOD is 3x what it was. The scroll
 * *speed* is unchanged — one cell every 14 seconds, exactly as before.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, ShaderMaterial } from "three";
import { BufferAttribute, BufferGeometry } from "three";
import { applyLineTheme, createLineMaterial } from "../lineMaterial";
import {
  applyParticleTheme,
  createParticleMaterial,
} from "../particleMaterial";
import { MOTION, damp, waypointZ } from "../motion";
import {
  PRESENCE_EPSILON,
  WAYPOINT,
  handoffEnergy,
  presenceAt,
  seamAfter,
  seamBefore,
} from "../useMotif";
import type { FlightState } from "../useFlightProgress";
import type { MutableRefObject } from "react";

export interface PerspectiveGridProps {
  accentRaw: string;
  isDark: boolean;
  flight: MutableRefObject<FlightState>;
  still?: boolean;
}

/** Ported from CONFIG.grid: 24 columns, 14s per cell. */
const COLUMNS = 24;
/**
 * Deeper than the original 11. The three-cell shift below would otherwise pull
 * the far edge close enough to be seen ending, and a horizon with a visible end
 * is not a horizon.
 */
const ROWS = 17;
const SPACING = 3.2;
/** Rows between emphasised divisions. Also the shift period, necessarily. */
const MARK_PERIOD = 3;
const SCROLL_PERIOD = 14 * MARK_PERIOD;
/** Below the corridor axis, so the camera flies over it. */
const FLOOR_Y = -5.5;
/** Lateral offset of the flanking marks, in cells. */
const FLANK = 2;
const TICK_HEIGHT = 0.7;

export const PerspectiveGrid = ({
  accentRaw,
  isDark,
  flight,
  still = false,
}: PerspectiveGridProps) => {
  const groupRef = useRef<Group>(null);
  const scrollRef = useRef<Group>(null);
  const { invalidate } = useThree();
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const halfW = (COLUMNS * SPACING) / 2;
  const depth = ROWS * SPACING;

  const geometry = useMemo(() => {
    const milestones: number[] = [];
    for (let r = 0; r <= ROWS; r++) if (r % MARK_PERIOD === 0) milestones.push(r);

    const segments =
      COLUMNS + 1 + ROWS + 1 + milestones.length * 3; // + one tick per mark
    const pos = new Float32Array(segments * 2 * 3);
    const alpha = new Float32Array(segments * 2);
    const phase = new Float32Array(segments * 2);
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
      // Emphasised divisions carry a touch more weight, the way a major
      // gridline on a chart does.
      const w = r % MARK_PERIOD === 0 ? 0.13 : 0.09;
      alpha[a++] = w;
      alpha[a++] = w;
    }

    // Vertical ticks at the emphasised divisions. Short: they should read as
    // graduations standing off the floor, not as posts.
    for (const r of milestones) {
      const z = -depth / 2 + r * SPACING;
      for (const x of [0, -FLANK * SPACING, FLANK * SPACING]) {
        pos[o++] = x; pos[o++] = 0; pos[o++] = z;
        pos[o++] = x; pos[o++] = TICK_HEIGHT; pos[o++] = z;
        const w = x === 0 ? 0.2 : 0.12;
        alpha[a++] = w;
        alpha[a++] = w * 0.15; // fades out along its own length
      }
    }

    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aAlpha", new BufferAttribute(alpha, 1));
    g.setAttribute("aPhase", new BufferAttribute(phase, 1));
    return g;
  }, [halfW, depth]);

  /**
   * The graduation points. One per row on the centre line; emphasised rows get
   * a larger one plus two flankers. Positions are kept separately from the
   * geometry because the seam into Contact moves them.
   */
  const marks = useMemo(() => {
    const xs: number[] = [];
    const zs: number[] = [];
    const sizes: number[] = [];
    for (let r = 0; r <= ROWS; r++) {
      const z = -depth / 2 + r * SPACING;
      const major = r % MARK_PERIOD === 0;
      xs.push(0);
      zs.push(z);
      sizes.push(major ? 1.7 : 0.8);
      if (major) {
        for (const x of [-FLANK * SPACING, FLANK * SPACING]) {
          xs.push(x);
          zs.push(z);
          sizes.push(0.55);
        }
      }
    }
    const count = xs.length;
    const base = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      base[i * 3] = xs[i];
      base[i * 3 + 1] = 0;
      base[i * 3 + 2] = zs[i];
      scales[i] = sizes[i];
      phases[i] = (i * 0.6180339887) % 1;
    }
    return { base, scales, phases, count };
  }, [depth]);

  const markGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(marks.base.slice(), 3));
    g.setAttribute("aScale", new BufferAttribute(marks.scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(marks.phases, 1));
    g.computeBoundingSphere();
    return g;
  }, [marks]);

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

  const markMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 18,
        opacity: 0,
        fadeNear: 6,
        fadeFar: 30,
        nearFade: 1.4,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      markGeo.dispose();
      material.dispose();
      markMat.dispose();
    },
    [geometry, markGeo, material, markMat],
  );

  const peak = useRef(1);
  useEffect(() => {
    applyLineTheme(material as ShaderMaterial, accentRaw, isDark);
    applyParticleTheme(markMat as ShaderMaterial, accentRaw, isDark);
    markMat.uniforms.uTwinkle.value = still ? 0 : 1;
    markMat.uniforms.uPixelRatio.value = dpr;
    // Single value for both themes — light mode's ink multiplier is on the
    // material now (uLightGain). Discounting here as well was cancelling it out.
    peak.current = 1;
    invalidate();
  }, [accentRaw, isDark, still, dpr, material, markMat, invalidate]);

  const opacity = useRef(0);
  /** Last gather value written to the marks, so static frames upload nothing. */
  const gatherLast = useRef(-1);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const t = flight.current.t;

    const presence = presenceAt(t, WAYPOINT.experience);
    const awake = presence > PRESENCE_EPSILON;
    if (groupRef.current) groupRef.current.visible = awake;
    if (!awake) {
      opacity.current = 0;
      material.uniforms.uOpacity.value = 0;
      markMat.uniforms.uOpacity.value = 0;
      return;
    }

    opacity.current = damp(
      opacity.current,
      peak.current * presence,
      MOTION.lambda.opacity,
      dt,
    );
    material.uniforms.uOpacity.value = opacity.current;

    const energy = handoffEnergy(t);
    material.uniforms.uEnergy.value = energy;
    markMat.uniforms.uEnergy.value = energy;
    markMat.uniforms.uTime.value = state.clock.elapsedTime * MOTION.speed.twinkle;

    // Arriving from the graph, the marks are still node-sized and hold a little
    // of the topology's brightness before settling into the floor's register.
    const fromGraph = seamBefore(t, WAYPOINT.experience);
    markMat.uniforms.uOpacity.value = opacity.current * (0.85 + 0.5 * fromGraph);

    // Leaving toward Contact, the marks lift off the floor and draw toward the
    // vanishing point — the measure starts gathering before the globe does.
    const gather = seamAfter(t, WAYPOINT.experience);
    if (Math.abs(gather - gatherLast.current) > 0.002) {
      const attr = markGeo.getAttribute("position") as BufferAttribute;
      const pos = attr.array as Float32Array;
      const far = -depth / 2;
      for (let i = 0; i < marks.count; i++) {
        const i3 = i * 3;
        const bx = marks.base[i3];
        const bz = marks.base[i3 + 2];
        pos[i3] = bx + (0 - bx) * gather * 0.6;
        // Toward the corridor axis, which is where Contact's globe assembles.
        pos[i3 + 1] = -FLOOR_Y * gather * 0.5;
        pos[i3 + 2] = bz + (far - bz) * gather * 0.35;
      }
      attr.needsUpdate = true;
      gatherLast.current = gather;
    }

    // Modulo shift: the grid slides MARK_PERIOD cells then snaps back, and
    // because the emphasis repeats on exactly that period the snap is invisible.
    // One float per frame, no buffer rewrite — the 2-D original rebuilt every
    // row every frame to do this.
    if (scrollRef.current) {
      const phase = (state.clock.elapsedTime / SCROLL_PERIOD) % 1;
      scrollRef.current.position.z = phase * SPACING * MARK_PERIOD;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, FLOOR_Y, waypointZ(WAYPOINT.experience)]}
      visible={false}
    >
      <group ref={scrollRef}>
        <lineSegments geometry={geometry} frustumCulled={false}>
          <primitive object={material} attach="material" />
        </lineSegments>
        <points geometry={markGeo} frustumCulled={false}>
          <primitive object={markMat} attach="material" />
        </points>
      </group>
    </group>
  );
};
