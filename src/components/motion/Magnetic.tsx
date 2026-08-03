/**
 * Magnetic.tsx: the element leans toward the cursor while hovered
 * and springs back on leave. Pure transform, driven by rAF, zero
 * React state: no re-renders, no layout work.
 */
import { useEffect, useRef, ReactNode, CSSProperties } from "react";
import { prefersReducedMotion } from "./Reveal";

interface MagneticProps {
  children: ReactNode;
  /** Pull strength: how far (px) at the element's edge. */
  strength?: number;
  style?: CSSProperties;
  className?: string;
}

export const Magnetic = ({
  children,
  strength = 10,
  style,
  className,
}: MagneticProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let hovering = false;

    const tick = (): void => {
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      el.style.transform = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;
      if (hovering || Math.abs(curX) > 0.1 || Math.abs(curY) > 0.1) {
        raf = requestAnimationFrame(tick);
      } else {
        el.style.transform = "";
        raf = 0;
      }
    };

    const start = (): void => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent): void => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      targetX = dx * strength;
      targetY = dy * strength;
      hovering = true;
      start();
    };

    const onLeave = (): void => {
      hovering = false;
      targetX = 0;
      targetY = 0;
      start();
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ display: "inline-block", willChange: "transform", ...style }}
    >
      {children}
    </div>
  );
};
