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
 *
 * ── Facets (stage 4) ──
 * A hexagon you fly through is only a block for as long as it takes to notice
 * that every one of them is the same hexagon. Each now carries its own
 * secondary structure: a concentric inner ring at its own scale and counter
 * rotation, a subset of spokes bridging the two rings, and a slight tilt out of
 * the belt's plane so no two present the same silhouette as you pass. All of it
 * is seeded, so the belt is the same belt on every reload.
 *
 * ── Seams ──
 * Two, one at each end, and they are the reason this motif is not just a
 * different shape between two particle fields:
 *  · **arriving from FlowDrift**, the vertices wobble off-radius and settle,
 *    so the blocks condense out of the drift rather than switching on.
 *  · **leaving toward NetworkGraph**, chords fade in across each hexagon.
 *    A hexagon with its diagonals drawn is a graph, which is exactly the claim
 *    Skills is about to make — the blocks become a topology.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, LineSegments, ShaderMaterial } from "three";
import { BufferAttribute, BufferGeometry } from "three";
import { applyLineTheme, createLineMaterial } from "../lineMaterial";
import { createRandom, randRange } from "../systems/noise";
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
  /** Inner ring as a fraction of the outer radius. */
  innerScale: number;
  /** Its own phase and rotation sense, so the two rings visibly shear. */
  innerPhase: number;
  innerDir: 1 | -1;
  innerAlpha: number;
  /** Which of the six vertices carry a spoke to the inner ring. */
  spokes: boolean[];
  spokeAlpha: number;
  /** Small tilt out of the belt plane. cos/sin cached — this runs per frame. */
  cosTiltX: number;
  sinTiltX: number;
  cosTiltY: number;
  sinTiltY: number;
}

const TAU = Math.PI * 2;

/**
 * Segment budget per hexagon, in fixed slots so the buffer is allocated once:
 * 6 outer edges, 6 inner edges, 6 possible spokes, 3 chords. Unused spokes are
 * written as degenerate segments with zero alpha, which costs a few vertices
 * and saves a per-frame index rebuild.
 */
const SEG_OUTER = 6;
const SEG_INNER = 6;
const SEG_SPOKE = 6;
const SEG_CHORD = 3;
const SEG_PER_HEX = SEG_OUTER + SEG_INNER + SEG_SPOKE + SEG_CHORD;

