/**
 * Projects.tsx
 *
 * ── Stage 8: detail arrives where you are looking ──
 * The previous version opened detail in a drawer below the deck. On a short
 * viewport that put the answer off-screen, so clicking appeared to do nothing,
 * and the drawer's translucent surface over a live 3D scene was close to
 * unreadable once you found it. Both problems come from treating detail as more
 * page rather than as a change of state in the card you touched.
 *
 * Now the deck sits on a *stage*: a positioned box the cards fill. Opening a
 * project expands a view over that stage, scaling out of the clicked card's own
 * centre, while the deck dims and blurs underneath. Nothing reflows, nothing
 * moves down the page, and the panel is bounded by the space you were already
 * looking at.
 *
 * ── Every card opens ──
 * Detail used to be a privilege of the two projects with boards, which made the
 * affordance inconsistent and meant a card had to carry its full description in
 * case it was one of the ones that could not expand. Now every card opens, so
 * card copy can be trimmed to three lines and the full text lives in the view.
 * That shortens the deck as a side effect of making it consistent.
 *
 * The view also carries prev/next, so a reader can go through the work without
 * closing and reopening. Cheap to add and it turns a lookup into browsing.
 *
 * ── One interaction language for the whole section ──
 * The order book's explainer had the identical disease: a toggle below the
 * terminal that opened off-screen on a short viewport. It now opens the same
 * way, over its own stage, from its own trigger, using the same shell. After
 * seeing one panel open, a reader knows what every other one here will do.
 *
 * Scoped to the two stages rather than the whole section, so headings and body
 * and much worse idea than a terminal that does.
 *
 * DEXOrderBook itself remains untouched.
 */
import { useCallback, useRef, useState } from "react";
import { Github, ArrowUpRight, Maximize2, Info } from "lucide-react";
import { projectsData, type Project } from "../data/projects";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { DEXOrderBook } from "./Dexorderbook";
import { Reveal } from "./motion/Reveal";
import { TiltCard } from "./motion/TiltCard";
import { Takeaway } from "./patterns/Takeaway";
import { OrderBookBrief } from "./patterns/OrderBookBrief";
import { ProjectDeck } from "./patterns/ProjectDeck";
import { ProjectView } from "./patterns/ProjectView";
import { useExpandable } from "./patterns/useExpandable";

const CATEGORIES = [
  "all",
  "web",
  "blockchain",
  "fullstack",
  "build-tools",
] as const;
const ALL_TABS = [...CATEGORIES, "dex"] as const;
type Tab = (typeof ALL_TABS)[number];

const tabLabel = (tab: Tab): string =>
  tab === "dex"
    ? "DEX / Order Book"
    : tab === "build-tools"
      ? "Build tools"
      : tab;

const countFor = (tab: Tab): number =>
  tab === "dex"
    ? 0
    : tab === "all"
      ? projectsData.length
      : projectsData.filter((p) => p.category === tab).length;

