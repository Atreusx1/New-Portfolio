import { useEffect, useRef, useState } from "react";
import { ScrambleText } from "./ScrambleText";

export const About = () => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const stats = [
    { num: "3+", label: "Years Experience" },
    { num: "8+", label: "Projects Shipped" },
    { num: "20+", label: "Technologies" },
  ];

  const traits = [
    "React & Three.js Specialist",
    "Blockchain Developer",
    "zkSNARKs & Smart Contracts",
    "Open Source Contributor",
    "Generative Art Enthusiast",
  ];

  return (
    <section
      ref={ref}
      id="about"
      style={{
        borderTop: "1px solid rgba(226,226,226,0.08)",
        padding: "8rem 2rem",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "1.5rem",
            marginBottom: "5rem",
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(16px)",
            transition: "all 0.7s ease",
          }}
        >
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.2em",
              color: "rgba(226,226,226,0.25)",
            }}
          >
            01
          </span>
          <h2
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "clamp(1.8rem, 4vw, 3.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#e2e2e2",
            }}
          >
            {visible ? (
              <ScrambleText text="About" active={visible} speed={35} />
            ) : (
              "About"
            )}
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6rem",
            alignItems: "start",
          }}
          className="about-grid"
        >
          {/* Left — text */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(20px)",
              transition: "all 0.8s ease 0.2s",
            }}
          >
            <p
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.85rem",
                lineHeight: 1.9,
                color: "rgba(226,226,226,0.6)",
                marginBottom: "1.5rem",
              }}
            >
              I'm a passionate full-stack developer with a deep interest in
              blockchain technologies and immersive web experiences. With over 3
              years of professional experience, I've built diverse projects from
              high-performance web apps to decentralized systems.
            </p>
            <p
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.85rem",
                lineHeight: 1.9,
                color: "rgba(226,226,226,0.6)",
                marginBottom: "1.5rem",
              }}
            >
              Recently deep in blockchain development — zkSNARKs, smart
              contracts, and decentralized applications. I believe the future is
              decentralized, and I'm building tools to make it possible.
            </p>
            <p
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.85rem",
                lineHeight: 1.9,
                color: "rgba(226,226,226,0.6)",
              }}
            >
              When not coding: exploring new technologies, contributing to open
              source, experimenting with 3D graphics and generative art.
            </p>
          </div>

          {/* Right — stats + traits */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(20px)",
              transition: "all 0.8s ease 0.35s",
            }}
          >
            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0",
                marginBottom: "3rem",
                border: "1px solid rgba(226,226,226,0.08)",
              }}
            >
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    padding: "1.5rem 1rem",
                    borderRight:
                      i < stats.length - 1
                        ? "1px solid rgba(226,226,226,0.08)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: "rgb(151, 252, 228)",
                      lineHeight: 1,
                      marginBottom: "0.4rem",
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.6rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(226,226,226,0.3)",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Traits */}
            <div style={{ borderTop: "1px solid rgba(226,226,226,0.08)" }}>
              {traits.map((trait, i) => (
                <div
                  key={trait}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.85rem 0",
                    borderBottom: "1px solid rgba(226,226,226,0.08)",
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.75rem",
                    color: "rgba(226,226,226,0.55)",
                    letterSpacing: "0.02em",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "none" : "translateX(12px)",
                    transition: `all 0.5s ease ${0.4 + i * 0.07}s`,
                  }}
                >
                  <span
                    style={{
                      color: "rgba(226,226,226,0.2)",
                      fontSize: "0.6rem",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {trait}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
        }
      `}</style>
    </section>
  );
};
