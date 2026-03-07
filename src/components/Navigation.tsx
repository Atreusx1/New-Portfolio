import { useEffect, useState } from "react";

interface NavProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export const Navigation = ({ onNavigate, activeSection }: NavProps) => {
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY < 60 || currentY < lastY);
      setLastY(currentY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastY]);

  const navItems = [
    { id: "about", label: "About" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "experience", label: "Experience" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
        opacity: mounted ? 1 : 0,
      }}
    >
      {/* top line */}
      <div style={{ height: "1px", background: "rgba(226,226,226,0.08)" }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
          height: "52px",
          background: "rgba(8,8,8,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => onNavigate("home")}
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "#e2e2e2",
            background: "none",
            border: "none",
            letterSpacing: "0.05em",
          }}
        >
          AK.
        </button>

        {/* Desktop links */}
        <div
          style={{
            display: "flex",
            gap: "2.5rem",
          }}
          className="nav-desktop"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color:
                  activeSection === item.id
                    ? "rgb(151, 252, 228)"
                    : "rgba(226,226,226,0.4)",
                background: "none",
                border: "none",
                transition: "color 0.2s ease",
                position: "relative",
              }}
            >
              {item.label}
              {activeSection === item.id && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "-4px",
                    left: 0,
                    right: 0,
                    height: "1px",
                    background: "rgb(151, 252, 228)",
                    transformOrigin: "left",
                    animation: "lineGrow 0.3s ease forwards",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Status dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "Space Mono, monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.1em",
            color: "rgba(226,226,226,0.3)",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "rgb(151, 252, 228)",
              display: "inline-block",
              animation: "blink 2s ease-in-out infinite",
            }}
          />
          AVAILABLE
        </div>
      </div>

      {/* bottom line */}
      <div style={{ height: "1px", background: "rgba(226,226,226,0.08)" }} />

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
        }
      `}</style>
    </nav>
  );
};
