/**
 * NetworkGraph.tsx — Skills (waypoint 3).
 *
 * The richest motif, and the one the old engine was really built around:
 * a live blockchain topology with routed transactions and consensus waves.
 * All of that logic is ported intact in `systems/graph.ts` and
 * `systems/packets.ts`; this file is only the rendering surface.
 *
 * Three draw calls total — nodes, edges, packets — regardless of how many
 * nodes, edges and packets exist. Anything per-entity would put hundreds of
 * Object3Ds in the scene graph and spend the whole frame budget on traversal.
 *
 * ── A note on how glow is encoded ──
 * The particle shader carries no per-point alpha attribute, only per-point
 * *size*. Under additive blending a larger point deposits more energy in the
 * same place, so size doubles as brightness. Ripple glow and the validator
 * heartbeat are therefore both encoded as size — which is also how the
 * original drew them (it grew the node radius), so the look carries over.
 *
 * ── Stage 4: the consensus wave becomes visible ──
 * The ripple was already travelling the real topology hop by hop, but only the
 * *nodes* showed it, so what the eye actually saw was scattered dots blinking
 * in a suggestive order. Edges now read their endpoints' glow too, which is a
 * one-array change and turns the same simulation into a wavefront you can watch
 * cross the graph. This is the richest motif and Skills is the centre of the
 * flight; it should be the thing worth stopping for.
 *
 * ── Seams ──
 *  · **arriving from HexBelt**, the edge base alpha is pulled down toward the
 *    hex belt's own hairline register, so during the overlap the graph's edges
 *    and the hexagons' outlines are drawn in the same weight of line. The graph
 *    then brightens into its own register as the seam closes.
 *  · **leaving toward PerspectiveGrid**, nodes stratify toward flat horizontal
 *    layers and their drift quietens. A volume resolving into layers is the
 *    grid's floor beginning to assert itself while the topology is still here.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, ShaderMaterial } from "three";
import { BufferAttribute, BufferGeometry } from "three";
import {
  applyParticleTheme,
  createParticleMaterial,
} from "../particleMaterial";
import { applyLineTheme, createLineMaterial } from "../lineMaterial";
import { GRAPH_CONFIG, NetworkTopology } from "../systems/graph";
import { PACKET_CONFIG, PacketRouter } from "../systems/packets";
import { FlowField3 } from "../systems/flowField";
import { MOTION, damp, waypointZ } from "../motion";
import {
  HANDOFF,
  PRESENCE_EPSILON,
  WAYPOINT,
  handoffEnergy,
  presenceAt,
  seamAfter,
  seamBefore,
} from "../useMotif";
import type { FlightState } from "../useFlightProgress";
import type { MutableRefObject } from "react";

export interface NetworkGraphProps {
  accentRaw: string;
  isDark: boolean;
  /** Node count. The old engine derived this from viewport area; tiers now do. */
  nodeCount: number;
  flight: MutableRefObject<FlightState>;
  still?: boolean;
}

const BOUNDS = { width: 30, height: 18, depth: 20 };
const EDGE_BASE_ALPHA = 0.16;
const EDGE_LIT_ALPHA = 0.85;
/**
 * HexBelt's own base alpha. Named here rather than imported so the two motifs
 * stay independent modules; the point is that during the overlap they are
 * drawn in the same register, not that one owns the other's constant.
 */
const HEX_REGISTER = 0.075;
/** How much of an endpoint's ripple glow an edge inherits. */
const EDGE_WAVE = 0.55;
/** Spacing of the layers the graph stratifies toward on its way to the grid. */
const STRATA_STEP = 3;

