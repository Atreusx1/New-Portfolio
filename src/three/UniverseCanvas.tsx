/**
 * UniverseCanvas.tsx: the only <Canvas> in the app.
 *
 * Default-exported because this is the React.lazy() split point: the entire
 * three.js + R3F + postprocessing graph hangs off this module and must not
 * land in the initial bundle.
 *
 * Stage 3 composes the full flight. Note what is *not* here: no per-section
 * mounting, no route awareness, no transition orchestration. Every motif is a
 * static object at a fixed z, and the camera flies past it. The continuity is
 * a consequence of the geometry, not of code coordinating between sections ,
 * which is why there is no place for the sections to fall out of sync.
 *
 * ── The degradation ladder (stage 4) ──
 * `detectTier` is explicitly allowed to be wrong, and with stage 4's higher
 * budgets it has more room to be wrong in. PerformanceMonitor is what corrects
 * it, and it now does so in graded steps rather than by dropping dpr and hoping:
 *
 *   step 0  everything on
 *   step 1  dpr pinned to 1, bloom off       : free, no GPU buffers touched
 *   step 2  effective tier down one notch    : every budget below re-derives
 *   step 3  effective tier down two notches
 *
 * Steps 2 and 3 rebuild geometry, including the graph topology, so they are
 * deliberately behind the two cheap wins: a device that is only slightly short
 * gets step 1 and never pays for a rebuild. `onFallback` fires when the monitor
 * has flip-flopped too many times to trust its own readings, and pins the
 * bottom rung so the scene cannot oscillate between quality levels forever.
 */
