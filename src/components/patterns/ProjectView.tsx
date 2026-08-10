/**
 * ProjectView.tsx
 *
 * ── What this replaced ──
 * Detail used to open in a drawer *below* the deck. On a short viewport that
 * put the answer off-screen: you clicked, nothing visibly happened, and the
 * content was waiting somewhere you had no reason to look. Both that and the
 * unreadable translucent surface came from treating detail as more page rather
 * than as a change of state in the thing you touched.
 *
 * The view expands over the deck, scaling out of the clicked card's own centre,
 * while the deck dims and blurs underneath. Nothing reflows and the answer
 * arrives where your eye already is.
 *
 * ── Height follows content ──
 * The first version pinned itself to `inset: 0`, which filled the whole stage
 * whatever it had to say. A project with a board looked right; a project with
 * three sentences left several hundred pixels of empty panel underneath the
 * last line, which reads as something failing to load. It is now top-anchored
 * with a max height, so short projects get a short panel floating over the
 * blurred deck and only long ones scroll.
 *
 * ── Related work fills the space usefully, not decoratively ──
 * Rather than padding a sparse panel, the footer offers projects sharing a
 * technology with this one. Sparse projects are exactly the ones where a reader
 * is most likely to want somewhere else to go, and it turns dead space into
 * navigation instead of filler.
 *
 * It is deliberately not a modal: bounded by the section, no scroll lock, no
 * focus trap, because it is a detail view inside a section rather than an
 * interruption. Escape closes, arrows move between projects, focus returns to
 * the card that opened it.
 */
import { useEffect, useMemo, useRef } from "react";
import { Github, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { projectsData, type Project } from "../../data/projects";
import { Takeaway } from "./Takeaway";
import { ProjectBoard } from "./ProjectBoard";
import { BeforeAfter } from "./BeforeAfter";

export interface ProjectViewProps {
  project: Project;
  index: number;
  total: number;
  closing: boolean;
  /** Percentage coordinates within the stage, for the expand origin. */
  origin: { x: number; y: number };
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onSelect: (project: Project) => void;
}

/** Up to three other projects sharing at least one technology. */
const relatedTo = (project: Project): Project[] =>
  projectsData
    .filter(
      (p) =>
        p.id !== project.id &&
        p.technologies.some((t) => project.technologies.includes(t)),
    )
    .slice(0, 3);

export const ProjectView = ({
  project,
  index,
  total,
  closing,
  origin,
  onPrev,
  onNext,
  onClose,
  onSelect,
}: ProjectViewProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const related = useMemo(() => relatedTo(project), [project]);

  // Focus moves to the panel so a keyboard user is not left behind on a card
  // that is now dimmed and inert.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowLeft") {
        onPrev();
      } else if (e.key === "ArrowRight") {
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const hasGithub = project.github && project.github !== "Private REPO";
  const hasLive = project.live && project.live !== "Not Live Yet";

  return (
    <div
      className="pv glass"
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label={`${project.title} detail`}
      data-closing={closing ? "true" : "false"}
      style={
        {
          "--pv-ox": `${origin.x}%`,
          "--pv-oy": `${origin.y}%`,
        } as React.CSSProperties
      }
    >
      {/*
        macOS title bar, matching the window Skills is already drawn as, so the
        two most detailed surfaces on the site read as the same object.

        Only the red light is a control. The other two are decoration and marked
        as such: a minimise or a zoom that did nothing would be worse than not
        drawing them, and there is nothing here to minimise to. They keep the
        chrome recognisable, which is what earns the close affordance its
        instant legibility.
      */}
      <header className="pv-head">
        <div className="pv-lights">
          <button
            className="pv-light"
            data-c="close"
            onClick={onClose}
            aria-label="Close detail"
          >
            <span className="pv-light-glyph" aria-hidden="true">
              &times;
            </span>
          </button>
          <span className="pv-light" data-c="min" aria-hidden="true">
            <span className="pv-light-glyph">&minus;</span>
          </span>
          <span className="pv-light" data-c="zoom" aria-hidden="true">
            <span className="pv-light-glyph">+</span>
          </span>
        </div>

        {/* Absolutely centred, so it stays centred whatever the sides weigh. */}
        <span className="mono-label pv-titlebar">
          {String(index + 1).padStart(2, "0")} &middot; {project.title}
        </span>

        <div className="pv-nav">
          <button
            className="pv-btn"
            onClick={onPrev}
            aria-label="Previous project"
            disabled={total < 2}
          >
            <ChevronLeft size={13} />
          </button>
          <span className="pv-pos">
            {index + 1} / {total}
          </span>
          <button
            className="pv-btn"
            onClick={onNext}
            aria-label="Next project"
            disabled={total < 2}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </header>

      {/*
        Keyed on the project so switching with the arrows replays the content
        stagger. Without the key the panel swaps text in place, which reads as a
        glitch rather than as navigation.
      */}
      <div className="pv-body" data-lenis-prevent key={project.id}>
        <div className="pv-meta">
          <span className="chip">{project.category}</span>
        </div>

        <Takeaway size="lead">{project.takeaway}</Takeaway>

        <p className="body-text pv-desc">{project.description}</p>

        {project.board && <ProjectBoard data={project.board} active />}
        {project.comparison && <BeforeAfter data={project.comparison} active />}

        <div className="pv-stack">
          <span className="mono-label">Stack</span>
          <div className="pv-chips">
            {project.technologies.map((tech) => (
              <span className="chip" key={tech}>
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="pv-foot">
          <div className="pv-links">
            {hasGithub && (
              <a
                href={project.github ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline pv-link"
              >
                <Github size={14} /> Source
              </a>
            )}
            {hasLive && (
              <a
                href={project.live ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary pv-link"
              >
                Visit <ArrowUpRight size={14} />
              </a>
            )}
            {!hasGithub && !hasLive && (
              <span className="pv-private">Private repository</span>
            )}
          </div>

          {related.length > 0 && (
            <div className="pv-related">
              <span className="mono-label">Shares a stack with</span>
              <div className="pv-related-list">
                {related.map((r) => (
                  <button
                    className="pv-related-item"
                    key={r.id}
                    onClick={() => onSelect(r)}
                  >
                    {r.title}
                    <ChevronRight size={11} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
