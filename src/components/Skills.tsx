// /**
//  * Skills.tsx — redesigned as a code editor window.
//  *
//  * Skills are rendered as a TypeScript object literal inside a fake
//  * "stack.config.ts" file — line numbers, syntax-highlighted keys/strings,
//  * the first skill per category marked `// core`. Fully static text, so
//  * it's readable at rest, accessible, and works with zero JS interaction.
//  * Hovering a category only dims siblings for focus — never required.
//  */
// import { useState, type ReactNode } from "react";
// import { SKILLS } from "../data/constants";
// import { ScrambleText } from "./Scrambletext";
// import { useTheme } from "../context/ThemeContext";
// import { Reveal } from "./motion/Reveal";

// const CATEGORIES = [
//   { key: "blockchain", label: "blockchain" },
//   { key: "backend", label: "backend" },
//   { key: "frontend", label: "frontend" },
//   { key: "tools", label: "tools" },
// ] as const;

// type CategoryKey = (typeof CATEGORIES)[number]["key"];

// interface Line {
//   cat: number; // -1 = not part of a category block
//   indent: number;
//   node: ReactNode;
// }

// export const Skills = () => {
//   const t = useTheme();
//   const [activeCat, setActiveCat] = useState<number>(-1);

//   const kw = t.ac_(0.85); // export / const / as
//   const keyColor = t.accent; // object keys
//   const strColor = t.fg_(0.78); // plain strings
//   const punct = t.fg_(0.32); // brackets / commas
//   const comment = t.fg_(0.3);

//   // ── Build the "file" as a flat line array (single source of truth
//   // for both the gutter numbers and the code) ────────────────────────────
//   const lines: Line[] = [
//     {
//       cat: -1,
//       indent: 0,
//       node: <span style={{ color: comment }}>// exported stack manifest</span>,
//     },
//     {
//       cat: -1,
//       indent: 0,
//       node: (
//         <>
//           <span style={{ color: kw }}>export const</span> stack ={" "}
//           <span style={{ color: punct }}>{"{"}</span>
//         </>
//       ),
//     },
//   ];

//   CATEGORIES.forEach((cat, ci) => {
//     const skills = SKILLS[cat.key as CategoryKey] as readonly string[];
//     lines.push({
//       cat: ci,
//       indent: 1,
//       node: (
//         <>
//           <span style={{ color: keyColor }}>{cat.label}</span>
//           <span style={{ color: punct }}>: [</span>
//         </>
//       ),
//     });
//     skills.forEach((skill, si) => {
//       lines.push({
//         cat: ci,
//         indent: 2,
//         node:
//           si === 0 ? (
//             <>
//               <span style={{ color: t.accent }}>&quot;{skill}&quot;</span>
//               <span style={{ color: punct }}>,</span>{" "}
//               <span style={{ color: comment }}>// core</span>
//             </>
//           ) : (
//             <>
//               <span style={{ color: strColor }}>&quot;{skill}&quot;</span>
//               <span style={{ color: punct }}>,</span>
//             </>
//           ),
//       });
//     });
//     lines.push({
//       cat: ci,
//       indent: 1,
//       node: <span style={{ color: punct }}>],</span>,
//     });
//   });

//   lines.push({
//     cat: -1,
//     indent: 0,
//     node: (
//       <>
//         <span style={{ color: punct }}>{"}"}</span>{" "}
//         <span style={{ color: kw }}>as const</span>
//         <span style={{ color: punct }}>;</span>
//       </>
//     ),
//   });

//   const totalSkills = CATEGORIES.reduce(
//     (sum, c) =>
//       sum + (SKILLS[c.key as CategoryKey] as readonly string[]).length,
//     0,
//   );

//   return (
//     <section id="skills" className="section">
//       <div className="container">
//         <Reveal className="section-head">
//           <span className="mono-label">Skills</span>
//           <h2 className="section-title">
//             <ScrambleText text="The stack, typed" active speed={20} />
//           </h2>
//         </Reveal>

//         <Reveal delay={0.1}>
//           <div
//             className="card"
//             style={{
//               padding: 0,
//               overflow: "hidden",
//               background: t.terminalBg,
//               backdropFilter: "blur(8px)",
//             }}
//           >
//             {/* window chrome */}
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//                 padding: "0.65rem 1rem",
//                 background: t.terminalHeaderBg,
//                 borderBottom: `1px solid ${t.fg_(0.08)}`,
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "0.65rem",
//                 }}
//               >
//                 <div style={{ display: "flex", gap: "0.35rem" }} aria-hidden>
//                   {[0.5, 0.35, 0.22].map((a, i) => (
//                     <span
//                       key={i}
//                       style={{
//                         width: 9,
//                         height: 9,
//                         borderRadius: "50%",
//                         background: t.fg_(a),
//                       }}
//                     />
//                   ))}
//                 </div>
//                 <span className="mono-label" style={{ opacity: 0.75 }}>
//                   stack.config.ts
//                 </span>
//               </div>
//               <span
//                 className="mono-label"
//                 style={{
//                   fontSize: "0.7rem",
//                   color: t.accent,
//                   background: t.ac_(0.1),
//                   padding: "0.2rem 0.55rem",
//                   borderRadius: "4px",
//                 }}
//               >
//                 TypeScript
//               </span>
//             </div>

