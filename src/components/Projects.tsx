/**
 * Projects.tsx
 *
 * ── Stage 7: the section stopped growing ──
 * Eleven projects in a two-column grid was six rows of scroll, and eleven on a
 * phone. The fix is structural rather than cosmetic:
 *
 *  · Cards live in a paged horizontal rail (ProjectDeck), so the section has a
 *    fixed height no matter how many projects the filter matched.
 *  · Everything a card cannot hold moved into a drawer that opens below the
 *    rail on demand: the Kestrel and ChronoShield boards, the build toolkit's
 *    before/after table. Default state shows none of it, so the page is as
 *    short as it was before any of this existed.
 *  · The order book brief collapses to a single row.
 *
 * One drawer at a time, deliberately. Two open boards is the vertical sprawl
 * this was meant to remove, and a reader comparing two projects is better
 * served by closing one than by scrolling past both.
 *
 * DEXOrderBook itself remains untouched.
 */
import { useRef, useState } from "react";
import { Github, ArrowUpRight, X } from "lucide-react";
import { projectsData, type Project } from "../data/projects";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { DEXOrderBook } from "./Dexorderbook";
import { Reveal } from "./motion/Reveal";
import { TiltCard } from "./motion/TiltCard";
import { Takeaway } from "./patterns/Takeaway";
import { BeforeAfter } from "./patterns/BeforeAfter";
import { ProjectBoard } from "./patterns/ProjectBoard";
import { OrderBookBrief } from "./patterns/OrderBookBrief";
import { ProjectDeck } from "./patterns/ProjectDeck";

const CATEGORIES = ["all", "web", "blockchain", "fullstack", "build-tools"] as const;
const ALL_TABS = [...CATEGORIES, "dex"] as const;
type Tab = (typeof ALL_TABS)[number];

const tabLabel = (tab: Tab): string =>
  tab === "dex" ? "DEX / Order Book" : tab === "build-tools" ? "Build tools" : tab;

const hasDetail = (p: Project): boolean => !!p.board || !!p.comparison;

export const Projects = () => {
  const t = useTheme();
  const [filter, setFilter] = useState<Tab>("dex");
  const [openId, setOpenId] = useState<number | null>(null);
  const isDexTab = filter === "dex";

  const filtered = isDexTab
    ? []
    : filter === "all"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);

  /**
   * The drawer collapses to zero height rather than unmounting, so its content
   * has to survive the close in order to animate out. This holds the last
   * project that was open purely so there is something to collapse.
   */
  const shown = useRef<Project | null>(null);
  const open = filtered.find((p) => p.id === openId) ?? null;
  if (open) shown.current = open;

  const toggle = (p: Project): void =>
    setOpenId((cur) => (cur === p.id ? null : p.id));

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
            className="proj-tabs"
          >
            {ALL_TABS.map((tab) => {
              const active = filter === tab;
              const isDex = tab === "dex";
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(tab);
                    // A different list makes an open drawer meaningless.
                    setOpenId(null);
                  }}
                  className="proj-tab"
                  style={{
                    border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                    background: active ? t.accent : "transparent",
                    color: active ? t.bg : isDex ? t.ac_(0.8) : t.fg_(0.5),
                  }}
                >
                  {isDex && !active && (
                    <span className="proj-tab-dot" aria-hidden="true" />
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
            <Takeaway>
              The gap between an exchange price and the oracle price a contract
              actually reads is the number that matters. This shows both.
            </Takeaway>
            <div className="dex-wrap">
              <DEXOrderBook />
            </div>
            <OrderBookBrief />
          </Reveal>
        )}

        {/* Deck + drawer */}
        {!isDexTab && (
          <Reveal delay={0.1}>
            <ProjectDeck resetKey={filter} label={`${tabLabel(filter)} projects`}>
              {filtered.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  open={openId === project.id}
                  onToggle={() => toggle(project)}
                />
              ))}
            </ProjectDeck>

            <div className="drawer" data-open={open ? "true" : "false"}>
              <div className="drawer-inner">
                {shown.current && (
                  <div className="drawer-body">
                    <div className="drawer-head">
                      <span className="mono-label">{shown.current.title}</span>
                      <button
                        className="drawer-close"
                        onClick={() => setOpenId(null)}
                        aria-label="Close details"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    {shown.current.board && (
                      <ProjectBoard
                        data={shown.current.board}
                        active={!!open}
                      />
                    )}
                    {shown.current.comparison && (
                      <BeforeAfter
                        data={shown.current.comparison}
                        active={!!open}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
};

const ProjectCard = ({
  project,
  index,
  open,
  onToggle,
}: {
  project: Project;
  index: number;
  open: boolean;
  onToggle: () => void;
}) => {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);

  const hasGithub = project.github && project.github !== "Private REPO";
  const hasLive = project.live && project.live !== "Not Live Yet";

  return (
    <div className="deck-card" data-open={open ? "true" : "false"}>
      <TiltCard style={{ height: "100%" }}>
        <div
          className="pcard"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Meta row */}
          <div className="pcard-meta">
            <span
              className="data-text"
              style={{ fontSize: "0.6rem", letterSpacing: "0.18em", color: t.fg_(0.28) }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="chip">{project.category}</span>
          </div>

          <h3
            className="pcard-title"
            style={{ color: hovered || open ? t.accent : t.fg }}
          >
            {project.title}
          </h3>

          {/* The claim, before the evidence. */}
          <Takeaway>{project.takeaway}</Takeaway>

          <p className="body-text pcard-desc">{project.description}</p>

          {/* Tech chips. The full stack unfolds on hover. */}
          <div className="pcard-chips">
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

          {/* Links + details */}
          <div className="pcard-foot">
            {hasGithub && (
              <a
                href={project.github ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="pcard-link"
                style={{ color: hovered ? t.accent : t.fg_(0.45) }}
              >
                <Github size={13} /> Code
              </a>
            )}
            {hasLive && (
              <a
                href={project.live ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="pcard-link"
                style={{ color: hovered ? t.accent : t.fg_(0.45) }}
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

            {hasDetail(project) && (
              <button
                className="pcard-details"
                onClick={onToggle}
                aria-expanded={open}
              >
                {open ? "Hide detail" : "Detail"}
                <span className="pcard-details-mark" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </TiltCard>
    </div>
  );
};
