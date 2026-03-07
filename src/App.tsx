import { useEffect, useState } from "react";
import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Projects } from "./components/Projects";
import { Skills } from "./components/Skills";
import { Experience } from "./components/Experience";
import { Contact } from "./components/Contact";
import { FloatingParticles } from "./components/FloatingParticles";

function App() {
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
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <FloatingParticles />
      <Navigation onNavigate={handleNavigate} activeSection={activeSection} />

      <main style={{ paddingTop: "53px" }}>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Experience />
        <Contact />
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(226,226,226,0.08)",
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
            color: "rgba(226,226,226,0.2)",
          }}
        >
          © 2025 Anish kadam
        </span>
        <span
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            color: "rgba(226,226,226,0.2)",
          }}
        >
          Built with React
        </span>
      </footer>
    </div>
  );
}

export default App;
