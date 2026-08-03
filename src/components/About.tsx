/**
 * About.tsx
 *
 * ── Stage 6: the copy, and the numbers ──
 * The old paragraphs were the clearest example of the problem this pass exists
 * to fix. "Deep interest in blockchain and immersive web experiences", "shipped
 * everything from high-performance web apps to decentralized systems",
 * "building tools for a decentralized future". Every one of those sentences
 * stays true if you swap the subject for any other developer's portfolio, which
 * means none of them said anything.
 *
 * The replacement names specific things: which stack, which chains, which test
 * proved which property. It is worse marketing copy and a much better answer to
 * "should I interview this person".
 *
 * ── The numbers are derived, not typed ──
 * The old stats were "3+ / 8+ / 20+", hardcoded. Two of the three were wrong by
 * the time anyone checked: the list now holds ten projects, not eight, and
 * thirty technology tags across them, not twenty. Promoting a stale number to
 * headline treatment is worse than leaving it small, so all three now compute
 * from the data that backs them and cannot drift again.
 *
 * Years counts from the first role in EXPERIENCE, floored to the half year so
 * it is never rounded up in its own favour.
 */
import { useMemo } from "react";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { Reveal } from "./motion/Reveal";
import { CountUp } from "./motion/CountUp";
import { Takeaway } from "./patterns/Takeaway";
import { projectsData } from "../data/projects";
import { EXPERIENCE } from "../data/constants";

const PARAGRAPHS = [
  "I came up through the MERN stack and moved to contracts because that was where the expensive mistakes were. Since 2023 I have shipped ICO platforms with fiat checkout, NFT provenance systems, staking contracts, and the React front ends sitting on top of them, across Ethereum, Polygon, Avalanche and Solana.",
  "The part I actually care about is the unglamorous half. The invariant suite that proves no sensitive role can be granted without sitting out the full timelock delay. The test that proves a reentrancy guard is load-bearing rather than decorative. Kestrel Protocol is where that discipline lives right now. Off the clock, it is the 3D scene behind this page.",
] as const;

const TRAITS = [
  "Solidity",
  "Foundry and Hardhat",
  "React and Three.js",
  "Circom and zkSNARKs",
  "Substrate",
] as const;

/** Month index by three-letter name, for parsing "Jan 2023" style periods. */
const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");

const parsePeriodStart = (period: string): Date | null => {
  const m = /([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(period);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return null;
  return new Date(Number(m[2]), month, 1);
};

export const About = () => {
  const t = useTheme();

  const stats = useMemo(() => {
    const starts = EXPERIENCE.map((e) => parsePeriodStart(e.period)).filter(
      (d): d is Date => d !== null,
    );
    const earliest = starts.length
      ? new Date(Math.min(...starts.map((d) => d.getTime())))
      : null;
    const years = earliest
      ? (Date.now() - earliest.getTime()) / (365.25 * 24 * 3600 * 1000)
      : 0;

    // Version suffixes are the same tool, so "Hardhat 3" does not get to count
    // twice. Padding the number would defeat the point of deriving it.
    const normalise = (tech: string): string =>
      tech.replace(/\s+\d+$/, "").replace(/\s+UUPS$/i, "").trim();

    const techs = new Set(
      projectsData.flatMap((p) => p.technologies.map(normalise)),
    );

    return {
      // Floored to the half year: never rounded up.
      years: Math.floor(years * 2) / 2,
      projects: projectsData.length,
      technologies: techs.size,
    };
  }, []);

  const STATS = [
    { value: stats.years, decimals: 1, suffix: "", label: "Years shipping" },
    { value: stats.projects, decimals: 0, suffix: "", label: "Projects listed" },
    { value: stats.technologies, decimals: 0, suffix: "", label: "Technologies used" },
  ];

  return (
    <section id="about" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">About</span>
          <h2 className="section-title">
            <ScrambleText text="Builder of decentralized things" active speed={16} />
          </h2>
        </Reveal>

        <Reveal delay={0.04}>
          <Takeaway size="lead">
            I write the contracts and the interfaces that make them legible.
            Most of the work below is both.
          </Takeaway>
        </Reveal>

        <div className="grid-2">
          {/* Narrative */}
          <Reveal delay={0.08}>
            {PARAGRAPHS.map((text, i) => (
              <p
                key={i}
                className="body-text"
                style={{ marginBottom: i < PARAGRAPHS.length - 1 ? "1.25rem" : 0 }}
              >
                {text}
              </p>
            ))}

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginTop: "1.75rem",
              }}
            >
              {TRAITS.map((trait) => (
                <span key={trait} className="chip">
                  {trait}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Stats */}
          <Reveal delay={0.16}>
            <div className="stat-grid">
              {STATS.map((s) => (
                <div key={s.label} className="card stat-card">
                  <div className="stat-value">
                    <CountUp
                      value={s.value}
                      decimals={s.decimals}
                      suffix={s.suffix}
                    />
                  </div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <p
              className="body-text"
              style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: t.fg_(0.45) }}
            >
              Open to work. Most interested in teams where the same person is
              trusted with the contract and the interface.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
