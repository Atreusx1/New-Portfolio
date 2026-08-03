/**
 * Reveal.tsx: scroll-triggered staggered reveal.
 *
 * Wrap anything: it fades + rises + unblurs when it enters the viewport.
 * `delay` staggers siblings. Respects prefers-reduced-motion (instant).
 * One shared IntersectionObserver per element; unobserves after firing.
<<<<<<< Updated upstream
=======
 *
 * ── Publishing `shown` (and why it was needed) ──
 * Reveal only ever controlled opacity and transform, which is fine for static
 * content and quietly wrong for anything that *animates itself*. Contact's
 * headline was `<ScrambleText text="…" active />` inside a Reveal: the wrapper
 * faded in on scroll, but the scramble started the moment Contact mounted , 
 * at page load, five sections above the fold, behind the boot overlay. It had
 * always finished long before anyone scrolled far enough to look at it.
 *
 * So Reveal now publishes its state on a context and `RevealScramble` reads it.
 * The wrapper stays the single source of truth for "is this visible yet",
 * rather than every self-animating child growing its own observer.
>>>>>>> Stashed changes
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
      // Tag union is div/section/span: all share HTMLElement refs.
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
<<<<<<< Updated upstream
=======

/**
 * A scramble that waits for its Reveal: and for the boot screen.
 *
 * Both gates matter. The Reveal covers the normal case (the element is far down
 * the page). The entrance gate covers the one the observer cannot: a short page
 * or a tall viewport where the element is already intersecting at load, which
 * would otherwise start the animation underneath the boot overlay again.
 */
export const RevealScramble = ({
  text,
  speed,
  className,
  style,
}: {
  text: string;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) => {
  const revealed = useRevealed();
  const booted = useEntrance();
  return (
    <ScrambleText
      text={text}
      active={revealed && booted}
      speed={speed}
      className={className}
      style={style}
    />
  );
};
>>>>>>> Stashed changes
