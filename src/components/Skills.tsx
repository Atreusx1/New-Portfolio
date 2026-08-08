/**
 * Skills.tsx
 *
 * ── The bug this rewrite fixes ──
 * The previous version rendered the skill list as a syntax-highlighted source
 * file inside a macOS editor window. It was the best-looking section on the
 * site and it did not work: non-technical readers recognised "this is code",
 * concluded it was not addressed to them, and scrolled past the one section
 * that says what the work is actually made of.
 *
 * That is a content-legibility failure, not a styling one, so the fix is
 * structural rather than cosmetic:
 *
 *  · **Plain language leads.** Every group is named for what it does, not for
 *    which layer of a stack it belongs to. "Smart contracts" and "The part you
 *    click" are things anybody can parse; `export const frontend` is not.
 *  · **One sentence per group, written for a stranger.** A recruiter or a
 *    founder can now read four sentences and know what he does. The individual
 *    technologies are still there for the people who came looking for them.
 *  · **The emphasis is explained.** The old version marked the first item in
 *    each list with a `// core` comment, which only reads as meaningful if you
 *    already know what a comment is. There is now a stated legend.
 *
 * ── Where the visual interest went ──
 * Losing the code window loses the thing that made the section worth looking
 * at, so the interest moved into a dithered viewport: a lit form quantised to
 * four tones through a Bayer matrix. It reshapes as you move between groups,
 * which gives the list somewhere to point and gives hovering a consequence.
 *
 * The panel is lazy-loaded and only mounted once the section has been
 * revealed. Skills is the fourth section down, and three.js is not a library
 * to pull into the initial bundle for something nobody has scrolled to. Until
 * it resolves, a pure-CSS dither stands in at the same size, so there is no
 * layout shift and no empty rectangle.
 *
 * ── The aesthetic pass ──
 * The window chrome is gone. Traffic lights and a 12px radius are the visual
 * language of a tidy desktop application, and this section is now the loudest
 * thing on the page rather than the neatest. What replaced it:
 *
 *  · **Hard edges.** No radius anywhere in the slab, and borders drawn at full
 *    foreground rather than the 8% alpha hairlines the rest of the site uses.
 *  · **Inversion instead of tint.** An active group does not get a 4% accent
 *    wash, it flips: accent fills the block and the type knocks out to the page
 *    background. There is no ambiguity about which one is selected.
 *  · **Type as structure.** Group names set in the display face at wdth 78,
 *    uppercase, at a size that competes with the section heading, with the
 *    index numeral oversized beside it. The layout is held together by the
 *    typography rather than by boxes.
 *
 * Both themes get it. Light mode is not the polite version: same hard borders
 * at full ink, same inversion, and the dither runs near-black on paper rather
 * than accent, because maximum contrast is the entire point and cobalt on warm
 * paper is a softer statement than black is.
 */
import { Suspense, lazy, useState } from "react";
import { SKILLS } from "../data/constants";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { Reveal, useRevealed, prefersReducedMotion } from "./motion/Reveal";
import { Takeaway } from "./patterns/Takeaway";

const DitherPanel = lazy(() => import("./patterns/DitherPanel"));

type CategoryKey = keyof typeof SKILLS;

interface Group {
  key: CategoryKey;
  /** Named for what it does. This is the whole point of the rewrite. */
  label: string;
  /** One sentence, written for someone who does not write software. */
  plain: string;
}

/*
 * Ordered by what he is actually known for rather than by convention. The old
 * version led with frontend because that is how stacks are usually written
 * down; the work in this portfolio leads with contracts.
 */
const GROUPS: Group[] = [
  {
    key: "blockchain",
    label: "Smart contracts",
    plain:
      "Programs that run on a blockchain and hold the rules. Once they are live, nobody can quietly change them, which is most of why they are hard to write.",
  },
  {
    key: "frontend",
    label: "The part you click",
    plain:
      "Everything visible: pages, buttons, animation, and the 3D scene running behind this one. Built to stay fast on a phone.",
  },
  {
    key: "backend",
    label: "Servers and data",
    plain:
      "What runs out of sight. The interfaces above ask these for information, and they decide what is allowed and where it is stored.",
  },
  {
    key: "tools",
    label: "Shipping it",
    plain:
      "How the work gets from a laptop to something you can open, and stays up once it is there.",
  },
];