//             {/* code body */}
//             <div
//               style={{ display: "flex", fontSize: "0.85rem", lineHeight: 1.9 }}
//             >
//               <div
//                 aria-hidden
//                 style={{
//                   padding: "1.25rem 0.9rem",
//                   textAlign: "right",
//                   color: t.fg_(0.2),
//                   userSelect: "none",
//                   borderRight: `1px solid ${t.fg_(0.06)}`,
//                   flexShrink: 0,
//                 }}
//               >
//                 {lines.map((_, i) => (
//                   <div key={i}>{i + 1}</div>
//                 ))}
//               </div>

//               <div
//                 style={{
//                   padding: "1.25rem",
//                   overflowX: "auto",
//                   flex: 1,
//                   minWidth: 0,
//                 }}
//               >
//                 {lines.map((line, i) => (
//                   <div
//                     key={i}
//                     onMouseEnter={() => line.cat >= 0 && setActiveCat(line.cat)}
//                     onMouseLeave={() => setActiveCat(-1)}
//                     style={{
//                       whiteSpace: "pre",
//                       paddingLeft: `${line.indent * 2}ch`,
//                       opacity:
//                         activeCat === -1 ||
//                         line.cat === -1 ||
//                         activeCat === line.cat
//                           ? 1
//                           : 0.4,
//                       background:
//                         line.cat >= 0 && activeCat === line.cat
//                           ? t.ac_(0.05)
//                           : "transparent",
//                       transition: "opacity 0.2s ease, background 0.2s ease",
//                     }}
//                   >
//                     {line.node}
//                   </div>
//                 ))}
//                 <span
//                   className="skills-cursor"
//                   style={{ color: t.accent }}
//                   aria-hidden
//                 >
//                   ▍
//                 </span>
//               </div>
//             </div>

//             {/* stats bar */}
//             <div
//               style={{
//                 display: "flex",
//                 gap: "1.25rem",
//                 padding: "0.55rem 1.25rem",
//                 background: t.terminalStatsBg,
//                 borderTop: `1px solid ${t.fg_(0.06)}`,
//                 fontSize: "0.72rem",
//                 color: t.fg_(0.45),
//               }}
//               className="mono-label"
//             >
//               <span>{CATEGORIES.length} categories</span>
//               <span>{totalSkills} skills</span>
//               <span>UTF-8</span>
//             </div>
//           </div>
//         </Reveal>
//       </div>

//       <style>{`
//         .skills-cursor {
//           animation: skills-blink 1.1s steps(1) infinite;
//         }
//         @media (prefers-reduced-motion: reduce) {
//           .skills-cursor { animation: none; opacity: 0.6; }
//         }
//         @keyframes skills-blink {
//           0%, 49% { opacity: 1; }
//           50%, 100% { opacity: 0; }
//         }
//       `}</style>
//     </section>
//   );
// };

/**
 * Skills.tsx — split-editor code window.
 *
 * Two panes side by side, each its own pseudo-file with independent
 * line numbers — mirrors a real split editor. The two-column layout
 * naturally halves total vertical height vs one long file, so there's
 * no need for an internal scroll cap (which read as janky, nested
 * scrolling). Panes stack vertically on small screens. Fully static
 * text at rest — hover only dims sibling categories for focus.
 */
/**
 * Skills.tsx — split-editor code window.
 *
 * Two panes side by side, each its own pseudo-file with independent
 * line numbers — mirrors a real split editor. The two-column layout
 * naturally halves total vertical height vs one long file, so there's
 * no need for an internal scroll cap (which read as janky, nested
 * scrolling). Panes stack vertically on small screens. Fully static
 * text at rest — hover only dims sibling categories for focus.
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
// work — Alchemy, MetaMask, Docker, AWS are how it actually ships),
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

export const Skills = () => {
  const t = useTheme();
  const [activeCat, setActiveCat] = useState<string>("");

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
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              background: t.terminalBg,
              backdropFilter: "blur(8px)",
            }}
          >
            {/* window chrome */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 1rem",
                background: t.terminalHeaderBg,
                borderBottom: `1px solid ${t.fg_(0.08)}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.35rem" }} aria-hidden>
                  {[0.5, 0.35, 0.22].map((a, i) => (
                    <span
                      key={i}
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: t.fg_(a),
                      }}
                    />
                  ))}
                </div>
                <span className="mono-label" style={{ opacity: 0.75 }}>
                  src/stack/
                </span>
              </div>
              <span
                className="mono-label"
                style={{
                  fontSize: "0.7rem",
                  color: t.accent,
                  background: t.ac_(0.1),
                  padding: "0.2rem 0.55rem",
                  borderRadius: "4px",
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
