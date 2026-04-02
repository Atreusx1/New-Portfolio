import { useRef, useEffect, useState } from "react";
import { Github, Linkedin, Mail, ArrowUpRight } from "lucide-react";
import { RESUME } from "../data/constants";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";

export const Contact = () => {
  const t = useTheme();
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const links = [
    { icon: Github, label: "GitHub", url: RESUME.github, handle: "@Atreusx1" },
    {
      icon: Linkedin,
      label: "LinkedIn",
      url: RESUME.linkedin,
      handle: "Anish kadam",
    },
    {
      icon: Mail,
      label: "Email",
      url: `mailto:${RESUME.email}`,
      handle: RESUME.email,
    },
  ];

  return (
    <section
      ref={ref}
      id="contact"
      style={{
        borderTop: `1px solid ${t.fg_(0.08)}`,
        padding: "8rem 2rem",
        transition: "border-color 0.35s ease",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "1.5rem",
            marginBottom: "5rem",
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(16px)",
            transition: "all 0.7s ease",
          }}
        >
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.2em",
              color: t.fg_(0.25),
            }}
          >
            05
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
              <ScrambleText text="Contact" active={visible} speed={35} />
            ) : (
              "Contact"
            )}
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6rem",
            alignItems: "start",
          }}
          className="contact-grid"
        >
          {/* Left */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(16px)",
              transition: "all 0.7s ease 0.2s",
            }}
          >
            <p
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.85rem",
                lineHeight: 1.9,
                color: t.fg_(0.5),
                marginBottom: "3rem",
                transition: "color 0.35s ease",
              }}
            >
              Open to new opportunities, collaborations, and conversations.
              <br />
              Reach out through any channel below.
            </p>

            {/* Links */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {links.map((link, i) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 0",
                    borderBottom: `1px solid ${t.fg_(0.08)}`,
                    textDecoration: "none",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "none" : "translateY(8px)",
                    transition: `all 0.5s ease ${0.3 + i * 0.08}s`,
                    color: "inherit",
                  }}
                  className="contact-link"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <link.icon size={14} style={{ color: t.fg_(0.3) }} />
                    <div>
                      <div
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "0.65rem",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: t.fg_(0.25),
                          marginBottom: "0.1rem",
                        }}
                      >
                        {link.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "0.78rem",
                          color: t.fg_(0.7),
                        }}
                      >
                        {link.handle}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight size={12} style={{ color: t.fg_(0.2) }} />
                </a>
              ))}
            </div>

            {/* Resume */}
            <div style={{ marginTop: "2rem" }}>
              <a href="#" className="btn-outline">
                Download Resume <ArrowUpRight size={12} />
              </a>
            </div>
          </div>

          {/* Right — form */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(16px)",
              transition: "all 0.7s ease 0.35s",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1px",
                background: t.fg_(0.08),
              }}
            >
              <input
                type="text"
                placeholder="Name"
                style={{ background: t.bg }}
              />
              <input
                type="email"
                placeholder="Email"
                style={{ background: t.bg }}
              />
              <textarea
                placeholder="Message"
                rows={5}
                style={{ background: t.bg }}
              />
              <button
                type="button"
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.7rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "1rem",
                  background: t.accent,
                  color: t.bg,
                  border: "none",
                  cursor: "crosshair",
                  transition: "background 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = "1";
                }}
              >
                Send Message →
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .contact-link:hover { opacity: 1 !important; }
        .contact-link:hover svg:last-child { color: var(--accent) !important; }
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
        }
      `}</style>
    </section>
  );
};
