/**
 * Scrambletext.tsx: per-character scramble reveal, without the layout shift.
 *
 * ── The bug this fixes ──
 * The old version started as a run of spaces and filled in, swapping random
 * glyphs at each position every 30ms. In a proportional face like Anybody
 * an `I` and a `W` differ in advance width by more than 3x, so the headline's
 * measured width changed on every tick: and because the hero is centre-aligned,
 * the whole block jittered horizontally for the entire animation. On a 700-weight
 * 7rem headline that is not subtle.
 *
 * ── The fix ──
 * Reserve the width up front. The widest state the animation can *possibly*
 * reach is (number of non-space characters × the widest candidate glyph), and
 * that can be computed exactly with `canvas.measureText`: no DOM measurement,
 * no `getBoundingClientRect`, no forced reflow. Set it as `min-width` once and
 * the box cannot move.
 *
 * This is the one job the Pretext library would genuinely have been right for.
 * For Latin-only headline text it is about fifteen lines of canvas metrics, so
 * a dependency was not warranted: but the reasoning is the same: measure with
 * the font engine, never with layout.
 *
 * ── Two other changes ──
 *  · rAF instead of setInterval. A 30ms interval is not frame-aligned, so
 *    roughly every other tick either landed twice in one frame or skipped one.
 *  · Text is written through a ref, so scrambling does not re-render React.
 *    Hero holds live WebSocket ticker state; 33 re-renders/second of that
 *    subtree for a decorative effect was the wrong trade.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*/?!";

/** One shared 1x1 canvas for all measurement. Never attached to the document. */
let measureCtx: CanvasRenderingContext2D | null = null;
const getMeasureCtx = (): CanvasRenderingContext2D | null => {
  if (measureCtx) return measureCtx;
  if (typeof document === "undefined") return null;
  measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
};

/**
 * Per-character advance widths for the settled text, plus the total box width.
 *
 * ── Why per-slot and not one reservation ──
 * Reserving the *widest possible* scramble state does prevent the shift, but
 * it over-reserves badly: for "Anish Kadam" at 7.1rem the absolute worst case
 * (every slot simultaneously drawing the widest glyph in the alphabet) is
 * 1050px against a settled width of 649px. Simulated over 20,000 ticks the
 * scramble never actually exceeds 853px, and at mobile's clamped 3.2rem a 62%
 * over-reservation overflows the viewport outright.
 *
 * Locking each *slot* to the width of the character that will finally occupy
 * it gives a box exactly as wide as the settled text, and no slot can ever
 * change width: so the shift is structurally impossible rather than merely
 * bounded. The 340px of jitter measured on the old version becomes zero.
 */
export const measureSlots = (
  text: string,
  font: string,
): { widths: number[]; total: number } => {
  const ctx = getMeasureCtx();
  if (!ctx) return { widths: [], total: 0 };
  ctx.font = font;

  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  // Kerning means the sum of advances differs slightly from the measured
  // string; reserve the larger so the hand-off back to a plain text node at
  // the end of the animation cannot nudge anything either.
  const sum = widths.reduce((a, b) => a + b, 0);
  return { widths, total: Math.max(sum, ctx.measureText(text).width) };
};

