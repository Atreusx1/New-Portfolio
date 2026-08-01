/**
 * useFlightProgress.ts — turns window scroll into a continuous flight coordinate.
 *
 * The coordinate `t` is a float where each integer is a section waypoint:
 * t=0 is the hero at rest, t=1 is About, t=2 is Projects, and so on. Leg 1 of
 * the flight is therefore simply `clamp(t, 0, 1)` — and stage 3 extends the
 * same number without this file changing.
 *
 * Two rules make this cheap enough to read every frame:
 *
 * 1. It writes to a **ref**, never to state. A `useState` here would re-render
 *    the entire React tree on every scroll event, which is the single most
 *    common way scroll-driven 3D ends up janky.
 * 2. Layout reads (`getBoundingClientRect`) happen only on mount, resize, and
 *    content mutation — never per scroll frame, and never inside `useFrame`.
 *    The scroll handler itself only touches `window.scrollY`.
 */
import { useEffect, useRef, type MutableRefObject } from "react";

export interface FlightState {
  /** Continuous waypoint coordinate. 0 = hero rest, 1 = About, 2 = Projects… */
  t: number;
  /** Raw scrollY, px. */
  y: number;
  /** Whole-document progress, 0..1. */
  progress: number;
  /** Scroll delta since last sample, px. Positive = downward. */
  velocity: number;
}

export const useFlightProgress = (
  sectionIds: readonly string[],
): MutableRefObject<FlightState> => {
  const state = useRef<FlightState>({ t: 0, y: 0, progress: 0, velocity: 0 });
  const tops = useRef<number[]>([]);

  useEffect(() => {
    let frame = 0;

    const sample = (): void => {
      const y = window.scrollY;
      const anchors = tops.current;
      const n = anchors.length;

      let t = 0;
      if (n >= 2) {
        if (y <= anchors[0]) {
          t = 0;
        } else if (y >= anchors[n - 1]) {
          t = n - 1;
        } else {
          // Linear scan: n is ~6. A binary search here would be ceremony.
          for (let i = 0; i < n - 1; i++) {
            if (y >= anchors[i] && y < anchors[i + 1]) {
              const span = Math.max(1, anchors[i + 1] - anchors[i]);
              t = i + (y - anchors[i]) / span;
              break;
            }
          }
        }
      }

      const scrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );

      state.current.velocity = y - state.current.y;
      state.current.y = y;
      state.current.t = t;
      state.current.progress = Math.min(1, Math.max(0, y / scrollable));
    };

    /** The only layout read in this module. Batched into a rAF. */
    const measure = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        tops.current = sectionIds.map((id) => {
          const el = document.getElementById(id);
          if (!el) return 0;
          return el.getBoundingClientRect().top + window.scrollY;
        });
        sample();
      });
    };

    measure();
    window.addEventListener("scroll", sample, { passive: true });
    window.addEventListener("resize", measure);

    // Section offsets shift when async content lands — the ticker strip
    // populating, sparklines arriving, fonts swapping. Without this the
    // waypoints stay pinned to the pre-hydration layout.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    // Late webfont load is the classic silent offset-shifter.
    void document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", sample);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [sectionIds]);

  return state;
};
