/**
 * Navigation.tsx — floating glass pill.
 *
 * · Centered, blurred, rounded; shrinks slightly past 60px of scroll.
 * · The active-section indicator is a real element that springs between
 *   links (measured via refs) instead of an underline color swap.
 * · Wallet connect swapped for a direct "View Resume" link, so the nav
 *   always offers a low-friction way to see the resume.
 */
import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Menu, X, Wallet } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface NavProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

const NAV_ITEMS = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
] as const;

export const Navigation = ({ onNavigate, activeSection }: NavProps) => {
  const t = useTheme();
  const [compact, setCompact] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, on: false });

  const linkRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pillRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = (): void => setCompact(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Slide the indicator to the active link.
  useEffect(() => {
    const measure = (): void => {
      const el = linkRefs.current.get(activeSection);
      const pill = pillRef.current;
      if (!el || !pill) {
        setIndicator((v) => ({ ...v, on: false }));
        return;
      }
      const er = el.getBoundingClientRect();
      const pr = pill.getBoundingClientRect();
      setIndicator({ left: er.left - pr.left, width: er.width, on: true });
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, [activeSection, compact]);

  return (
    <>
      <nav
        ref={pillRef}
        className={`nav-pill glass ${compact ? "nav-compact" : ""}`}
        aria-label="Primary"
        style={{
          transform: `translateX(-50%) translateY(${mounted ? 0 : -72}px)`,
          background: t.navBg,
        }}
      >
        {/* Logo */}
        <button
          onClick={() => onNavigate("home")}
          aria-label="Back to top"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: t.fg,
            background: "none",
            border: "none",
            letterSpacing: "-0.02em",
            padding: "0.4rem 0.6rem 0.4rem 0.75rem",
          }}
        >
          AK<span style={{ color: t.accent }}>.</span>
        </button>

        {/* Sliding active indicator */}
        <span
          className="nav-indicator"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.on ? 1 : 0,
          }}
        />

        {/* Links */}
        <div className="nav-desktop" style={{ display: "flex" }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                if (el) linkRefs.current.set(item.id, el);
                else linkRefs.current.delete(item.id);
              }}
              onClick={() => onNavigate(item.id)}
              className={`nav-link ${activeSection === item.id ? "nav-active" : ""}`}
              aria-current={activeSection === item.id ? "true" : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right cluster */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            paddingLeft: "0.35rem",
          }}
        >
          {/* View Resume */}
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View resume"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.58rem",
              letterSpacing: "0.06em",
              padding: "0.42rem 0.8rem",
              background: t.ac_(0.09),
              color: t.accent,
              border: `1px solid ${t.ac_(0.22)}`,
              borderRadius: 999,
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <Wallet size={11} />
            Resume
          </a>

          {/* Theme toggle */}
          <button
            onClick={t.toggle}
            aria-label={
              t.isDark ? "Switch to light mode" : "Switch to dark mode"
            }
            style={{
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 999,
              color: t.fg_(0.55),
              transition: "all 0.2s ease",
            }}
          >
            {t.isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          {/* Mobile menu */}
          <button
            className="nav-burger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            style={{
              width: 30,
              height: 30,
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 999,
              color: t.fg_(0.7),
            }}
          >
            {menuOpen ? <X size={13} /> : <Menu size={13} />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {menuOpen && (
        <div
          className="glass"
          style={{
            position: "fixed",
            top: 72,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99,
            width: "min(320px, calc(100vw - 2rem))",
            padding: "0.5rem",
            background: t.navBg,
            display: "flex",
            flexDirection: "column",
            animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMenuOpen(false);
              }}
              className="nav-link"
              style={{ textAlign: "left", padding: "0.75rem 1rem" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-indicator { display: none; }
          .nav-burger { display: flex !important; }
        }
      `}</style>
    </>
  );
};