export const NetworkGraph = ({
  accentRaw,
  isDark,
  nodeCount,
  flight,
  still = false,
}: NetworkGraphProps) => {
  const groupRef = useRef<Group>(null);
  const { invalidate } = useThree();
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const topology = useMemo(
    () => new NetworkTopology(41171, nodeCount, BOUNDS),
    [nodeCount],
  );

  const router = useMemo(
    () =>
      new PacketRouter(topology, 90210, (validatorId, time) => {
        topology.triggerRipple(validatorId, time);
      }),
    [topology],
  );

  const field = useMemo(() => new FlowField3(1204, { cellSize: 8 }), []);

  // ── Geometry ───────────────────────────────────────────────────────────────

  const nodeGeo = useMemo(() => {
    const n = topology.nodes.length;
    const pos = new Float32Array(n * 3);
    const scales = new Float32Array(n);
    const phases = new Float32Array(n);
    topology.nodes.forEach((node, i) => {
      pos[i * 3] = node.homeX;
      pos[i * 3 + 1] = node.homeY;
      pos[i * 3 + 2] = node.homeZ;
      scales[i] = node.size;
      phases[i] = node.phase / (Math.PI * 2);
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aScale", new BufferAttribute(scales, 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    return g;
  }, [topology]);

  const edgeGeo = useMemo(() => {
    const e = topology.edges.length;
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(e * 6), 3));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(e * 2), 1));
    return g;
  }, [topology]);

  /** Packets and their trails share one buffer: head point + N trail points. */
  const packetGeo = useMemo(() => {
    const per = 1 + PACKET_CONFIG.trailLength;
    const total = PACKET_CONFIG.poolSize * per;
    const phases = new Float32Array(total);
    // Golden-ratio stride: every slot lands on a different twinkle phase, so a
    // trail shimmers along its length instead of pulsing as one rigid object.
    for (let i = 0; i < total; i++) phases[i] = (i * 0.6180339887) % 1;

    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(total * 3), 3));
    // aScale doubles as visibility: 0 means the point is not rasterised at all,
    // which is how dead packets and unfilled trail slots disappear.
    g.setAttribute("aScale", new BufferAttribute(new Float32Array(total), 1));
    g.setAttribute("aPhase", new BufferAttribute(phases, 1));
    return g;
  }, []);

  /**
   * One glow sample per node per frame, so the edge pass can read what the node
   * pass already computed instead of calling rippleGlow twice per edge — which
   * at 320 nodes and ~560 edges would be over a thousand redundant exp() calls
   * a frame.
   */
  const nodeGlow = useMemo(
    () => new Float32Array(topology.nodes.length),
    [topology],
  );

  // ── Materials ──────────────────────────────────────────────────────────────

  const nodeMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 13,
        opacity: 0,
        fadeNear: 8,
        fadeFar: 30,
        nearFade: 1.4,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const edgeMat = useMemo(
    () => createLineMaterial({ accentRaw, isDark, opacity: 0, fadeNear: 9, fadeFar: 30 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const packetMat = useMemo(
    () =>
      createParticleMaterial({
        accentRaw,
        isDark,
        pixelRatio: dpr,
        size: 20,
        opacity: 0,
        fadeNear: 8,
        fadeFar: 30,
        nearFade: 1.4,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(
    () => () => {
      nodeGeo.dispose();
      edgeGeo.dispose();
      packetGeo.dispose();
      nodeMat.dispose();
      edgeMat.dispose();
      packetMat.dispose();
    },
    [nodeGeo, edgeGeo, packetGeo, nodeMat, edgeMat, packetMat],
  );

  const peak = useRef(1);
  useEffect(() => {
    for (const m of [nodeMat, packetMat] as ShaderMaterial[]) {
      applyParticleTheme(m, accentRaw, isDark);
      m.uniforms.uTwinkle.value = still ? 0 : 1;
      m.uniforms.uPixelRatio.value = dpr;
    }
    applyLineTheme(edgeMat as ShaderMaterial, accentRaw, isDark);
    peak.current = isDark ? 1 : 0.75;
    invalidate();
  }, [accentRaw, isDark, still, dpr, nodeMat, packetMat, edgeMat, invalidate]);

  const opacity = useRef(0);

  useFrame((state, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;

    const t = flight.current.t;
    const presence = presenceAt(t, WAYPOINT.skills);
    const awake = presence > PRESENCE_EPSILON;
    if (groupRef.current) groupRef.current.visible = awake;
    if (!awake) {
      opacity.current = 0;
      nodeMat.uniforms.uOpacity.value = 0;
      edgeMat.uniforms.uOpacity.value = 0;
      packetMat.uniforms.uOpacity.value = 0;
      return; // asleep: topology frozen, router idle, no uploads
    }

    opacity.current = damp(
      opacity.current,
      peak.current * presence,
      MOTION.lambda.opacity,
      dt,
    );
    nodeMat.uniforms.uOpacity.value = opacity.current;
    edgeMat.uniforms.uOpacity.value = opacity.current;
    packetMat.uniforms.uOpacity.value = opacity.current;
    nodeMat.uniforms.uTime.value = time * MOTION.speed.twinkle;
    packetMat.uniforms.uTime.value = time * MOTION.speed.twinkle;

    const energy = handoffEnergy(t);
    nodeMat.uniforms.uEnergy.value = energy;
    edgeMat.uniforms.uEnergy.value = energy;
    packetMat.uniforms.uEnergy.value = energy;

    // Arriving from the hexagons, leaving toward the grid floor.
    const fromHex = seamBefore(t, WAYPOINT.skills);
    const toGrid = seamAfter(t, WAYPOINT.skills);
    const strata = toGrid * HANDOFF.strata;

    // ── Nodes: home + flow drift, then ripple/breathe into size ─────────────
    const nodes = topology.nodes;
    const nAttr = nodeGeo.getAttribute("position") as BufferAttribute;
    const nPos = nAttr.array as Float32Array;
    const sAttr = nodeGeo.getAttribute("aScale") as BufferAttribute;
    const nScale = sAttr.array as Float32Array;

    // Drift quietens as the layers assert themselves — a volume that is
    // settling should not also be breathing at full amplitude.
    const driftAmp = GRAPH_CONFIG.driftAmplitude * (1 - 0.6 * toGrid);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const f = field.sample(node.homeX, node.homeY, node.homeZ, time);
      node.x = node.homeX + f.x * driftAmp;
      node.y = node.homeY + f.y * driftAmp;
      node.z = node.homeZ + f.z * driftAmp;

      // Stratify toward flat layers on the way out. Only y, and only partly:
      // the graph should look like it is settling, not like it has already
      // become the grid.
      if (strata > 0) {
        const level = Math.round(node.y / STRATA_STEP) * STRATA_STEP;
        node.y += (level - node.y) * strata;
      }

      const i3 = i * 3;
      nPos[i3] = node.x;
      nPos[i3 + 1] = node.y;
      nPos[i3 + 2] = node.z;

      // Validators breathe; every node swells as the consensus wave passes.
      const breathe =
        node.kind === "validator"
          ? 1 +
            Math.sin(
              (time / GRAPH_CONFIG.breathePeriod) * Math.PI * 2 + node.phase,
            ) *
              GRAPH_CONFIG.breatheAmount
          : 1;
      const glow = node.rippleGlow(time) * GRAPH_CONFIG.ripple.intensity;
      nodeGlow[i] = glow;
      nScale[i] = node.size * breathe * (1 + glow * 1.8);
    }
    nAttr.needsUpdate = true;
    sAttr.needsUpdate = true;

    // ── Packets: route, integrate, light edges ──────────────────────────────
    router.update(dt, time, presence);

    // ── Edges: follow their endpoints, brighten while lit ───────────────────
    const edges = topology.edges;
    const eAttr = edgeGeo.getAttribute("position") as BufferAttribute;
    const ePos = eAttr.array as Float32Array;
    const eaAttr = edgeGeo.getAttribute("aAlpha") as BufferAttribute;
    const eAlpha = eaAttr.array as Float32Array;

    // During the overlap with HexBelt the graph draws in the belt's hairline
    // register, so the two motifs share a line weight while both are on screen.
    const restAlpha = EDGE_BASE_ALPHA + (HEX_REGISTER - EDGE_BASE_ALPHA) * fromHex;

    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const a = nodes[e.a];
      const b = nodes[e.b];
      const o = i * 6;
      ePos[o] = a.x;
      ePos[o + 1] = a.y;
      ePos[o + 2] = a.z;
      ePos[o + 3] = b.x;
      ePos[o + 4] = b.y;
      ePos[o + 5] = b.z;

      // An edge inherits the brighter of its endpoints' ripple glow, so the
      // consensus wave travels the wiring and not just the nodes. The packet
      // lighting still wins outright — a transaction crossing an edge is a
      // stronger statement than a wavefront passing over it.
      const ga = nodeGlow[e.a];
      const gb = nodeGlow[e.b];
      const wave = (ga > gb ? ga : gb) * EDGE_WAVE;
      const lit = e.litUntil > time ? EDGE_LIT_ALPHA : restAlpha + wave;
      eAlpha[i * 2] = lit;
      eAlpha[i * 2 + 1] = lit;
    }
    eAttr.needsUpdate = true;
    eaAttr.needsUpdate = true;

    // ── Packet heads + trails into one buffer ───────────────────────────────
    const pAttr = packetGeo.getAttribute("position") as BufferAttribute;
    const pPos = pAttr.array as Float32Array;
    const psAttr = packetGeo.getAttribute("aScale") as BufferAttribute;
    const pScale = psAttr.array as Float32Array;
    const per = 1 + PACKET_CONFIG.trailLength;

    for (let i = 0; i < router.pool.length; i++) {
      const p = router.pool[i];
      const base = i * per;

      if (!p.alive) {
        // aScale 0 → gl_PointSize 0 → nothing rasterised. Cheaper than
        // rebuilding the buffer to exclude dead packets.
        for (let k = 0; k < per; k++) pScale[base + k] = 0;
        continue;
      }

      pPos[base * 3] = p.x;
      pPos[base * 3 + 1] = p.y;
      pPos[base * 3 + 2] = p.z;
      pScale[base] = p.size;

      for (let k = 0; k < PACKET_CONFIG.trailLength; k++) {
        const slot = base + 1 + k;
        if (k >= p.trailCount) {
          pScale[slot] = 0;
          continue;
        }
        // Walk backwards from the ring head: k=0 is the most recent sample.
        const idx =
          (p.trailHead - 1 - k + PACKET_CONFIG.trailLength * 2) %
          PACKET_CONFIG.trailLength;
        pPos[slot * 3] = p.trail[idx * 3];
        pPos[slot * 3 + 1] = p.trail[idx * 3 + 1];
        pPos[slot * 3 + 2] = p.trail[idx * 3 + 2];
        // Taper by size rather than alpha — same reason as the node glow.
        // Slightly head-weighted rather than linear: a linear taper on a trail
        // this long reads as a dashed line, a weighted one reads as a comet.
        const f = 1 - k / PACKET_CONFIG.trailLength;
        pScale[slot] = p.size * PACKET_CONFIG.trailAlpha * f * (0.55 + 0.45 * f);
      }
    }
    pAttr.needsUpdate = true;
    psAttr.needsUpdate = true;
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, waypointZ(WAYPOINT.skills)]}
      visible={false}
    >
      <lineSegments geometry={edgeGeo} frustumCulled={false}>
        <primitive object={edgeMat} attach="material" />
      </lineSegments>
      <points geometry={nodeGeo} frustumCulled={false}>
        <primitive object={nodeMat} attach="material" />
      </points>
      <points geometry={packetGeo} frustumCulled={false}>
        <primitive object={packetMat} attach="material" />
      </points>
    </group>
  );
};
