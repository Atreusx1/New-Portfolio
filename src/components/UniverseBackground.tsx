/**
 * UniverseBackground.tsx — the boundary between the DOM app and the 3D app.
 *
 * Everything three.js-shaped lives behind this React.lazy() call, so the
 * initial bundle contains none of it. This component itself is tiny and safe
 * to import eagerly from App.
 *
 * The fallback is a real static globe (CSS radial gradients), not a spinner or
 * a blank div — so on a cold load, a failed WebGL context, or a reduced-motion
 * preference, the page still looks composed rather than broken.
 */
import { Suspense, lazy, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  detectTier,
  hasWebGL,
  usePrefersReducedMotion,
} from "../three/useQuality";

const UniverseCanvas = lazy(() => import("../three/UniverseCanvas"));

const StaticGlobe = ({ accentRaw }: { accentRaw: string }) => (
  <div
    aria-hidden="true"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 0,
      pointerEvents: "none",
      background: `
        radial-gradient(circle at 50% 42%,
          rgba(${accentRaw},0.10) 0%,
          rgba(${accentRaw},0.05) 28%,
          rgba(${accentRaw},0.015) 44%,
          transparent 62%),
        var(--bg)`,
    }}
  />
);

export const UniverseBackground = () => {
  const t = useTheme();
  const reducedMotion = usePrefersReducedMotion();

  // Probed once. A WebGL context probe is cheap but not free, and the answer
  // cannot change without a reload.
  const [webgl] = useState(hasWebGL);
  const [tier] = useState(detectTier);

  if (!webgl) return <StaticGlobe accentRaw={t.accentRaw} />;

  return (
    <Suspense fallback={<StaticGlobe accentRaw={t.accentRaw} />}>
      <UniverseCanvas
        accentRaw={t.accentRaw}
        isDark={t.isDark}
        reducedMotion={reducedMotion}
        tier={tier}
      />
    </Suspense>
  );
};
