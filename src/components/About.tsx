/**
 * About.tsx — redesigned.
 *
 * Body copy moves from mono to Inter at a real reading size and width;
 * stats become quiet cards; traits become chips instead of a numbered
 * list (the numbers encoded nothing). Section height roughly halved.
 */
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { Reveal } from "./motion/Reveal";

const PARAGRAPHS = [
  "I'm a full-stack developer with a deep interest in blockchain and immersive web experiences. Over three years I've shipped everything from high-performance web apps to decentralized systems.",
  "Lately I've been deep in zkSNARKs, smart contracts, and dApps — building tools for a decentralized future. Off the clock: open source, 3-D graphics, and generative art.",
] as const;

const STATS = [
  { num: "3+", label: "Years experience" },
  { num: "8+", label: "Projects shipped" },
  { num: "20+", label: "Technologies" },
] as const;

const TRAITS = [
  "React & Three.js",
  "Smart contracts",
  "zkSNARKs",
  "Open source",
  "Generative art",
] as const;

export const About = () => {
  const t = useTheme();

  return (
    <section id="about" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">About</span>
          <h2 className="section-title">
            <ScrambleText text="Builder of decentralized things" active speed={16} />
          </h2>
        </Reveal>

        <div className="grid-2">
          {/* Narrative */}
          <Reveal delay={0.08}>
            {PARAGRAPHS.map((text, i) => (
              <p
                key={i}
                className="body-text"
                style={{ marginBottom: i < PARAGRAPHS.length - 1 ? "1.25rem" : 0 }}
              >
                {text}
              </p>
            ))}

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginTop: "1.75rem",
              }}
            >
              {TRAITS.map((trait) => (
                <span key={trait} className="chip">
                  {trait}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Stats */}
          <Reveal delay={0.16}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.9rem",
              }}
            >
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="card"
                  style={{ padding: "1.4rem 1.1rem" }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "2rem",
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      color: t.accent,
                      lineHeight: 1,
                      marginBottom: "0.45rem",
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.7rem",
                      fontWeight: 500,
                      color: t.fg_(0.45),
                      letterSpacing: "0.02em",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <p
              className="body-text"
              style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: t.fg_(0.45) }}
            >
              Currently open to new opportunities — especially anything at the
              intersection of protocol engineering and product craft.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