export const Skills = () => {
  const t = useTheme();
  const [active, setActive] = useState(0);

  const total = GROUPS.reduce(
    (n, g) => n + (SKILLS[g.key] as readonly string[]).length,
    0,
  );

  return (
    <section id="skills" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">Skills</span>
          <h2 className="section-title">
            <ScrambleText text="What I build with" active speed={20} />
          </h2>
        </Reveal>

        <Reveal delay={0.04}>
          <Takeaway size="lead">
            Four groups, {total} tools. The highlighted ones in each group are
            the ones reached for first.
          </Takeaway>
        </Reveal>

        <Reveal delay={0.08}>
          <SkillsSlab
            active={active}
            setActive={setActive}
            total={total}
            /* Dark mode glows, light mode prints. Accent on near-black reads
               as a lit object; on warm paper the same cobalt is a softer
               statement than ink, and this section is not going soft. */
            ink={t.isDark ? t.accent : t.fg}
            paper={t.isDark ? "#050605" : t.bg}
          />
        </Reveal>
      </div>
    </section>
  );
};

/**
 * Split out so it can call `useRevealed`, which only returns a useful value
 * from inside the Reveal it belongs to. That hook is what gates mounting the
 * WebGL panel until the section is actually on screen.
 */
const SkillsSlab = ({
  active,
  setActive,
  total,
  ink,
  paper,
}: {
  active: number;
  setActive: (i: number) => void;
  total: number;
  ink: string;
  paper: string;
}) => {
  const revealed = useRevealed();
  const still = prefersReducedMotion();
  const group = GROUPS[active];

  return (
    <div className="sk-slab">
      {/* A rule and a label, not a title bar. */}
      <header className="sk-bar">
        <span className="sk-bar-tag">The stack</span>
        <span className="sk-bar-rule" aria-hidden="true" />
        <span className="sk-bar-count">
          {String(total).padStart(2, "0")} tools
        </span>
      </header>

      <div className="sk-body">
        {/* Visual */}
        <div className="sk-visual">
          <div className="sk-canvas">
            {/*
              Mounted only once the section has been revealed, and behind a
              lazy boundary. The fallback is a CSS dither at the same size, so
              nothing moves when the real one arrives.
            */}
            {revealed ? (
              <Suspense fallback={<div className="sk-canvas-fallback" />}>
                <DitherPanel
                  ink={ink}
                  paper={paper}
                  morph={active / Math.max(1, GROUPS.length - 1)}
                  still={still}
                />
              </Suspense>
            ) : (
              <div className="sk-canvas-fallback" />
            )}
            <span className="sk-scan" aria-hidden="true" />
          </div>

          <div className="sk-visual-caption">
            <span className="sk-visual-idx">
              {String(active + 1).padStart(2, "0")}
            </span>
            <span className="sk-visual-name">{group.label}</span>
          </div>
        </div>

        {/* Groups */}
        <div className="sk-groups" role="tablist" aria-label="Skill groups">
          {GROUPS.map((g, i) => {
            const isActive = i === active;
            const list = SKILLS[g.key] as readonly string[];
            return (
              <button
                key={g.key}
                role="tab"
                aria-selected={isActive}
                className="sk-group"
                data-active={isActive ? "true" : "false"}
                /* Hover on a fine pointer, tap on a coarse one. The click
                   handler is what makes this work at all on a phone, where
                   there is no hover to drive the panel. */
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span className="sk-group-idx">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="sk-group-main">
                  <span className="sk-group-top">
                    <span className="sk-group-name">{g.label}</span>
                    <span className="sk-group-count">
                      {String(list.length).padStart(2, "0")}
                    </span>
                  </span>

                  <span className="sk-group-plain">{g.plain}</span>

                  <span className="sk-skills">
                    {list.map((sk, si) => (
                      <span
                        key={sk}
                        className="sk-skill"
                        /* First in each list is the one he reaches for first.
                           The legend above the slab says so in words, because
                           an unexplained emphasis is just decoration. */
                        data-core={si === 0 ? "true" : "false"}
                      >
                        {sk}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
