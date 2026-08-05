/**
 * CountUp.tsx
 *
 * A number that counts up when it scrolls into view.
 *
 * Three constraints shaped this, all of them from how the rest of the app
 * already behaves:
 *
 *  1. **It triggers on reveal, not on mount.** Everything below the fold in
 *     this app is gated by Reveal's IntersectionObserver, and Reveal publishes
 *     `shown` on a context as of stage 5. A number that counted up at mount
 *     would have finished before anyone scrolled to it, which is the exact bug
 *     stage 5 fixed for the boot screen. It also waits on the entrance gate,
 *     for the case where the element is already intersecting at load.
 *  2. **It is the hero ticker's design language, not a new one.** The hero
 *     marks a live value with tabular figures and a brief accent flash on
 *     change. So does this: figures are tabular so the digits do not reflow
 *     mid-count, and a hairline rule tracks the count underneath and fades once
 *     the value settles. No easing curve nobody else in the app uses, no
 *     bounce.
 *  3. **Reduced motion gets the number, immediately.** The value is the
 *     content; the animation is decoration. Anyone who has asked for less
 *     motion still gets the fact.
 *
 * Counting is done on a ref rather than through state. At 60fps a state update
 * per frame for three simultaneous counters is 180 React renders a second to
 * animate text that no other component reads.
 *
 * `active` is the third gate, added once numbers started living inside drawers.
 * Being revealed is not the same as being visible: a collapsed drawer is in the
 * viewport and its contents are zero pixels tall, so a counter inside one would
 * run to completion behind a closed panel. Exactly the failure the reveal gate
 * exists to prevent, one level further in.
 */
import { useEffect, useRef } from "react";
import { prefersReducedMotion, useRevealed } from "./Reveal";
import { useEntrance } from "./Entrance";

export interface CountUpProps {
  value: number;
  /** Decimal places. The formatter is fixed-width, so 3.5 stays 3.5. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Milliseconds. Long enough to read as counting, short enough not to nag. */
  duration?: number;
  className?: string;
  /** False holds the count until the container is actually open. */
  active?: boolean;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const CountUp = ({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1100,
  className,
  active = true,
}: CountUpProps) => {
  const revealed = useRevealed();
  const booted = useEntrance();
  const numRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  /** Guards against re-running if the element re-enters the viewport. */
  const done = useRef(false);

  useEffect(() => {
    if (!revealed || !booted || !active || done.current) return;
    const el = numRef.current;
    if (!el) return;
    done.current = true;

    const format = (n: number): string =>
      prefix + n.toFixed(decimals) + suffix;

    if (prefersReducedMotion()) {
      el.textContent = format(value);
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(p);
      el.textContent = format(value * eased);
      if (ruleRef.current) {
        ruleRef.current.style.transform = `scaleX(${eased})`;
        // Fade the rule out over the last third, so it reads as the value
        // arriving rather than as a progress bar that finished.
        ruleRef.current.style.opacity = String(p < 0.66 ? 1 : (1 - p) * 3);
      }
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // Land on the exact value: eased arithmetic can leave 9.999999.
        el.textContent = format(value);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealed, booted, active, value, decimals, prefix, suffix, duration]);

  return (
    <span className={className ? `countup ${className}` : "countup"}>
      {/*
        Rendered with the final value as its initial text so the layout is
        already the right width, and so a crawler or a JS-off reader sees the
        fact rather than a zero.
      */}
      <span ref={numRef} className="countup-value">
        {prefix + value.toFixed(decimals) + suffix}
      </span>
      <span ref={ruleRef} className="countup-rule" aria-hidden="true" />
    </span>
  );
};
