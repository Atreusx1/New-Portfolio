/**
 * Skills.tsx: split-editor code window, styled as a macOS window.
 *
 * Two panes side by side, each its own pseudo-file with independent
 * line numbers: mirrors a real split editor. The two-column layout
 * naturally halves total vertical height vs one long file, so there's
 * no need for an internal scroll cap (which read as janky, nested
 * scrolling). Panes stack vertically on small screens. Fully static
 * text at rest: hover only dims sibling categories for focus.
 *
 * The title bar now uses real macOS traffic-light colors (red/yellow/
 * green, with the glyph-on-hover reveal), a centered title like a real
 * window chrome, and the card gets a floating drop shadow + subtle
 * hover lift instead of reading as a flat bordered box.
 */
import { useState, type ReactNode } from "react";
import { SKILLS } from "../data/constants";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { Reveal } from "./motion/Reveal";

type CategoryKey = keyof typeof SKILLS;

interface CategoryDef {
  key: CategoryKey;
  label: string;
}

interface PaneDef {
  file: string;
  varName: string;
  categories: CategoryDef[];
}

// blockchain + tools grouped together (deploy/infra side of the chain
// work: Alchemy, MetaMask, Docker, AWS are how it actually ships),
// frontend + backend grouped as the conventional fullstack half.
// Keeps both panes close in line count instead of one trailing off.
const PANES: PaneDef[] = [
  {
    file: "blockchain.ts",
    varName: "blockchain",
    categories: [
      { key: "blockchain" as CategoryKey, label: "contracts" },
      { key: "tools" as CategoryKey, label: "infra" },
    ],
  },
  {
    file: "fullstack.ts",
    varName: "fullstack",
    categories: [
      { key: "frontend" as CategoryKey, label: "frontend" },
      { key: "backend" as CategoryKey, label: "backend" },
    ],
  },
];

interface Line {
  catId: string; // unique across both panes, e.g. "0-1"; empty = not a category line
  indent: number;
  node: ReactNode;
}

// ── Real macOS traffic-light colors ────────────────────────────────────────
const TRAFFIC = [
  { fill: "#FF5F57", ring: "#E0443E", glyph: "×" }, // close
  { fill: "#FEBC2E", ring: "#DEA123", glyph: "−" }, // minimize
  { fill: "#28C840", ring: "#1AAB29", glyph: "+" }, // zoom
];

