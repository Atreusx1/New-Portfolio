/**
 * UniverseCanvas.tsx — the only <Canvas> in the app.
 *
 * Default-exported because this is the React.lazy() split point: the entire
 * three.js + R3F + postprocessing graph hangs off this module and must not
 * land in the initial bundle.
 *
 * Stage 3 composes the full flight. Note what is *not* here: no per-section
 * mounting, no route awareness, no transition orchestration. Every motif is a
 * static object at a fixed z, and the camera flies past it. The continuity is
 * a consequence of the geometry, not of code coordinating between sections —
 * which is why there is no place for the sections to fall out of sync.
 */
import { Suspense, useState } from "react";
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
import { FLIGHT } from "./motion";
import { MAX_DPR, MOTIF_BUDGET, PARTICLE_BUDGET, type QualityTier } from "./useQuality";
import { SECTION_IDS } from "../data/sections";

export interface UniverseCanvasProps {
  accentRaw: string;
  isDark: boolean;
  reducedMotion: boolean;
  tier: QualityTier;
}

const UniverseCanvas = ({
  accentRaw,
  isDark,
  reducedMotion,
  tier,
}: UniverseCanvasProps) => {
  const [dpr, setDpr] = useState(Math.min(MAX_DPR[tier], 2));

  // Computed outside the Canvas: it is DOM-scroll state, not scene state, and
  // it must keep sampling even if the scene is suspended.
  const flight = useFlightProgress(SECTION_IDS);

  // Bloom is a dark-theme effect. On warm paper it fogs the whole page and
  // drags AA contrast under threshold, so light mode simply does without.
  const bloomEnabled = isDark && !reducedMotion && tier !== "low";

  const budget = Math.round(PARTICLE_BUDGET[tier] * (reducedMotion ? 0.6 : 1));
  const motif = MOTIF_BUDGET[tier];

  // Reduced motion gets the hero globe alone, at rest. The corridor is the
  // motion; there is no meaningful "static" version of flying through it.
  const flying = !reducedMotion;

  return (
    <Canvas
      aria-hidden="true"
      dpr={dpr}
      // 'demand' means a reduced-motion visitor renders a handful of frames and
      // then the GPU goes idle — a genuine battery win, not a token gesture.
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
        pointerEvents: "none",
        background: "var(--bg)",
      }}
    >
      <Suspense fallback={null}>
        {flying && (
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(Math.min(MAX_DPR[tier], 2))}
          />
        )}

        <CameraRig flight={flight} still={reducedMotion} />

        <ParticleGlobe
          accentRaw={accentRaw}
          isDark={isDark}
          particleCount={budget}
          flight={flight}
          still={reducedMotion}
        />

        {flying && (
          <>
            <Starfield
              accentRaw={accentRaw}
              isDark={isDark}
              count={Math.round(budget * 0.35)}
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
