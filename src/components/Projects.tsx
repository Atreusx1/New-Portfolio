/**
 * Projects.tsx — redesigned.
 *
 * The one-visible-at-a-time carousel becomes a responsive grid of tilt
 * cards — every project visible at once (less scrolling, more scanning),
 * each with a pointer-following glow, and links/full tech stack that
 * rise into view on hover. Keyboard/touch users see the links always
 * (hover reveal is progressive enhancement, not gatekeeping).
 *
 * The DEX / Order Book tab — the portfolio's centerpiece demo — is
 * preserved exactly, wired to the untouched <DEXOrderBook />.
 */
import { useState } from "react";
import { Github, ArrowUpRight } from "lucide-react";
import { projectsData, type Project } from "../data/projects";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { DEXOrderBook } from "./Dexorderbook";
import { Reveal } from "./motion/Reveal";
import { TiltCard } from "./motion/TiltCard";

const CATEGORIES = ["all", "web", "blockchain", "fullstack", "build-tools"] as const;
const ALL_TABS = [...CATEGORIES, "dex"] as const;
type Tab = (typeof ALL_TABS)[number];

const tabLabel = (tab: Tab): string =>
  tab === "dex" ? "DEX / Order Book" : tab === "build-tools" ? "Build tools" : tab;

export const Projects = () => {
  const t = useTheme();
  const [filter, setFilter] = useState<Tab>("dex");
  const isDexTab = filter === "dex";

  const filtered = isDexTab
    ? []
    : filter === "all"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);

  return (
    <section id="projects" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">Projects</span>
          <h2 className="section-title">
            <ScrambleText text="Selected work" active speed={24} />
          </h2>
        </Reveal>

        {/* Tabs */}
        <Reveal delay={0.06}>
          <div
            role="tablist"
            aria-label="Project categories"
            style={{
              display: "flex",
              gap: "0.35rem",
              flexWrap: "wrap",
              marginBottom: "2rem",
            }}
          >
            {ALL_TABS.map((tab) => {
              const active = filter === tab;
              const isDex = tab === "dex";
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab)}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 550,
                    textTransform: "capitalize",
                    padding: "0.5rem 1rem",
                    borderRadius: 999,
                    border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                    background: active ? t.accent : "transparent",
                    color: active ? t.bg : isDex ? t.ac_(0.8) : t.fg_(0.5),
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  {isDex && !active && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: t.accent,
                        animation: "blink 2s ease-in-out infinite",
                      }}
                    />
                  )}
                  {tabLabel(tab)}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* DEX centerpiece */}
        {isDexTab && (
          <Reveal delay={0.1}>
            <div className="mono-label" style={{ marginBottom: "0.9rem" }}>
              Decentralized order book · live price feed · simulated CLOB depth
            </div>
            <DEXOrderBook />
          </Reveal>
        )}

        {/* Grid */}
        {!isDexTab && (
          <div className="grid-projects">
            {filtered.map((project, i) => (
              <Reveal key={project.title} delay={0.05 * (i % 4)}>
                <ProjectCard project={project} index={i} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);

  const hasGithub = project.github && project.github !== "Private REPO";
  const hasLive = project.live && project.live !== "Not Live Yet";

  return (
    <TiltCard
      style={{ padding: "1.75rem", minHeight: "250px", display: "flex", flexDirection: "column" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: "flex", flexDirection: "column", flex: 1 }}
      >
        {/* Meta row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <span
            className="data-text"
            style={{ fontSize: "0.6rem", letterSpacing: "0.18em", color: t.fg_(0.28) }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="chip">{project.category}</span>
        </div>

        {/* Title + description */}
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.125rem",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.25,
            color: hovered ? t.accent : t.fg,
            transition: "color 0.25s ease",
            marginBottom: "0.6rem",
          }}
        >
          {project.title}
        </h3>
        <p
          className="body-text"
          style={{ fontSize: "0.84rem", flex: 1, marginBottom: "1.25rem" }}
        >
          {project.description}
        </p>

        {/* Tech chips — full stack unfolds on hover */}
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            flexWrap: "wrap",
            marginBottom: "1.1rem",
          }}
        >
          {(hovered ? project.technologies : project.technologies.slice(0, 4)).map(
            (tech) => (
              <span
                key={tech}
                className="chip"
                style={{ animation: hovered ? "fadeIn 0.3s ease" : undefined }}
              >
                {tech}
              </span>
            ),
          )}
          {!hovered && project.technologies.length > 4 && (
            <span className="chip" style={{ borderStyle: "dashed" }}>
              +{project.technologies.length - 4}
            </span>
          )}
        </div>

        {/* Links */}
        <div
          style={{
            display: "flex",
            gap: "1.2rem",
            paddingTop: "0.9rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {hasGithub && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontFamily: "var(--font-body)",
                fontSize: "0.75rem",
                fontWeight: 550,
                color: hovered ? t.accent : t.fg_(0.45),
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
            >
              <Github size={13} /> Code
            </a>
          )}
          {hasLive && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontFamily: "var(--font-body)",
                fontSize: "0.75rem",
                fontWeight: 550,
                color: hovered ? t.accent : t.fg_(0.45),
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
            >
              <ArrowUpRight size={13} /> Live
            </a>
          )}
          {!hasGithub && !hasLive && (
            <span
              className="data-text"
              style={{ fontSize: "0.62rem", color: t.fg_(0.28), letterSpacing: "0.1em" }}
            >
              PRIVATE
            </span>
          )}
        </div>
      </div>
    </TiltCard>
  );
};