export const Skills = () => {
  const t = useTheme();
  const [activeCat, setActiveCat] = useState<string>("");
  const [trafficHover, setTrafficHover] = useState(false);

  const kw = t.ac_(0.85); // export / const / as
  const keyColor = t.accent; // object keys
  const strColor = t.fg_(0.78); // plain strings
  const punct = t.fg_(0.32); // brackets / commas
  const comment = t.fg_(0.3);

  const buildLines = (pane: PaneDef, paneIdx: number): Line[] => {
    const lines: Line[] = [
      {
        catId: "",
        indent: 0,
        node: (
          <>
            <span style={{ color: kw }}>export const</span> {pane.varName} ={" "}
            <span style={{ color: punct }}>{"{"}</span>
          </>
        ),
      },
    ];

    pane.categories.forEach((cat, ci) => {
      const skills = SKILLS[cat.key] as readonly string[];
      const catId = `${paneIdx}-${ci}`;
      lines.push({
        catId,
        indent: 1,
        node: (
          <>
            <span style={{ color: keyColor }}>{cat.label}</span>
            <span style={{ color: punct }}>: [</span>
          </>
        ),
      });
      skills.forEach((skill, si) => {
        lines.push({
          catId,
          indent: 2,
          node:
            si === 0 ? (
              <>
                <span style={{ color: t.accent }}>&quot;{skill}&quot;</span>
                <span style={{ color: punct }}>,</span>{" "}
                <span style={{ color: comment }}>// core</span>
              </>
            ) : (
              <>
                <span style={{ color: strColor }}>&quot;{skill}&quot;</span>
                <span style={{ color: punct }}>,</span>
              </>
            ),
        });
      });
      lines.push({
        catId,
        indent: 1,
        node: <span style={{ color: punct }}>],</span>,
      });
    });

    lines.push({
      catId: "",
      indent: 0,
      node: (
        <>
          <span style={{ color: punct }}>{"}"}</span>{" "}
          <span style={{ color: kw }}>as const</span>
          <span style={{ color: punct }}>;</span>
        </>
      ),
    });

    return lines;
  };

  const totalSkills = PANES.reduce(
    (sum, pane) =>
      sum +
      pane.categories.reduce(
        (s, c) => s + (SKILLS[c.key] as readonly string[]).length,
        0,
      ),
    0,
  );

  return (
    <section id="skills" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">Skills</span>
          <h2 className="section-title">
            <ScrambleText text="The stack, typed" active speed={20} />
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          {/* ── macOS-style floating window ─────────────────────────────
              Real proportions: ~12px corner radius, layered soft shadow
              for the "floating above the desktop" look, and a thin
              top highlight to sell the glass/vibrancy edge. */}
          <div
            className="card macos-window"
            style={{
              padding: 0,
              overflow: "hidden",
              borderRadius: "12px",
              background: t.terminalBg,
              backdropFilter: "blur(20px) saturate(1.8)",
              WebkitBackdropFilter: "blur(20px) saturate(1.8)",
              boxShadow: t.isDark
                ? "0 30px 60px -12px rgba(0,0,0,0.55), 0 12px 24px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
                : "0 30px 60px -12px rgba(20,30,28,0.22), 0 12px 24px -8px rgba(20,30,28,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
              border: `1px solid ${t.fg_(0.08)}`,
            }}
          >
            {/* title bar: traffic lights left, centered title, accessory right */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.7rem 1rem",
                background: t.terminalHeaderBg,
                borderBottom: `1px solid ${t.fg_(0.08)}`,
              }}
            >
              <div
                onMouseEnter={() => setTrafficHover(true)}
                onMouseLeave={() => setTrafficHover(false)}
                style={{ display: "flex", gap: "0.5rem", zIndex: 1 }}
                aria-hidden
              >
                {TRAFFIC.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      position: "relative",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 35% 30%, ${c.fill}, ${c.ring})`,
                      boxShadow: `0 0 0 0.5px ${c.ring}66`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "8px",
                        lineHeight: 1,
                        fontWeight: 700,
                        color: "rgba(0,0,0,0.45)",
                        opacity: trafficHover ? 1 : 0,
                        transition: "opacity 0.12s ease",
                        userSelect: "none",
                      }}
                    >
                      {c.glyph}
                    </span>
                  </span>
                ))}
              </div>

              {/* centered title: absolutely positioned so it stays truly
                  centered regardless of left/right content width */}
              <span
                className="mono-label"
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  opacity: 0.6,
                  fontSize: "0.72rem",
                  pointerEvents: "none",
                }}
              >
                src/stack/
              </span>

              <span
                className="mono-label"
                style={{
                  fontSize: "0.68rem",
                  color: t.accent,
                  background: t.ac_(0.1),
                  padding: "0.2rem 0.55rem",
                  borderRadius: "4px",
                  zIndex: 1,
                }}
              >
                TypeScript
              </span>
            </div>

            {/* split panes */}
            <div className="skills-split">
              {PANES.map((pane, paneIdx) => {
                const lines = buildLines(pane, paneIdx);
                return (
                  <div
                    key={pane.file}
                    className="skills-pane"
                    style={{
                      borderRight:
                        paneIdx === 0 ? `1px solid ${t.fg_(0.08)}` : "none",
                    }}
                  >
                    {/* tab */}
                    <div
                      className="mono-label"
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.72rem",
                        color: t.fg_(0.55),
                        borderBottom: `1px solid ${t.fg_(0.06)}`,
                        background: t.fg_(0.02),
                      }}
                    >
                      {pane.file}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        fontSize: "0.85rem",
                        lineHeight: 1.9,
                      }}
                    >
                      <div
                        aria-hidden
                        style={{
                          padding: "1rem 0.75rem",
                          textAlign: "right",
                          color: t.fg_(0.2),
                          userSelect: "none",
                          borderRight: `1px solid ${t.fg_(0.06)}`,
                          flexShrink: 0,
                        }}
                      >
                        {lines.map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>

                      <div
                        className="skills-code"
                        style={{ padding: "1rem", flex: 1, minWidth: 0 }}
                      >
                        {lines.map((line, i) => (
                          <div
                            key={i}
                            onMouseEnter={() =>
                              line.catId && setActiveCat(line.catId)
                            }
                            onMouseLeave={() => setActiveCat("")}
                            style={{
                              whiteSpace: "pre",
                              paddingLeft: `${line.indent * 2}ch`,
                              opacity:
                                !activeCat ||
                                !line.catId ||
                                activeCat === line.catId
                                  ? 1
                                  : 0.4,
                              background:
                                line.catId && activeCat === line.catId
                                  ? t.ac_(0.05)
                                  : "transparent",
                              transition:
                                "opacity 0.2s ease, background 0.2s ease",
                            }}
                          >
                            {line.node}
                          </div>
                        ))}
                        {paneIdx === PANES.length - 1 && (
                          <span
                            className="skills-cursor"
                            style={{ color: t.accent }}
                            aria-hidden
                          >
                            ▍
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* stats bar */}
            <div
              style={{
                display: "flex",
                gap: "1.25rem",
                padding: "0.55rem 1.25rem",
                background: t.terminalStatsBg,
                borderTop: `1px solid ${t.fg_(0.06)}`,
                fontSize: "0.72rem",
                color: t.fg_(0.45),
              }}
              className="mono-label"
            >
              <span>{PANES.length} files</span>
              <span>{totalSkills} skills</span>
              <span>UTF-8</span>
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        .skills-split {
          display: flex;
          flex-direction: row;
        }
        .skills-pane {
          flex: 1;
          min-width: 0;
        }
        .skills-cursor {
          animation: skills-blink 1.1s steps(1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .skills-cursor { animation: none; opacity: 0.6; }
        }
        @keyframes skills-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        /* Subtle "window on a desktop" lift on hover, mirrors how
           macOS nudges the active window's shadow */
        .macos-window {
          transition: transform 0.35s ease, box-shadow 0.35s ease;
        }
        .macos-window:hover {
          transform: translateY(-2px);
        }
        @media (max-width: 720px) {
          .skills-split {
            flex-direction: column;
          }
          .skills-pane {
            border-right: none !important;
          }
          .skills-pane:first-child {
            border-bottom: 1px solid var(--border);
          }
        }
      `}</style>
    </section>
  );
};
