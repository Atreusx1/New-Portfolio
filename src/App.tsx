/**
 * App.tsx: reference wiring for the redesign.
 *
 * Boot plays once per session, then the portfolio fades in over the
 * living blockchain-universe canvas. Section order is compressed:
 * Hero → About → Projects → Skills → Experience → Contact, each at
 * roughly half its previous height.
 *
 * ── Why the tree stays mounted behind Boot ──
 * Hero opens a WebSocket and fetches four kline series on mount, and the boot
 * screen is the ideal cover for that work: the ticker rail should be full of
 * real prices the first time anyone sees it, not four em-dashes filling in
 * afterwards. So the subtree mounts immediately and only the *choreography*
 * waits, via EntranceProvider. Every staged reveal below reads that gate rather
 * than its own mount time, which is what stops the entrance from playing out
 * invisibly behind the overlay. See components/motion/Entrance.tsx.
 */
import { useEffect, useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { Boot } from "./components/Boot";
import { UniverseBackground } from "./components/UniverseBackground";
import { FloatingParticles } from "./components/FloatingParticles";
import { Navigation } from "./components/Navigation";
// Hero.tsx is kept in place as the fallback layout; HeroRedesign is the one
// wired up. Swapping this single import reverts the section wholesale.
import { HeroRedesign } from "./components/HeroRedesign";
import { About } from "./components/About";
import { Projects } from "./components/Projects";
import { Skills } from "./components/Skills";
import { Experience } from "./components/Experience";
import { Contact } from "./components/Contact";
import { EntranceProvider } from "./components/motion/Entrance";
import { SECTION_IDS } from "./data/sections";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

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
      {!booted && <Boot onDone={() => setBooted(true)} />}

      <UniverseBackground />

      {/* Flat band for iOS Safari's toolbar to sample. See index.css. */}
      <div className="top-scrim" aria-hidden="true" />
      <FloatingParticles />

      <EntranceProvider ready={booted}>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            opacity: booted ? 1 : 0,
            // Shortened from 0.8s: the hero's first stage now lands at 140ms
            // after this starts, and a slower wrapper fade would have the
            // eyebrow arriving while the page is still at a third opacity.
            transition: "opacity 0.55s ease",
          }}
        >
          <Navigation onNavigate={navigate} activeSection={active} />
          <main>
            <HeroRedesign />
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
              © {new Date().getFullYear()} ANISH KADAM · BUILT WITH {"\u2764"}{" "}
              USING REACT, THREE.JS, AND CREATIVITY
            </span>
          </footer>
        </div>
      </EntranceProvider>
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  );
};

export default App;
