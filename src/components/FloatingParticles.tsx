import { useEffect, useRef } from "react";

export const FloatingParticles = () => {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>();

  useEffect(() => {
    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    const handleMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      dot.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 3}px)`;
    };

    const animate = () => {
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.12;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.12;
      ring.style.transform = `translate(${ringPos.current.x - 16}px, ${ringPos.current.y - 16}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove);
    rafRef.current = requestAnimationFrame(animate);

    // Hide on mobile
    const checkMobile = () => {
      const isMobile = window.matchMedia("(hover: none)").matches;
      if (dot) dot.style.display = isMobile ? "none" : "block";
      if (ring) ring.style.display = isMobile ? "none" : "block";
    };
    checkMobile();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const base: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    pointerEvents: "none",
    zIndex: 9998,
    willChange: "transform",
  };

  return (
    <>
      {/* Dot */}
      <div
        ref={cursorDotRef}
        style={{
          ...base,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgb(151,252,228)",
        }}
      />
      {/* Ring */}
      <div
        ref={cursorRingRef}
        style={{
          ...base,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid rgba(151,252,228,0.3)",
        }}
      />
    </>
  );
};
