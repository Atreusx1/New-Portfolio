import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { WalletProvider } from "./components/WalletContext";
import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Projects } from "./components/Projects";
import { Skills } from "./components/Skills";
import { Experience } from "./components/Experience";
import { Contact } from "./components/Contact";
import { FloatingParticles } from "./components/FloatingParticles";
import { SectionCanvas } from "./components/SectionCanvas";

// ── Inner app consumes theme ──────────────────────────────────────────────────
const AppInner = () => {
  const t = useTheme();
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const sections = [
      "home",
      "about",
      "projects",
      "skills",
      "experience",
      "contact",
    ];
    const handleScroll = () => {
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (
            rect.top <= window.innerHeight / 2 &&
            rect.bottom >= window.innerHeight / 2
          ) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        transition: "background 0.35s ease",
      }}
    >
      <SectionCanvas />
      <FloatingParticles />
      <Navigation onNavigate={handleNavigate} activeSection={activeSection} />

      <main style={{ paddingTop: "53px" }}>
        {/* Hero: solid bg so it fully masks the SectionCanvas below */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: t.bg,
            transition: "background 0.35s ease",
          }}
        >
          <Hero />
        </div>

        {/* Non-hero sections: transparent bg — SectionCanvas shows through */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <About />
          <Projects />
          <Skills />
          <Experience />
          <Contact />
        </div>
      </main>

      <footer
        style={{
          borderTop: `1px solid ${t.fg_(0.08)}`,
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <span
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            color: t.fg_(0.2),
          }}
        >
          © 2025 Anish Kadam
        </span>
        <span
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            color: t.fg_(0.2),
          }}
        >
          Built with React
        </span>
      </footer>
    </div>
  );
};

// ── Root wraps with both providers ───────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <AppInner />
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
