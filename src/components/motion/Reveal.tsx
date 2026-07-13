/**
 * Reveal.tsx — scroll-triggered staggered reveal.
 *
 * Wrap anything: it fades + rises + unblurs when it enters the viewport.
 * `delay` staggers siblings. Respects prefers-reduced-motion (instant).
 * One shared IntersectionObserver per element; unobserves after firing.
 */
import { useEffect, useRef, useState, ReactNode, CSSProperties } from "react";

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  /** Extra styles merged onto the wrapper. */
  style?: CSSProperties;
  className?: string;
  as?: "div" | "section" | "span";
  threshold?: number;
}

export const Reveal = ({
  children,
  delay = 0,
  style,
  className,
  as: Tag = "div",
  threshold = 0.12,
}: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(prefersReducedMotion());

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shown, threshold]);

  return (
    <Tag
      // Tag union is div/section/span — all share HTMLElement refs.
      ref={ref as never}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(22px)",
        filter: shown ? "none" : "blur(6px)",
        transition: `opacity 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}s, filter 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        willChange: shown ? "auto" : "opacity, transform, filter",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
};
