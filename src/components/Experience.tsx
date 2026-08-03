/**
 * Experience.tsx: redesigned.
 *
 * The full-width timeline with a 6rem gutter becomes a compact stack of
 * quiet rows: period in mono (it's data), role in the display face,
 * description in the body face at reading size. Hover lights the accent rail.
 *
 * Stage 6 adds the impact line above each description, so a reviewer skimming
 * the column gets four claims without reading four paragraphs.
 */
import { useState } from "react";
import { EXPERIENCE } from "../data/constants";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { Reveal } from "./motion/Reveal";
import { Takeaway } from "./patterns/Takeaway";

export const Experience = () => {
  return (
    <section id="experience" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">Experience</span>
          <h2 className="section-title">
            <ScrambleText text="Where I've shipped" active speed={20} />
          </h2>
        </Reveal>

        <div style={{ maxWidth: "760px" }}>
          {EXPERIENCE.map((exp, i) => (
            <Reveal key={exp.id} delay={0.06 * i}>
              <ExperienceRow exp={exp} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const ExperienceRow = ({ exp }: { exp: (typeof EXPERIENCE)[0] }) => {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        padding: "1.4rem 0 1.4rem 1.5rem",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Accent rail */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: "1.4rem",
          bottom: "1.4rem",
          width: 2,
          borderRadius: 2,
          background: hovered ? t.accent : "var(--border)",
          transform: hovered ? "scaleY(1)" : "scaleY(0.6)",
          transformOrigin: "top",
          transition:
            "background 0.25s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "0.3rem",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.0625rem",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: hovered ? t.accent : t.fg,
            transition: "color 0.2s ease",
          }}
        >
          {exp.role}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8rem",
              fontWeight: 450,
              color: t.fg_(0.45),
              marginLeft: "0.7rem",
            }}
          >
            {exp.company}
          </span>
        </h3>
        <span
          className="data-text"
          style={{
            fontSize: "0.62rem",
            letterSpacing: "0.08em",
            color: t.fg_(0.35),
            whiteSpace: "nowrap",
          }}
        >
          {exp.period}
        </span>
      </div>

      {/* The claim first, the detail under it. Same treatment as Projects, so
          the accent rule means the same thing in both places. */}
      <Takeaway>{exp.impact}</Takeaway>

      <p
        className="body-text"
        style={{ fontSize: "0.875rem", marginTop: "0.7rem" }}
      >
        {exp.description}
      </p>
    </div>
  );
};
