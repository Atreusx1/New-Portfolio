import { useEffect, useRef, useState } from "react";
import { EXPERIENCE } from "../data/constants";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";

export const Experience = () => {
  const t = useTheme();
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

  return (
    <section
      ref={ref}
      id="experience"
      style={{
        borderTop: `1px solid ${t.fg_(0.08)}`,
        padding: "8rem 2rem",
        transition: "border-color 0.35s ease",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
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
              color: t.fg_(0.25),
            }}
          >
            04
          </span>
          <h2
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "clamp(1.8rem, 4vw, 3.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: t.fg,
              transition: "color 0.35s ease",
            }}
          >
            {visible ? (
              <ScrambleText text="Experience" active={visible} speed={28} />
            ) : (
              "Experience"
            )}
          </h2>
        </div>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: "6rem",
              top: 0,
              bottom: 0,
              width: "1px",
              background: t.fg_(0.08),
              transformOrigin: "top",
              transform: visible ? "scaleY(1)" : "scaleY(0)",
              transition: "transform 1s ease 0.3s",
            }}
          />
          {EXPERIENCE.map((exp, i) => (
            <ExperienceRow key={exp.id} exp={exp} index={i} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ExperienceRow = ({
  exp,
  index,
  visible,
}: {
  exp: (typeof EXPERIENCE)[0];
  index: number;
  visible: boolean;
}) => {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "6rem 1fr",
        gap: "2rem",
        padding: "2rem 0",
        borderBottom: `1px solid ${t.fg_(0.08)}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(16px)",
        transition: `all 0.6s ease ${0.2 + index * 0.1}s`,
      }}
    >
      {/* Period */}
      <div
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.08em",
          color: t.fg_(0.2),
          lineHeight: 1.6,
          textAlign: "right",
          paddingRight: "2rem",
          paddingTop: "0.25rem",
        }}
      >
        {exp.period.split(" — ").map((p, i) => (
          <div key={i}>{p}</div>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          paddingLeft: "1.5rem",
          borderLeft: `1px solid ${hovered ? t.ac_(0.45) : "transparent"}`,
          transition: "border-color 0.2s ease",
        }}
      >
        <div style={{ marginBottom: "0.5rem" }}>
          <h3
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: hovered ? t.accent : t.fg_(0.85),
              letterSpacing: "-0.01em",
              transition: "color 0.2s ease",
              marginBottom: "0.2rem",
            }}
          >
            {exp.role}
          </h3>
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.7rem",
              color: t.fg_(0.35),
              letterSpacing: "0.05em",
            }}
          >
            {exp.company}
          </span>
        </div>
        <p
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.78rem",
            color: t.fg_(0.4),
            lineHeight: 1.8,
          }}
        >
          {exp.description}
        </p>
      </div>
    </div>
  );
};
