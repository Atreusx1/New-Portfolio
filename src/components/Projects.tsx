import { useState, useEffect, useRef, useCallback } from "react";
import { projectsData, type Project } from "../data/projects";
import { Github, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrambleText } from "./ScrambleText";

const ACCENT = "rgb(151, 252, 228)";
const ACCENT_DIM = "rgba(151, 252, 228, 0.5)";

const CATEGORIES = ["all", "web", "blockchain", "fullstack", "build-tools"];

export const Projects = () => {
  const [filter, setFilter] = useState("all");
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const ref = useRef<HTMLElement>(null);

  const filtered =
    filter === "all"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);
  useEffect(() => {
    setCurrent(0);
  }, [filter]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.05 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const next = useCallback(
    () => setCurrent((c) => Math.min(filtered.length - 1, c + 1)),
    [filtered.length],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next]);

  const onDragStart = (x: number) => {
    setDragging(true);
    setDragStart(x);
    setDragDelta(0);
  };
  const onDragMove = (x: number) => {
    if (!dragging) return;
    setDragDelta(x - dragStart);
  };
  const onDragEnd = () => {
    if (dragDelta < -60) next();
    else if (dragDelta > 60) prev();
    setDragging(false);
    setDragDelta(0);
  };

  const CARD_W = 380;
  const CARD_GAP = 24;

  return (
    <section
      ref={ref}
      id="projects"
      style={{
        borderTop: "1px solid rgba(226,226,226,0.08)",
        padding: "8rem 0",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "3rem",
            flexWrap: "wrap",
            gap: "1rem",
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(16px)",
            transition: "all 0.7s ease",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "baseline", gap: "1.5rem" }}
          >
            <span
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.2em",
                color: "rgba(226,226,226,0.25)",
              }}
            >
              02
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
                <ScrambleText text="Projects" active={visible} speed={30} />
              ) : (
                "Projects"
              )}
            </h2>
          </div>
          {/* Counter + arrows */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.65rem",
                color: "rgba(226,226,226,0.25)",
                letterSpacing: "0.1em",
              }}
            >
              <span style={{ color: ACCENT }}>
                {String(current + 1).padStart(2, "0")}
              </span>
              {" / "}
              {String(filtered.length).padStart(2, "0")}
            </span>
            {(["prev", "next"] as const).map((dir) => {
              const isDisabled =
                dir === "prev"
                  ? current === 0
                  : current === filtered.length - 1;
              return (
                <button
                  key={dir}
                  onClick={dir === "prev" ? prev : next}
                  disabled={isDisabled}
                  style={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${isDisabled ? "rgba(226,226,226,0.08)" : "rgba(226,226,226,0.2)"}`,
                    background: "transparent",
                    color: isDisabled ? "rgba(226,226,226,0.2)" : "#e2e2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.borderColor = ACCENT;
                      b.style.color = ACCENT;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = isDisabled
                      ? "rgba(226,226,226,0.08)"
                      : "rgba(226,226,226,0.2)";
                    b.style.color = isDisabled
                      ? "rgba(226,226,226,0.2)"
                      : "#e2e2e2";
                  }}
                >
                  {dir === "prev" ? (
                    <ChevronLeft size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: "0",
            marginBottom: "3.5rem",
            border: "1px solid rgba(226,226,226,0.08)",
            width: "fit-content",
            flexWrap: "wrap",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.7s ease 0.15s",
          }}
        >
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0.6rem 1.1rem",
                background: filter === cat ? ACCENT : "transparent",
                color: filter === cat ? "#080808" : "rgba(226,226,226,0.4)",
                border: "none",
                borderRight:
                  i < CATEGORIES.length - 1
                    ? "1px solid rgba(226,226,226,0.08)"
                    : "none",
                transition: "all 0.2s ease",
                fontWeight: filter === cat ? 700 : 400,
              }}
            >
              {cat === "build-tools" ? "Build Tools" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Carousel — full bleed */}
      <div
        style={{ overflow: "hidden", position: "relative" }}
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseMove={(e) => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={() => {
          if (dragging) onDragEnd();
        }}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
      >
        <div
          style={{
            display: "flex",
            gap: `${CARD_GAP}px`,
            padding: "0 2rem",
            transform: `translateX(calc(-${current * (CARD_W + CARD_GAP)}px + ${dragging ? dragDelta : 0}px))`,
            transition: dragging
              ? "none"
              : "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
            userSelect: "none",
          }}
        >
          {filtered.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              current={current}
              visible={visible}
              cardWidth={CARD_W}
            />
          ))}
        </div>
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          justifyContent: "center",
          marginTop: "2.5rem",
          padding: "0 2rem",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.7s ease 0.4s",
        }}
      >
        {filtered.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? "24px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background: i === current ? ACCENT : "rgba(226,226,226,0.15)",
              border: "none",
              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              padding: 0,
            }}
          />
        ))}
      </div>
    </section>
  );
};

const ProjectCard = ({
  project,
  index,
  current,
  visible,
  cardWidth,
}: {
  project: Project;
  index: number;
  current: number;
  visible: boolean;
  cardWidth: number;
}) => {
  const [hovered, setHovered] = useState(false);
  const isActive = index === current;
  const distance = Math.abs(index - current);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${cardWidth}px`,
        flexShrink: 0,
        border: `1px solid ${isActive ? (hovered ? "rgba(151,252,228,0.4)" : "rgba(151,252,228,0.18)") : "rgba(226,226,226,0.06)"}`,
        background: isActive ? "#111" : "#0b0b0b",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        minHeight: "320px",
        opacity: visible
          ? distance === 0
            ? 1
            : distance === 1
              ? 0.45
              : 0.2
          : 0,
        transform: visible
          ? `scale(${isActive ? 1 : 0.97})`
          : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
            opacity: 0.5,
          }}
        />
      )}
      {hovered && isActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(151,252,228,0.02)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Index + category */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <span
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.58rem",
            letterSpacing: "0.2em",
            color: isActive ? ACCENT_DIM : "rgba(226,226,226,0.15)",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.55rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isActive ? ACCENT_DIM : "rgba(226,226,226,0.15)",
            padding: "0.2rem 0.5rem",
            border: `1px solid ${isActive ? "rgba(151,252,228,0.15)" : "rgba(226,226,226,0.06)"}`,
          }}
        >
          {project.category}
        </span>
      </div>

      <h3
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "1.05rem",
          fontWeight: 700,
          color: isActive ? "#e2e2e2" : "rgba(226,226,226,0.35)",
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
          marginBottom: "0.75rem",
          transition: "color 0.3s ease",
        }}
      >
        {project.title}
      </h3>
      <p
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "0.73rem",
          color: isActive ? "rgba(226,226,226,0.45)" : "rgba(226,226,226,0.2)",
          lineHeight: 1.7,
          flex: 1,
          marginBottom: "1.5rem",
          transition: "color 0.3s ease",
        }}
      >
        {project.description}
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        {project.technologies.slice(0, 4).map((tech) => (
          <span
            key={tech}
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.58rem",
              letterSpacing: "0.06em",
              color: isActive
                ? "rgba(151,252,228,0.6)"
                : "rgba(226,226,226,0.2)",
              padding: "0.15rem 0.45rem",
              border: `1px solid ${isActive ? "rgba(151,252,228,0.12)" : "rgba(226,226,226,0.06)"}`,
              transition: "all 0.3s ease",
            }}
          >
            {tech}
          </span>
        ))}
        {project.technologies.length > 4 && (
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.58rem",
              color: "rgba(226,226,226,0.2)",
              padding: "0.15rem 0.4rem",
            }}
          >
            +{project.technologies.length - 4}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          paddingTop: "1rem",
          borderTop: `1px solid ${isActive ? "rgba(151,252,228,0.08)" : "rgba(226,226,226,0.04)"}`,
        }}
      >
        {project.github && project.github !== "Private REPO" && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontFamily: "Space Mono, monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isActive ? ACCENT_DIM : "rgba(226,226,226,0.2)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = ACCENT;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = isActive
                ? ACCENT_DIM
                : "rgba(226,226,226,0.2)";
            }}
          >
            <Github size={12} /> Code
          </a>
        )}
        {project.live && project.live !== "Not Live Yet" && (
          <a
            href={project.live}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontFamily: "Space Mono, monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isActive ? ACCENT_DIM : "rgba(226,226,226,0.2)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = ACCENT;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = isActive
                ? ACCENT_DIM
                : "rgba(226,226,226,0.2)";
            }}
          >
            <ArrowUpRight size={12} /> Live
          </a>
        )}
      </div>
    </div>
  );
};