/** Peak alpha the chords reach at the midpoint of the seam into Skills. */
const CHORD_ALPHA = 0.09;
/** How far off-radius a vertex wanders while the blocks are still condensing. */
const CONDENSE = 0.22;

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
      const spokes: boolean[] = [];
      // Two to four spokes, never all six: a fully spoked hexagon reads as a
      // wheel, and a wheel is a different object than a block.
      const wanted = 2 + Math.floor(rand() * 3);
      const start = Math.floor(rand() * 6);
      for (let v = 0; v < 6; v++) spokes.push(false);
      for (let k = 0; k < wanted; k++) spokes[(start + k * 2) % 6] = true;

      const tiltX = randRange(rand, -0.22, 0.22);
      const tiltY = randRange(rand, -0.22, 0.22);

      out.push({
        // Spread along the corridor so they arrive one at a time rather than
        // as a single wall of wireframe.
        z: (i / Math.max(1, count - 1) - 0.5) * 26,
        x: (rand() - 0.5) * 9,
        y: (rand() - 0.5) * 6,
        radius: randRange(rand, 4.5, 11),
        spinPeriod: randRange(rand, 90, 200),
        direction: rand() > 0.5 ? 1 : -1,
        phase: rand() * TAU,
        depth: 0.4 + rand() * 0.6,
        innerScale: randRange(rand, 0.42, 0.74),
        innerPhase: rand() * TAU,
        innerDir: rand() > 0.5 ? 1 : -1,
        innerAlpha: randRange(rand, 0.45, 0.9),
        spokes,
        spokeAlpha: randRange(rand, 0.3, 0.6),
        cosTiltX: Math.cos(tiltX),
        sinTiltX: Math.sin(tiltX),
        cosTiltY: Math.cos(tiltY),
        sinTiltY: Math.sin(tiltY),
      });
    }
    return out;
  }, [count]);

  /**
   * One geometry for every hexagon. The rotation happens per-hexagon on the CPU
   * into a shared buffer, because eleven independent Object3Ds would be eleven
   * draw calls for what is a few hundred vertices in total.
   */
  const geometry = useMemo(() => {
    const verts = new Float32Array(count * SEG_PER_HEX * 2 * 3);
    const alphas = new Float32Array(count * SEG_PER_HEX * 2);
    // Dispersal is unused here, but the attribute keeps this geometry
    // compatible with the shared line material's full vertex contract.
    const phases = new Float32Array(count * SEG_PER_HEX * 2);

    let a = 0;
    hexes.forEach((hex, h) => {
      const base = 0.075 * hex.depth;
      for (let s = 0; s < SEG_PER_HEX; s++) {
        let alpha: number;
        if (s < SEG_OUTER) alpha = base;
        else if (s < SEG_OUTER + SEG_INNER) alpha = base * hex.innerAlpha;
        else if (s < SEG_OUTER + SEG_INNER + SEG_SPOKE) {
          alpha = hex.spokes[s - SEG_OUTER - SEG_INNER]
            ? base * hex.spokeAlpha
            : 0;
        } else {
          alpha = 0; // chords: written per frame from the seam
        }
        alphas[a] = alpha;
        alphas[a + 1] = alpha;
        phases[a] = h / Math.max(1, count);
        phases[a + 1] = h / Math.max(1, count);
        a += 2;
      }
    });

    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(verts, 3));
    g.setAttribute("aAlpha", new BufferAttribute(alphas, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
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
  /** Last chord alpha written, so the alpha buffer only uploads when it moves. */
  const chordLast = useRef(-1);

  /**
   * One hexagon's two rings, resolved. Hoisted out of the frame loop: six small
   * arrays allocated sixty times a second is exactly the GC sawtooth the packet
   * pool was built to avoid, and it would be embarrassing to reintroduce it
   * here for the sake of six local variables.
   */
  const ring = useMemo(
    () => ({
      ox: new Float64Array(6),
      oy: new Float64Array(6),
      oz: new Float64Array(6),
      ix: new Float64Array(6),
      iy: new Float64Array(6),
      iz: new Float64Array(6),
    }),
    [],
  );

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    const t = flight.current.t;

    const presence = presenceAt(t, WAYPOINT.projects);
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
    material.uniforms.uEnergy.value = handoffEnergy(t);

    // Arriving: the blocks are still condensing out of FlowDrift.
    const condense = seamBefore(t, WAYPOINT.projects) * CONDENSE;
    // Leaving: the diagonals come in, and a hexagon becomes a graph.
    const chord = seamAfter(t, WAYPOINT.projects) * CHORD_ALPHA;

    // Rebuild the ring vertices. Spin periods are in minutes, so this is a
    // near-static buffer — but it is cheap enough not to warrant a cache.
    const attr = geometry.getAttribute("position") as BufferAttribute;
    const pos = attr.array as Float32Array;

    // Spokes and chords reuse the vertices the rings already computed rather
    // than recomputing the same trigonometry three times.
    const { ox, oy, oz, ix, iy, iz } = ring;

    let o = 0;
    for (const hex of hexes) {
      const angle = hex.phase + hex.direction * (time / hex.spinPeriod) * TAU;
      const innerAngle =
        hex.innerPhase + hex.innerDir * (time / (hex.spinPeriod * 0.62)) * TAU;
      const innerR = hex.radius * hex.innerScale;

      for (let v = 0; v < 6; v++) {
        // While condensing, each vertex breathes off its true radius on its own
        // phase — the outline is still finding its shape.
        const wob =
          condense > 0
            ? 1 + condense * Math.sin(hex.phase + v * 2.7 + time * 0.6)
            : 1;

        const ao = angle + (v / 6) * TAU;
        const uo = Math.cos(ao) * hex.radius * wob;
        const vo = Math.sin(ao) * hex.radius * wob;
        // Tilt out of the belt plane: rotate about x, then about y.
        const y1o = vo * hex.cosTiltX;
        const z1o = vo * hex.sinTiltX;
        ox[v] = hex.x + uo * hex.cosTiltY + z1o * hex.sinTiltY;
        oy[v] = hex.y + y1o;
        oz[v] = hex.z - uo * hex.sinTiltY + z1o * hex.cosTiltY;

        const ai = innerAngle + (v / 6) * TAU;
        const ui = Math.cos(ai) * innerR * wob;
        const vi = Math.sin(ai) * innerR * wob;
        const y1i = vi * hex.cosTiltX;
        const z1i = vi * hex.sinTiltX;
        ix[v] = hex.x + ui * hex.cosTiltY + z1i * hex.sinTiltY;
        iy[v] = hex.y + y1i;
        iz[v] = hex.z - ui * hex.sinTiltY + z1i * hex.cosTiltY;
      }

      // Outer ring
      for (let v = 0; v < 6; v++) {
        const w = (v + 1) % 6;
        pos[o++] = ox[v]; pos[o++] = oy[v]; pos[o++] = oz[v];
        pos[o++] = ox[w]; pos[o++] = oy[w]; pos[o++] = oz[w];
      }
      // Inner ring
      for (let v = 0; v < 6; v++) {
        const w = (v + 1) % 6;
        pos[o++] = ix[v]; pos[o++] = iy[v]; pos[o++] = iz[v];
        pos[o++] = ix[w]; pos[o++] = iy[w]; pos[o++] = iz[w];
      }
      // Spokes — unused slots collapse to a point and carry zero alpha.
      for (let v = 0; v < 6; v++) {
        if (hex.spokes[v]) {
          pos[o++] = ox[v]; pos[o++] = oy[v]; pos[o++] = oz[v];
          pos[o++] = ix[v]; pos[o++] = iy[v]; pos[o++] = iz[v];
        } else {
          pos[o++] = ox[v]; pos[o++] = oy[v]; pos[o++] = oz[v];
          pos[o++] = ox[v]; pos[o++] = oy[v]; pos[o++] = oz[v];
        }
      }
      // Chords: every other long diagonal, so the figure reads as a lattice
      // rather than as a filled star.
      for (let c = 0; c < SEG_CHORD; c++) {
        const v = c * 2;
        const w = (v + 2) % 6;
        pos[o++] = ox[v]; pos[o++] = oy[v]; pos[o++] = oz[v];
        pos[o++] = ox[w]; pos[o++] = oy[w]; pos[o++] = oz[w];
      }
    }
    attr.needsUpdate = true;

    // Chord alpha only touches the GPU when it has actually changed, which for
    // most of this motif's life is never.
    if (Math.abs(chord - chordLast.current) > 0.0015) {
      const aAttr = geometry.getAttribute("aAlpha") as BufferAttribute;
      const alphas = aAttr.array as Float32Array;
      const chordStart = SEG_OUTER + SEG_INNER + SEG_SPOKE;
      for (let h = 0; h < hexes.length; h++) {
        const base = (h * SEG_PER_HEX + chordStart) * 2;
        const a = chord * hexes[h].depth;
        for (let k = 0; k < SEG_CHORD * 2; k++) alphas[base + k] = a;
      }
      aAttr.needsUpdate = true;
      chordLast.current = chord;
    }

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
