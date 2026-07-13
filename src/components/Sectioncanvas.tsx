/**
 * SectionCanvas.tsx
 *
 * The only React file in the universe system — and it's deliberately dumb.
 *
 * · Creates the Renderer on mount, destroys it on unmount. That's it.
 * · Theme changes are forwarded imperatively via renderer.setTheme();
 *   they never re-create the engine and never cause a canvas remount.
 * · No animation logic, no drawing, no state. The component itself
 *   re-renders only when ThemeContext changes (cheap: one <canvas/>),
 *   and the canvas element + engine survive untouched across renders.
 *
 * Drop-in replacement: same component name, same import path, same
 * fixed/full-screen/pointer-events-none contract as before.
 */

import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { Renderer } from "../universe/Renderer";

export const SectionCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const t = useTheme();

  // Mount / unmount — the engine lives exactly as long as the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;
    renderer.setTheme({ accentRaw: t.accentRaw, isDark: t.isDark });
    renderer.init();

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
    // Intentionally mount-only: theme updates are handled below without
    // tearing down the engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme forwarding — imperative, no engine restart, no canvas remount.
  useEffect(() => {
    rendererRef.current?.setTheme({ accentRaw: t.accentRaw, isDark: t.isDark });
  }, [t.accentRaw, t.isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        // Matches --bg so there's no flash before the first frame,
        // and stays in sync with theme switches automatically.
        backgroundColor: "var(--bg)",
      }}
    />
  );
};
