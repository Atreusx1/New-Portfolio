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
 * DEXOrderBook itself remains untouched.
 */
import { useCallback, useRef, useState } from "react";
import { Github, ArrowUpRight, Maximize2 } from "lucide-react";
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

const CATEGORIES = ["all", "web", "blockchain", "fullstack", "build-tools"] as const;
const ALL_TABS = [...CATEGORIES, "dex"] as const;
type Tab = (typeof ALL_TABS)[number];

const tabLabel = (tab: Tab): string =>
  tab === "dex" ? "DEX / Order Book" : tab === "build-tools" ? "Build tools" : tab;

const countFor = (tab: Tab): number =>
  tab === "dex"
    ? 0
    : tab === "all"
      ? projectsData.length
      : projectsData.filter((p) => p.category === tab).length;

export const Projects = () => {
  const t = useTheme();
  const [filter, setFilter] = useState<Tab>("dex");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const stageRef = useRef<HTMLDivElement>(null);
  /** The button that opened the view, so focus can go back where it came from. */
  const opener = useRef<HTMLElement | null>(null);

  const isDexTab = filter === "dex";
  const filtered = isDexTab
    ? []
    : filter === "all"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);

  /**
   * Expand origin: the clicked card's centre as a percentage of the stage. This
   * is the whole trick behind the view looking like it grew out of that card
   * rather than out of the middle of the section.
   */
  const open = useCallback((i: number, el: HTMLElement) => {
    const stage = stageRef.current;
    const card = el.closest(".deck-card");
    if (stage && card) {
      const s = stage.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      setOrigin({
        x: ((c.left + c.width / 2 - s.left) / s.width) * 100,
        y: ((c.top + c.height / 2 - s.top) / s.height) * 100,
      });
    }
    opener.current = el;
    setOpenIdx(i);
  }, []);

  const close = useCallback(() => {
    setOpenIdx(null);
    opener.current?.focus({ preventScroll: true });
    opener.current = null;
  }, []);

  const step = useCallback(
    (delta: number) => {
      setOpenIdx((cur) =>
        cur === null ? cur : (cur + delta + filtered.length) % filtered.length,
      );
    },
    [filtered.length],
  );

  const active = openIdx !== null ? (filtered[openIdx] ?? null) : null;

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
          <div role="tablist" aria-label="Project categories" className="proj-tabs">
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
                    setOpenIdx(null);
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

        {/* Deck and the view that opens over it */}
        {!isDexTab && (
          <Reveal delay={0.1}>
            <div className="pstage" ref={stageRef}>
              <ProjectDeck
                resetKey={filter}
                label={`${tabLabel(filter)} projects`}
                dimmed={active !== null}
              >
                {filtered.map((project, i) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={i}
                    onOpen={(el) => open(i, el)}
                  />
                ))}
              </ProjectDeck>

              {/* Click-off. Sits under the panel, over the dimmed deck. */}
              {active && (
                <button
                  className="pstage-scrim"
                  onClick={close}
                  aria-label="Close detail"
                  tabIndex={-1}
                />
              )}

              {active && openIdx !== null && (
                <ProjectView
                  project={active}
                  index={openIdx}
                  total={filtered.length}
                  origin={origin}
                  onPrev={() => step(-1)}
                  onNext={() => step(1)}
                  onClose={close}
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

          <h3 className="pcard-title" style={{ color: hovered ? t.accent : t.fg }}>
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
