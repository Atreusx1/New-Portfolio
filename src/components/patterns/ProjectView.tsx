/**
 * ProjectView.tsx
 *
 * ── The problem this replaces ──
 * Detail used to open in a drawer *below* the deck. On a short viewport that
 * put the answer off-screen: you clicked, nothing visibly happened, and the
 * content you asked for was waiting somewhere you had no reason to look. The
 * drawer was also translucent over a moving 3D background, so once you found it
 * you could barely read it.
 *
 * Both failures have the same root. Detail was treated as *more page* rather
 * than as a change of state in the thing you touched.
 *
 * ── The fix ──
 * The view expands over the deck, filling exactly the space the cards occupied,
 * scaling up from the centre of the card you clicked. Nothing moves, nothing
 * reflows, and the answer arrives where your eye already is. The deck dims and
 * blurs behind it, so the relationship reads as "this card opened" rather than
 * "a new panel appeared".
 *
 * `transform-origin` is set per open from the clicked card's centre relative to
 * the stage, which is what makes it look like it grew out of that card rather
 * than out of the middle of the section.
 *
 * ── Readability ──
 * It is glass, but glass over a live 3D scene has to earn its transparency.
 * The surface overrides the shared --glass tokens locally to a much higher
 * opacity than a nav pill needs: enough to read three paragraphs against a
 * moving particle field, still translucent enough to belong to the same
 * material family as everything else.
 *
 * It is deliberately not a modal. It is bounded by the section, does not lock
 * the page, and does not trap focus, because it is a detail view inside a
 * section rather than an interruption. Escape closes it, the arrows move
 * between projects, and focus returns to the card that opened it.
 */
import { useEffect, useRef } from "react";
import { Github, ArrowUpRight, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Project } from "../../data/projects";
import { Takeaway } from "./Takeaway";
import { ProjectBoard } from "./ProjectBoard";
import { BeforeAfter } from "./BeforeAfter";

export interface ProjectViewProps {
  project: Project;
  index: number;
  total: number;
  /** Percentage coordinates within the stage, for the expand origin. */
  origin: { x: number; y: number };
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export const ProjectView = ({
  project,
  index,
  total,
  origin,
  onPrev,
  onNext,
  onClose,
}: ProjectViewProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

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
      style={
        {
          "--pv-ox": `${origin.x}%`,
          "--pv-oy": `${origin.y}%`,
        } as React.CSSProperties
      }
    >
      <header className="pv-head">
        <span className="pv-index">{String(index + 1).padStart(2, "0")}</span>
        <div className="pv-heading">
          <h3 className="pv-title">{project.title}</h3>
          <span className="chip">{project.category}</span>
        </div>

        <div className="pv-nav">
          <button
            className="pv-btn"
            onClick={onPrev}
            aria-label="Previous project"
            disabled={total < 2}
          >
            <ChevronLeft size={14} />
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
            <ChevronRight size={14} />
          </button>
          <button className="pv-btn pv-close" onClick={onClose} aria-label="Close detail">
            <X size={14} />
          </button>
        </div>
      </header>

      {/*
        Keyed on the project so switching with the arrows replays the content
        stagger. Without the key the panel would swap text in place, which reads
        as a glitch rather than as navigation.
      */}
      <div className="pv-body" key={project.id}>
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
      </div>
    </div>
  );
};
