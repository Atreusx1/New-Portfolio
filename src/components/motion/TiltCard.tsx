/**
 * TiltCard.tsx — 3-D tilt toward the pointer plus a glow that follows it.
 *
 * The glow uses the .card-glow CSS (radial gradient at --gx/--gy), so the
 * only work per pointer move is writing three CSS custom properties and a
 * transform — GPU-composited, no re-renders, no layout thrash.
 */
import { useRef, ReactNode, CSSProperties, PointerEvent } from "react";
import { prefersReducedMotion } from "./Reveal";

interface TiltCardProps {
  children: ReactNode;
  /** Max tilt in degrees. */
  tilt?: number;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}

export const TiltCard = ({
  children,
  tilt = 4,
  style,
  className = "",
  onClick,
}: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = prefersReducedMotion();

  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const el = ref.current;
    if (!el || reduced || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    const rx = (0.5 - py) * tilt;
    const ry = (px - 0.5) * tilt;
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
  };

  const onPointerLeave = (): void => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      className={`card card-glow ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      style={{
        transition:
          "transform 0.45s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