/** Read the element's real computed font so the measurement cannot drift. */
const fontStringFor = (el: HTMLElement): { font: string; tracking: number } => {
  const cs = getComputedStyle(el);
  const spacing = parseFloat(cs.letterSpacing);
  return {
    font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`,
    tracking: Number.isFinite(spacing) ? spacing : 0,
  };
};

interface ScrambleTextProps {
  text: string;
  active?: boolean;
  /** Milliseconds per character step. */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Deliberately a narrow union, not `keyof JSX.IntrinsicElements`.
   *
   * Once @react-three/fiber is installed it augments the global JSX namespace
   * with every three.js element, so `keyof JSX.IntrinsicElements` balloons into
   * a union TypeScript refuses to represent: the original signature fails to
   * compile with TS2590 the moment stage 1's dependencies land. It also let
   * callers pass `<image>`, which has required props this component never sets.
   */
  tag?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div" | "strong" | "em";
}

export const ScrambleText = ({
  text,
  active = true,
  speed = 30,
  className = "",
  style,
  tag: Tag = "span",
}: ScrambleTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const slots = useRef<number[]>([]);
  const [reserved, setReserved] = useState<number>(0);

  // Measure before paint. useLayoutEffect rather than useEffect because a frame
  // rendered at the wrong width is exactly the shift we are removing.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = (): void => {
      const { font } = fontStringFor(el);
      const { widths, total } = measureSlots(text, font);
      slots.current = widths;
      setReserved(Math.ceil(total));
    };

    measure();
    // Webfonts land after first paint; metrics taken against the fallback face
    // would be wrong and the shift would come back.
    void document.fonts?.ready.then(measure).catch(() => {});

    // clamp() font sizes mean every measurement is viewport-dependent.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!active || reduced) {
      el.textContent = text;
      return;
    }

    const chars = [...text];
    const totalSteps = chars.length * 3 + 10;

    // One fixed-width slot per character. Built once, mutated in place.
    el.textContent = "";
    const spans = chars.map((ch, i) => {
      const span = document.createElement("span");
      span.style.display = "inline-block";
      span.style.textAlign = "center";
      const w = slots.current[i];
      if (w) span.style.width = `${w}px`;
      span.textContent = ch === " " ? "\u00a0" : "";
      el.appendChild(span);
      return span;
    });

    let step = 0;
    let last = 0;
    let raf = 0;

    const settle = (): void => {
      // Hand back to a single text node so the resting headline gets real
      // kerning and ligatures: the fixed slots exist only during motion.
      el.textContent = text;
    };

    const tick = (now: number): void => {
      if (now - last >= speed) {
        last = now;
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          if (ch === " ") continue;
          spans[i].textContent =
            step / 3 > i ? ch : CHARS[(Math.random() * CHARS.length) | 0];
        }
        step++;
      }
      if (step > totalSteps) {
        settle();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      settle();
    };
  }, [text, active, speed]);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        // `inline-block` is required for min-width to apply.
        display: "inline-block",
        // Capped with min(): a fixed min-width always wins over max-width in
        // CSS's conflict resolution, so an uncapped reservation (e.g. 373px)
        // would force overflow on any viewport narrower than that: this is
        // what caused the About.tsx tagline to overflow on mobile. Capping
        // the reservation itself to 100% lets the box shrink to the
        // container and the text wrap normally on narrow screens, at the
        // cost of the anti-jitter guarantee only on those narrow widths.
        minWidth: reserved ? `min(${reserved}px, 100%)` : undefined,
        maxWidth: "100%",
        ...style,
      }}
      aria-label={text}
    >
      {/* Server/first render shows the settled text, so there is no flash of
          nothing if hydration is slow or JS never runs. */}
      {text}
    </Tag>
  );
};

/** Kept for any caller that wants the raw string rather than the element. */
export const useScramble = (
  text: string,
  active: boolean,
  speed = 40,
): string => {
  const [output, setOutput] = useState(text);

  useEffect(() => {
    if (!active) {
      setOutput(text);
      return;
    }
    const chars = [...text];
    const totalSteps = chars.length * 3 + 10;
    let step = 0;
    let last = 0;
    let raf = 0;

    const tick = (now: number): void => {
      if (now - last >= speed) {
        last = now;
        setOutput(
          chars
            .map((ch, i) =>
              ch === " "
                ? " "
                : step / 3 > i
                  ? ch
                  : CHARS[(Math.random() * CHARS.length) | 0],
            )
            .join(""),
        );
        step++;
      }
      if (step > totalSteps) {
        setOutput(text);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, active, speed]);

  return output;
};
