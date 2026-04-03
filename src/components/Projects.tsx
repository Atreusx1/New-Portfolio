import { useState, useEffect, useRef, useCallback } from "react";
import { projectsData, type Project } from "../data/projects";
import { Github, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { DEXOrderBook } from "./Dexorderbook";

const CATEGORIES = ["all", "web", "blockchain", "fullstack", "build-tools"];
// Add a special sentinel value for the DEX tab
const ALL_TABS = [...CATEGORIES, "dex"];

export const Projects = () => {
  const t = useTheme();
  const [filter, setFilter] = useState("dex");
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const ref = useRef<HTMLElement>(null);

  const isDexTab = filter === "dex";

  const filtered = isDexTab
    ? []
    : filter === "all"
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
    if (isDexTab) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next, isDexTab]);

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
        borderTop: "1px solid var(--border)",
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
                color: t.fg_(0.25),
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
                color: t.fg,
                transition: "color 0.35s ease",
              }}
            >
              {visible ? (
                <ScrambleText text="Projects" active={visible} speed={30} />
              ) : (
                "Projects"
              )}
            </h2>
          </div>

          {/* Counter + arrows — hidden on dex tab */}
          {!isDexTab && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.65rem",
                  color: t.fg_(0.25),
                  letterSpacing: "0.1em",
                }}
              >
                <span style={{ color: t.accent }}>
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
                      border: `1px solid ${isDisabled ? t.fg_(0.08) : t.fg_(0.2)}`,
                      background: "transparent",
                      color: isDisabled ? t.fg_(0.2) : t.fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled) {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.borderColor = t.accent;
                        b.style.color = t.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.borderColor = isDisabled
                        ? t.fg_(0.08)
                        : t.fg_(0.2);
                      b.style.color = isDisabled ? t.fg_(0.2) : t.fg;
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
          )}
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            marginBottom: "3.5rem",
            border: "1px solid var(--border)",
            width: "fit-content",
            flexWrap: "wrap",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.7s ease 0.15s",
          }}
        >
          {ALL_TABS.map((cat, i) => {
            const isDex = cat === "dex";
            const isActive = filter === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "0.6rem 1.1rem",
                  background: isActive
                    ? isDex
                      ? t.accent // DEX tab uses solid accent
                      : t.accent
                    : "transparent",
                  color: isActive
                    ? "var(--bg)"
                    : isDex
                      ? t.ac_(0.6)
                      : t.fg_(0.4),
                  border: "none",
                  borderRight:
                    i < ALL_TABS.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  transition: "all 0.2s ease",
                  fontWeight: isActive ? 700 : 400,
                  position: "relative",
                }}
              >
                {isDex ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {/* Blink dot for DEX tab */}
                    {!isActive && (
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: t.accent,
                          display: "inline-block",
                          animation: "blink 2s ease-in-out infinite",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    DEX / Order Book
                  </span>
                ) : cat === "build-tools" ? (
                  "Build Tools"
                ) : (
                  cat
                )}
              </button>
            );
          })}
        </div>

        {/* DEX Order Book — full width inside container */}
        {isDexTab && (
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(20px)",
              transition: "all 0.7s ease 0.1s",
            }}
          >
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <span
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.55rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: t.fg_(0.22),
                }}
              >
                Decentralized Order Book · Live price feed · Simulated CLOB
                depth
              </span>
            </div>
            <DEXOrderBook />
          </div>
        )}
      </div>

      {/* Carousel — full bleed (only when not on DEX tab) */}
      {!isDexTab && (
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
            }}
          >
            {filtered.map((project, idx) => (
              <ProjectCard
                key={project.title}
                project={project}
                index={idx}
                current={current}
                visible={visible}
                cardWidth={CARD_W}
              />
            ))}
          </div>

          {/* Dots */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.4rem",
              marginTop: "2rem",
            }}
          >
            {filtered.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? 20 : 6,
                  height: 2,
                  background: i === current ? t.accent : t.fg_(0.15),
                  border: "none",
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}
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
  const t = useTheme();
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
        border: `1px solid ${
          isActive ? (hovered ? t.ac_(0.4) : t.ac_(0.18)) : t.fg_(0.06)
        }`,
        background: isActive ? t.cardBg : t.cardBgDim,
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
            background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
            opacity: 0.5,
          }}
        />
      )}
      {hovered && isActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: t.ac_(0.02),
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
            color: isActive ? t.ac_(0.5) : t.fg_(0.15),
            transition: "color 0.35s ease",
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
            color: isActive ? t.ac_(0.5) : t.fg_(0.15),
            padding: "0.2rem 0.5rem",
            border: `1px solid ${isActive ? t.ac_(0.15) : t.fg_(0.06)}`,
            transition: "all 0.35s ease",
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
          color: isActive ? t.fg : t.fg_(0.35),
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
          color: isActive ? t.fg_(0.45) : t.fg_(0.2),
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
              color: isActive ? t.ac_(0.65) : t.fg_(0.2),
              padding: "0.15rem 0.45rem",
              border: `1px solid ${isActive ? t.ac_(0.12) : t.fg_(0.06)}`,
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
              color: t.fg_(0.2),
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
          borderTop: `1px solid ${isActive ? t.ac_(0.08) : t.fg_(0.04)}`,
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
              color: isActive ? t.ac_(0.5) : t.fg_(0.2),
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = t.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = isActive
                ? t.ac_(0.5)
                : t.fg_(0.2);
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
              color: isActive ? t.ac_(0.5) : t.fg_(0.2),
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = t.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = isActive
                ? t.ac_(0.5)
                : t.fg_(0.2);
            }}
          >
            <ArrowUpRight size={12} /> Live
          </a>
        )}
      </div>
    </div>
  );
};
