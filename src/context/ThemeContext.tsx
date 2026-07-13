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
const DARK_AC = "151,252,228"; // neon mint — the brand

// Light mode is its own design system: warm paper + ink + deep teal.
// Warm (not gray) whites read as "Notion / Linear light", and the teal
// stays a signal color against them instead of dissolving.
const LIGHT_FG = "27,26,22"; // warm near-black ink
const LIGHT_AC = "0,132,99"; // deep teal — same hue family as the mint

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

  // Warm paper surfaces — synced with index.css light tokens.
  const LIGHT_BG = "#faf9f6";
  const LIGHT_BG2 = "#f2f0ea";
  const LIGHT_BG3 = "#eae7df";

  return {
    mode,
    isDark,
    toggle,
    bg: isDark ? "#070808" : LIGHT_BG,
    bg2: isDark ? "#0e100f" : LIGHT_BG2,
    fg: isDark ? "#e8eae9" : `rgb(${LIGHT_FG})`,
    fgRaw,
    accentRaw,
    accent: isDark ? `rgb(${DARK_AC})` : `rgb(${LIGHT_AC})`,

    navBg: isDark ? "rgba(10,13,12,0.66)" : "rgba(250,249,246,0.78)",

    cardBg: isDark ? "#0e100f" : LIGHT_BG2,
    cardBgDim: isDark ? "#0a0c0b" : LIGHT_BG3,

    terminalBg: isDark ? "rgba(8,10,9,0.72)" : "rgba(255,255,255,0.92)",
    terminalHeaderBg: isDark
      ? "rgba(151,252,228,0.025)"
      : "rgba(0,132,99,0.05)",
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
  }, [mode]);

  return (
    <ThemeCtx.Provider value={buildTheme(mode, toggle)}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () => useContext(ThemeCtx);
