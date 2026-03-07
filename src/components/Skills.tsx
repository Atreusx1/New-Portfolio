import { useEffect, useRef, useState } from "react";
import { SKILLS } from "../data/constants";
import { ScrambleText } from "./ScrambleText";

export const Skills = () => {
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

  const categories = [
    { key: "frontend", label: "Frontend", index: "01" },
    { key: "backend", label: "Backend", index: "02" },
    { key: "blockchain", label: "Blockchain", index: "03" },
    { key: "tools", label: "Tools & DevOps", index: "04" },
  ];

  return (
    <section
      ref={ref}
      id="skills"
      style={{
        borderTop: "1px solid rgba(226,226,226,0.08)",
        padding: "8rem 2rem",
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
              color: "rgba(226,226,226,0.25)",
            }}
          >
            03
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
              <ScrambleText text="Skills" active={visible} speed={35} />
            ) : (
              "Skills"
            )}
          </h2>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            border: "1px solid rgba(226,226,226,0.08)",
          }}
          className="skills-grid"
        >
          {categories.map((cat, ci) => (
            <div
              key={cat.key}
              style={{
                borderRight:
                  ci < 3 ? "1px solid rgba(226,226,226,0.08)" : "none",
                padding: "2rem",
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(16px)",
                transition: `all 0.6s ease ${0.1 + ci * 0.1}s`,
              }}
            >
              {/* Category header */}
              <div
                style={{
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid rgba(226,226,226,0.08)",
                }}
              >
                <div
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.55rem",
                    letterSpacing: "0.2em",
                    color: "rgba(151, 252, 228, 0.45)",
                    marginBottom: "0.4rem",
                  }}
                >
                  {cat.index}
                </div>
                <div
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#e2e2e2",
                    letterSpacing: "0.05em",
                  }}
                >
                  {cat.label}
                </div>
              </div>

              {/* Skills */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                }}
              >
                {(SKILLS[cat.key as keyof typeof SKILLS] as string[]).map(
                  (skill, si) => (
                    <SkillItem
                      key={skill}
                      skill={skill}
                      visible={visible}
                      delay={0.2 + ci * 0.1 + si * 0.03}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .skills-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .skills-grid > div:nth-child(2) { border-right: none !important; }
          .skills-grid > div:nth-child(3) { border-top: 1px solid rgba(226,226,226,0.08); }
          .skills-grid > div:nth-child(4) { border-top: 1px solid rgba(226,226,226,0.08); }
        }
        @media (max-width: 560px) {
          .skills-grid { grid-template-columns: 1fr !important; }
          .skills-grid > div { border-right: none !important; border-top: 1px solid rgba(226,226,226,0.08); }
          .skills-grid > div:first-child { border-top: none; }
        }
      `}</style>
    </section>
  );
};

const SkillItem = ({
  skill,
  visible,
  delay,
}: {
  skill: string;
  visible: boolean;
  delay: number;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.3rem 0",
        fontFamily: "Space Mono, monospace",
        fontSize: "0.72rem",
        color: hovered ? "rgb(151, 252, 228)" : "rgba(226,226,226,0.45)",
        letterSpacing: "0.02em",
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateX(8px)",
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s, color 0.15s ease`,
      }}
    >
      <span
        style={{
          width: "3px",
          height: "3px",
          borderRadius: "50%",
          background: hovered ? "rgb(151, 252, 228)" : "rgba(226,226,226,0.2)",
          flexShrink: 0,
          transition: "background 0.15s ease",
        }}
      />
      {skill}
    </div>
  );
};
