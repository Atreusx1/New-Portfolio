/**
 * App.tsx — reference wiring for the redesign.
 *
 * Boot plays once per session, then the portfolio fades in over the
 * living blockchain-universe canvas. Section order is compressed:
 * Hero → About → Projects → Skills → Experience → Contact, each at
 * roughly half its previous height.
 */
import { useEffect, useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { WalletProvider } from "./components/WalletContext";
import { Boot } from "./components/Boot";
import { SectionCanvas } from "./components/Sectioncanvas";
import { FloatingParticles } from "./components/FloatingParticles";
import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Projects } from "./components/Projects";
import { Skills } from "./components/Skills";
import { Experience } from "./components/Experience";
import { Contact } from "./components/Contact";

const SECTION_IDS = ["home", "about", "projects", "skills", "experience", "contact"] as const;

const App = () => {
  const [booted, setBooted] = useState(false);
  const [active, setActive] = useState("home");

  // Scroll-spy for the nav indicator.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [booted]);

  const navigate = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <ThemeProvider>
      <WalletProvider>
        {!booted && <Boot onDone={() => setBooted(true)} />}

        <SectionCanvas />
        <FloatingParticles />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            opacity: booted ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          <Navigation onNavigate={navigate} activeSection={active} />
          <main>
            <Hero />
            <About />
            <Projects />
            <Skills />
            <Experience />
            <Contact />
          </main>
          <footer
            style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <span
              className="data-text"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.14em",
                color: "var(--fg-muted)",
              }}
            >
              © {new Date().getFullYear()} ANISH KADAM · BUILT ON-CHAIN-ISH
            </span>
          </footer>
        </div>
      </WalletProvider>
    </ThemeProvider>
  );
};

export default App;