export const Projects = () => {
  const t = useTheme();
  const [filter, setFilter] = useState<Tab>("dex");

  const stageRef = useRef<HTMLDivElement>(null);
  const dexStageRef = useRef<HTMLDivElement>(null);

  // Same mechanics for both panels: expand origin, exit phase, focus return.
  const detail = useExpandable<number>(stageRef);
  const brief = useExpandable<true>(dexStageRef);
  /** Stops the trigger's attention pulse once it has done its job. */
  const [briefSeen, setBriefSeen] = useState(false);

  const isDexTab = filter === "dex";
  const filtered = isDexTab
    ? []
    : filter === "all"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);

  const openIdx = detail.item;
  const active = openIdx !== null ? (filtered[openIdx] ?? null) : null;

  const step = useCallback(
    (delta: number) => {
      if (openIdx === null || filtered.length === 0) return;
      detail.replace((openIdx + delta + filtered.length) % filtered.length);
    },
    [openIdx, filtered.length, detail],
  );

  /**
   * Jumping to a related project. It may not be in the current filter, in which
   * case widening to "all" is the only way to show it, and the deck behind is
   * dimmed anyway so the change costs the reader nothing they can see.
   */
  const selectProject = useCallback(
    (target: Project) => {
      const here = filtered.findIndex((p) => p.id === target.id);
      if (here >= 0) {
        detail.replace(here);
        return;
      }
      setFilter("all");
      detail.replace(projectsData.findIndex((p) => p.id === target.id));
    },
    [filtered, detail],
  );

  return (
    <section id="projects" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">Projects</span>
          <h2 className="section-title">
            <ScrambleText text="Selected work" active speed={24} />
          </h2>
        </Reveal>

        {/* Filters. Counts sit in the pill so the size of each set is legible
            before you commit to switching to it. */}
        <Reveal delay={0.06}>
          <div
            role="tablist"
            aria-label="Project categories"
            className="proj-tabs"
          >
            {ALL_TABS.map((tab) => {
              const isActive = filter === tab;
              const isDex = tab === "dex";
              const count = countFor(tab);
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setFilter(tab);
                    detail.close();
                  }}
                  className="proj-tab"
                  style={{
                    border: `1px solid ${isActive ? "transparent" : "var(--border)"}`,
                    background: isActive ? t.accent : "transparent",
                    color: isActive ? t.bg : isDex ? t.ac_(0.8) : t.fg_(0.5),
                  }}
                >
                  {isDex && !isActive && (
                    <span className="proj-tab-dot" aria-hidden="true" />
                  )}
                  {tabLabel(tab)}
                  {!isDex && <span className="proj-tab-count">{count}</span>}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* DEX centrepiece */}
        {isDexTab && (
          <Reveal delay={0.1}>
            {/* Trigger above the terminal, so the panel grows downward over the
                thing it describes rather than out of empty space below it. */}
            <div className="dex-head">
              <Takeaway>
                The gap between an exchange price and the oracle price a
                contract actually reads is the number that matters. This shows
                both.
              </Takeaway>
              {/*
                Was a ghost pill borrowed from the project cards, which made the
                one control on this tab read as the quietest thing on it. It now
                carries the accent as a border and a tint, and a soft halo that
                pulses until it has been opened once. Discoverability first,
                restraint second: it is the only affordance here, so it can
                afford to be the loudest thing that is not the terminal.
              */}
              <button
                className="dex-explain"
                data-seen={briefSeen ? "true" : "false"}
                onClick={(e) => {
                  setBriefSeen(true);
                  brief.openWith(true, e.currentTarget);
                }}
              >
                <Info size={13} />
                <span>How this works</span>
              </button>
            </div>

            <div className="pstage dex-stage" ref={dexStageRef}>
              <div
                className="dex-wrap"
                data-dimmed={brief.item ? "true" : "false"}
              >
                <DEXOrderBook />
              </div>

              {brief.item && (
                <button
                  className="pstage-scrim"
                  onClick={brief.close}
                  aria-label="Close"
                  tabIndex={-1}
                />
              )}
              {brief.item && (
                <OrderBookBrief
                  closing={brief.closing}
                  origin={brief.origin}
                  onClose={brief.close}
                />
              )}
            </div>
          </Reveal>
        )}

        {/* Deck and the view that opens over it */}
        {!isDexTab && (
          <Reveal delay={0.1}>
            <div className="pstage" ref={stageRef}>
              {/* Keyed on the filter so a new set of cards animates in rather
                  than being swapped underneath the reader. */}
              <ProjectDeck
                key={filter}
                resetKey={filter}
                label={`${tabLabel(filter)} projects`}
                dimmed={active !== null}
              >
                {filtered.map((project, i) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={i}
                    onOpen={(el) => detail.openWith(i, el)}
                  />
                ))}
              </ProjectDeck>

              {/* Click-off. Sits under the panel, over the dimmed deck. */}
              {active && (
                <button
                  className="pstage-scrim"
                  onClick={detail.close}
                  aria-label="Close detail"
                  tabIndex={-1}
                />
              )}

              {active && openIdx !== null && (
                <ProjectView
                  project={active}
                  index={openIdx}
                  total={filtered.length}
                  closing={detail.closing}
                  origin={detail.origin}
                  onPrev={() => step(-1)}
                  onNext={() => step(1)}
                  onClose={detail.close}
                  onSelect={selectProject}
                />
              )}
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
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: (el: HTMLElement) => void;
}) => {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);

  const hasGithub = project.github && project.github !== "Private REPO";
  const hasLive = project.live && project.live !== "Not Live Yet";

  return (
    <div className="deck-card">
      <TiltCard className="pcard-shell" style={{ height: "100%" }}>
        <div
          className="pcard"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* The index as a watermark rather than a label: it gives each card a
              distinct silhouette at a glance without adding another line of
              type competing with the title. */}
          <span className="pcard-num" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div className="pcard-meta">
            <span className="chip">{project.category}</span>
          </div>

          <h3
            className="pcard-title"
            style={{ color: hovered ? t.accent : t.fg }}
          >
            {project.title}
          </h3>

          <Takeaway>{project.takeaway}</Takeaway>

          {/* Clamped: the full text is one click away in the view, and uniform
              card height is what keeps the deck a predictable size. */}
          <p className="body-text pcard-desc">{project.description}</p>

          <div className="pcard-chips">
            {project.technologies.slice(0, 3).map((tech) => (
              <span key={tech} className="chip">
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="chip" style={{ borderStyle: "dashed" }}>
                +{project.technologies.length - 3}
              </span>
            )}
          </div>

          <div className="pcard-foot">
            {hasGithub && (
              <a
                href={project.github ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="pcard-link"
                onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => e.stopPropagation()}
              >
                <ArrowUpRight size={13} /> Live
              </a>
            )}

            <button
              className="pcard-open"
              onClick={(e) => onOpen(e.currentTarget)}
              aria-label={`Open ${project.title} detail`}
            >
              <span>Detail</span>
              <Maximize2 size={12} />
            </button>
          </div>
        </div>
      </TiltCard>
    </div>
  );
};
