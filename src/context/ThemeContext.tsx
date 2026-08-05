import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

// ── Raw RGB tuples ────────────────────────────────────────────────────────────
const DARK_FG = "232,234,233";
const DARK_AC = "151,252,228"; // neon mint: the brand

// Light mode is its own design system: warm paper + ink + a signal color.
// Warm (not gray) whites read as "Notion / Linear light".
const LIGHT_FG = "27,26,22"; // warm near-black ink

/**
 * ── Light mode's accent ───────────────────────────────────────────────────
 *
 * Previously deep teal (0,132,99), chosen to sit in the mint's hue family.
 * Two reasons that is no longer the choice:
 *
 *  1. **It failed AA.** Measured against LIGHT_BG (#faf9f6) the teal is
 *     4.45:1, under the 4.5:1 floor for normal text, and --accent is a text
 *     color throughout the site, not just a border.
 *  2. **Matching the mint was the wrong goal.** Light mode is already its own
 *     system everywhere else: warm paper instead of near-black, real shadows
 *     instead of light-as-elevation, normal blending instead of additive. The
 *     accent was the last piece still deferring to the dark identity.
 *
 * Contrast ratios below are against LIGHT_BG / LIGHT_BG2 / LIGHT_BG3, the three
 * surfaces the accent is ever drawn on. All three options clear AA on all three
 * surfaces; the teal cleared none of them.
 *
 * To switch, change LIGHT_ACCENT and nothing else: the CSS custom properties
 * are pushed from here (see ThemeProvider), so this constant is the only place
 * light mode's accent is decided.
 */
const LIGHT_ACCENTS = {
  /**
   * Blueprint cobalt. Schematic ink on warm paper: the same register as the
   * wireframe hexagons, the perspective grid and the network topology the 3D
   * background is built from, so light mode reads as the drawing and dark mode
   * as the thing lit up. Also the only option that keeps the order book legible:
   * Dexorderbook paints asks red and bids with --accent, so a warm accent would
   * put both sides of the book in the same hue family.
   * 6.87:1 / 6.34:1 / 5.85:1
   */
  cobalt: "27,76,199",
  /**
   * Electric violet. The closest translation of the mint's *voltage* into
   * something paper can hold: furthest from it in hue, nearest in attitude.
   * 7.71:1 / 7.12:1 / 6.57:1
   */
  violet: "91,52,179",
  /**
   * Deep plum. Quieter and more editorial than the violet; reads as ink rather
   * than as signal, which suits long-form reading and undersells the terminal.
   * 8.00:1 / 7.39:1 / 6.82:1
   */
  plum: "104,45,163",
} as const;

const LIGHT_AC: string = LIGHT_ACCENTS.cobalt;

// Warm paper surfaces: synced with index.css light tokens.
const LIGHT_BG = "#faf9f6";
const LIGHT_BG2 = "#f2f0ea";
const LIGHT_BG3 = "#eae7df";

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;

  bg: string;
  bg2: string;
  fg: string;

  fgRaw: string;
  accentRaw: string;

  accent: string;

  navBg: string;
  cardBg: string;
  cardBgDim: string;
  terminalBg: string;
  terminalHeaderBg: string;
  terminalStatsBg: string;
  terminalRowBg: string;

  fg_: (alpha: number) => string;
  ac_: (alpha: number) => string;
}

const buildTheme = (mode: ThemeMode, toggle: () => void): Theme => {
  const isDark = mode === "dark";
  const fgRaw = isDark ? DARK_FG : LIGHT_FG;
  const accentRaw = isDark ? DARK_AC : LIGHT_AC;

  const fg_ = (a: number) => `rgba(${fgRaw},${a})`;
  const ac_ = (a: number) => `rgba(${accentRaw},${a})`;

  return {
    mode,
    isDark,
    toggle,
    bg: isDark ? "#070808" : LIGHT_BG,
    bg2: isDark ? "#0e100f" : LIGHT_BG2,
    fg: isDark ? "#e8eae9" : `rgb(${LIGHT_FG})`,
    fgRaw,
    accentRaw,
    accent: `rgb(${accentRaw})`,

    navBg: isDark ? "rgba(10,13,12,0.66)" : "rgba(250,249,246,0.78)",

    cardBg: isDark ? "#0e100f" : LIGHT_BG2,
    cardBgDim: isDark ? "#0a0c0b" : LIGHT_BG3,

    terminalBg: isDark ? "rgba(8,10,9,0.72)" : "rgba(255,255,255,0.92)",
    // Derived rather than hardcoded: this was the one surface still carrying a
    // literal copy of the old teal, and it would have silently kept it.
    terminalHeaderBg: isDark ? ac_(0.025) : ac_(0.05),
    terminalStatsBg: isDark ? "rgba(0,0,0,0.30)" : "rgba(31,27,16,0.025)",
    terminalRowBg: isDark ? "rgba(8,10,9,0.82)" : "rgba(255,255,255,0.65)",

    fg_,
    ac_,
  };
};

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeCtx = createContext<Theme>(buildTheme("dark", () => {}));

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem("theme") as ThemeMode) || "dark";
    } catch {
      return "dark";
    }
  });

  const toggle = () =>
    setMode((m) => {
      const next = m === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* private mode */
      }
      return next;
    });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", mode === "dark" ? "#070808" : "#faf9f6");
    }

    const favicon = document.getElementById(
      "favicon",
    ) as HTMLLinkElement | null;

    if (favicon) {
      favicon.href =
        mode === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg";
    }
  }, [mode]);
  /**
   * Push light mode's accent into the CSS custom properties, so LIGHT_ACCENT
   * above is the single place it is decided and the stylesheet cannot drift
   * from what the 3D scene is drawing.
   *
   * index.css still ships the same values as a static fallback: they are what
   * paints before this effect runs, so they must agree with the default here.
   * Dark mode removes the overrides entirely and falls back to :root.
   */
  useEffect(() => {
    const root = document.documentElement;
    const vars: Array<[string, number | null]> = [
      ["--accent", null],
      ["--accent-dim", 0.6],
      ["--accent-muted", 0.09],
      ["--accent-border", 0.28],
    ];

    if (mode !== "light") {
      for (const [name] of vars) root.style.removeProperty(name);
      return;
    }

    for (const [name, alpha] of vars) {
      root.style.setProperty(
        name,
        alpha === null ? `rgb(${LIGHT_AC})` : `rgba(${LIGHT_AC},${alpha})`,
      );
    }
  }, [mode]);

  return (
    <ThemeCtx.Provider value={buildTheme(mode, toggle)}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () => useContext(ThemeCtx);