import { Suspense, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { ParticleGlobe } from "./ParticleGlobe";
import { Starfield } from "./Starfield";
import { CameraRig } from "./CameraRig";
import { FlowDrift } from "./motifs/FlowDrift";
import { HexBelt } from "./motifs/HexBelt";
import { NetworkGraph } from "./motifs/NetworkGraph";
import { PerspectiveGrid } from "./motifs/PerspectiveGrid";
import { Convergence } from "./motifs/Convergence";
import { useFlightProgress } from "./useFlightProgress";
import { hasFinePointer, usePointer } from "./usePointer";
import { FLIGHT } from "./motion";
import {
  MAX_DPR,
  MOTIF_BUDGET,
  PARTICLE_BUDGET,
  stepTier,
  type QualityTier,
} from "./useQuality";
import { SECTION_IDS } from "../data/sections";

export interface UniverseCanvasProps {
  accentRaw: string;
  isDark: boolean;
  reducedMotion: boolean;
  tier: QualityTier;
}

/** Lowest rung of the ladder. Also where onFallback pins. */
const MAX_STEP = 3;

const UniverseCanvas = ({
  accentRaw,
  isDark,
  reducedMotion,
  tier,
}: UniverseCanvasProps) => {
  const [step, setStep] = useState(0);
  /** Once the monitor has proved unreliable, stop letting it climb back up. */
  const pinned = useRef(false);

  const onDecline = useCallback(() => {
    setStep((s) => Math.min(MAX_STEP, s + 1));
  }, []);

  const onIncline = useCallback(() => {
    if (pinned.current) return;
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const onFallback = useCallback(() => {
    pinned.current = true;
    setStep(MAX_STEP);
  }, []);

  // Everything below derives from `step`. Kept as derivations rather than as
  // four pieces of state so they cannot disagree with each other.
  const effectiveTier =
    step >= 3 ? stepTier(tier, -2) : step >= 2 ? stepTier(tier, -1) : tier;
  const dpr = step >= 1 ? 1 : Math.min(MAX_DPR[tier], 2);

  // Computed outside the Canvas: it is DOM-scroll state, not scene state, and
  // it must keep sampling even if the scene is suspended.
  const flight = useFlightProgress(SECTION_IDS);

  /**
   * Pointer repulsion is a hover effect, so it is fine-pointer only, and it is
   * motion, so prefers-reduced-motion turns it off outright: the same two
   * gates useQuality already applies everywhere else. Probed once: neither
   * answer can change without a reload.
   */
  const [finePointer] = useState(hasFinePointer);
  const pointer = usePointer(finePointer && !reducedMotion);

  // Bloom is a dark-theme effect. On warm paper it fogs the whole page and
  // drags AA contrast under threshold, so light mode simply does without.
  // It is also the first thing to go when the frame budget slips.
  const bloomEnabled =
    isDark && !reducedMotion && effectiveTier !== "low" && step < 1;

  const budget = Math.round(
    PARTICLE_BUDGET[effectiveTier] * (reducedMotion ? 0.6 : 1),
  );
  const motif = MOTIF_BUDGET[effectiveTier];

  // Reduced motion gets the hero globe alone, at rest. The corridor is the
  // motion; there is no meaningful "static" version of flying through it.
  const flying = !reducedMotion;

  return (
    <Canvas
      aria-hidden="true"
      dpr={dpr}
      // 'demand' means a reduced-motion visitor renders a handful of frames and
      // then the GPU goes idle: a genuine battery win, not a token gesture.
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      camera={{
        fov: FLIGHT.camera.fovRest,
        position: [0, 0, FLIGHT.camera.zRest],
        near: 0.1,
        // Just over one corridor span plus the next motif's depth: far enough
        // that the section ahead fades in rather than pops, close enough that
        // nothing two sections away is ever submitted for drawing.
        far: 46,
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        // Necessary: this sits behind the entire document, and any other value
        // would swallow every click on the site. It is also why the scene reads
        // the cursor from a window listener rather than from R3F's event layer,
        // which is attached to this element and therefore never fires.
        pointerEvents: "none",
        background: "var(--bg)",
      }}
    >
      <Suspense fallback={null}>
        {flying && (
          <PerformanceMonitor
            onDecline={onDecline}
            onIncline={onIncline}
            onFallback={onFallback}
            // Three changes of direction is enough to conclude the device is
            // sitting on the boundary and further adjustment is just churn.
            flipflops={3}
          />
        )}

        <CameraRig flight={flight} still={reducedMotion} />

        <ParticleGlobe
          accentRaw={accentRaw}
          isDark={isDark}
          particleCount={budget}
          flight={flight}
          pointer={pointer}
          still={reducedMotion}
        />

        {flying && (
          <>
            <Starfield
              accentRaw={accentRaw}
              isDark={isDark}
              // Slightly leaner share than stage 3's 0.35: the budget it is a
              // share *of* grew by 60%, and these are the largest points in the
              // scene, so a flat ratio would have spent the whole raise on
              // backdrop overdraw.
              count={Math.round(budget * 0.32)}
              flight={flight}
              still={reducedMotion}
            />

            <FlowDrift
              accentRaw={accentRaw}
              isDark={isDark}
              count={motif.flowDrift}
              flight={flight}
              still={reducedMotion}
            />

            <HexBelt
              accentRaw={accentRaw}
              isDark={isDark}
              count={motif.hexes}
              flight={flight}
              still={reducedMotion}
            />

            <NetworkGraph
              accentRaw={accentRaw}
              isDark={isDark}
              nodeCount={motif.graphNodes}
              flight={flight}
              still={reducedMotion}
            />

            <PerspectiveGrid
              accentRaw={accentRaw}
              isDark={isDark}
              flight={flight}
              still={reducedMotion}
            />

            <Convergence
              accentRaw={accentRaw}
              isDark={isDark}
              count={motif.convergence}
              flight={flight}
              still={reducedMotion}
            />
          </>
        )}

        {bloomEnabled && (
          <EffectComposer multisampling={0}>
            <Bloom
              mipmapBlur
              intensity={0.72}
              // Points are already near-white at their cores; a low threshold
              // would bloom the whole field into mush.
              luminanceThreshold={0.22}
              luminanceSmoothing={0.045}
              kernelSize={KernelSize.LARGE}
            />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
};

export default UniverseCanvas;
