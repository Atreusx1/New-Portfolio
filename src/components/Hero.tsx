import { useEffect, useState, useRef } from "react";
import { ScrambleText } from "./ScrambleText";
import { ChevronDown } from "lucide-react";

export const Hero = () => {
  const [active, setActive] = useState(false);
  const [lineVisible, setLineVisible] = useState(false);
  const [subVisible, setSubVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setActive(true), 300);
    const t2 = setTimeout(() => setLineVisible(true), 600);
    const t3 = setTimeout(() => setSubVisible(true), 900);
    const t4 = setTimeout(() => setCtaVisible(true), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Grid canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let mouseX = -999,
      mouseY = -999;
    const handleMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouse);

    const SPACING = 80;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas.width / SPACING) + 1;
      const rows = Math.ceil(canvas.height / SPACING) + 1;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * SPACING;
          const y = r * SPACING;
          const dist = Math.hypot(mouseX - x, mouseY - y);
          const influence = Math.max(0, 1 - dist / 300);

          // Draw dot at intersection
          const radius = 1 + influence * 2;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(151,252,228,${0.03 + influence * 0.18})`;
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="home"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        paddingBottom: "6rem",
        overflow: "hidden",
      }}
    >
      {/* Grid canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />

      {/* Corner labels */}
      <div
        style={{
          position: "absolute",
          top: "5.5rem",
          left: "2rem",
          fontFamily: "Space Mono, monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.15em",
          color: "rgba(226,226,226,0.2)",
          textTransform: "uppercase",
          lineHeight: 2,
        }}
      >
        <div>Portfolio — 2025</div>
        <div>Full-Stack / Blockchain</div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "5.5rem",
          right: "2rem",
          fontFamily: "Space Mono, monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.15em",
          color: "rgba(226,226,226,0.2)",
          textTransform: "uppercase",
          textAlign: "right",
          lineHeight: 2,
        }}
      >
        <div>Pune, IN</div>
        <div>UTC+5:30</div>
      </div>

      {/* Main content */}
      <div style={{ padding: "0 2rem", position: "relative", zIndex: 2 }}>
        {/* Label */}
        <div
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgb(151, 252, 228)",
            marginBottom: "2rem",
            opacity: active ? 1 : 0,
            transform: active ? "none" : "translateY(8px)",
            transition: "all 0.6s ease 0.2s",
          }}
        >
          ↳ Welcome
        </div>

        {/* Big name */}
        <h1
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "clamp(3.5rem, 10vw, 10rem)",
            fontWeight: 700,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            color: "#e2e2e2",
            marginBottom: "1.5rem",
          }}
        >
          {active ? (
            <>
              <ScrambleText text="ANISH" active={active} speed={28} />
              <br />
              <ScrambleText text="KADAM" active={active} speed={28} />
            </>
          ) : (
            <>
              ANISH
              <br />
              KADAM
            </>
          )}
        </h1>

        {/* Divider line */}
        <div
          style={{
            height: "1px",
            background: "rgba(226,226,226,0.15)",
            marginBottom: "2rem",
            transformOrigin: "left",
            transform: lineVisible ? "scaleX(1)" : "scaleX(0)",
            transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1)",
            maxWidth: "600px",
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "clamp(0.75rem, 1.5vw, 1rem)",
            color: "rgba(226,226,226,0.5)",
            letterSpacing: "0.05em",
            maxWidth: "480px",
            lineHeight: 1.7,
            marginBottom: "3rem",
            opacity: subVisible ? 1 : 0,
            transform: subVisible ? "none" : "translateY(12px)",
            transition: "all 0.7s ease",
          }}
        >
          Full-Stack Developer & Blockchain Engineer
          <br />
          Building immersive web experiences
        </p>

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? "none" : "translateY(12px)",
            transition: "all 0.7s ease",
          }}
        >
          <a href="#projects" className="btn-primary">
            View Work →
          </a>
          <a href="#contact" className="btn-outline">
            Get in Touch
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          right: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontFamily: "Space Mono, monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.15em",
          color: "rgba(151,252,228,0.4)",
          textTransform: "uppercase",
          animation: "fadeIn 1s ease 1.5s both",
        }}
      >
        Scroll
        <ChevronDown
          size={12}
          style={{ animation: "blink 2s ease-in-out infinite" }}
        />
      </div>
    </section>
  );
};
