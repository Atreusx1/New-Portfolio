import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

// ── Raw RGB tuples ────────────────────────────────────────────────────────────
// Dark: classic light-on-dark with mint teal accent
const DARK_FG = "226,226,226";
const DARK_AC = "151,252,228";
// Light: Hyperliquid-style — near-black teal text on mint seafoam bg
const LIGHT_FG = "10,32,24"; // near-black with green tint — high contrast on mint
const LIGHT_AC = "0,180,130"; // vivid emerald — readable against mint bg

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;

  // Surface
  bg: string;
  bg2: string;
  fg: string;

  // Raw strings for dynamic rgba()
  fgRaw: string;
  accentRaw: string;

  // Accent
  accent: string;

  // Specific surface tokens
  navBg: string;
  cardBg: string;
  cardBgDim: string;
  terminalBg: string;
  terminalHeaderBg: string;
  terminalStatsBg: string;
  terminalRowBg: string;

  // Helper functions — generate rgba() at any opacity
  fg_: (alpha: number) => string;
  ac_: (alpha: number) => string;
}

const buildTheme = (mode: ThemeMode, toggle: () => void): Theme => {
  const isDark = mode === "dark";
  const fgRaw = isDark ? DARK_FG : LIGHT_FG;
  const accentRaw = isDark ? DARK_AC : LIGHT_AC;

  const fg_ = (a: number) => `rgba(${fgRaw},${a})`;
  const ac_ = (a: number) => `rgba(${accentRaw},${a})`;

  // Light surfaces: mint seafoam family (Hyperliquid-inspired)
  const MINT_BG = "#dbfbf6";
  const MINT_BG2 = "#bdfce8";
  const MINT_BG3 = "#a0ead8";

  return {
    mode,
    isDark,
    toggle,
    bg: isDark ? "#080808" : MINT_BG,
    bg2: isDark ? "#111111" : MINT_BG2,
    fg: isDark ? "#e2e2e2" : "#0a2018",
    fgRaw,
    accentRaw,
    accent: isDark ? `rgb(${DARK_AC})` : `rgb(${LIGHT_AC})`,
    navBg: isDark ? "rgba(8,8,8,0.88)" : "rgba(211, 248, 241, 0.92)",
    cardBg: isDark ? "#111111" : MINT_BG2,
    cardBgDim: isDark ? "#0b0b0b" : MINT_BG3,
    terminalBg: isDark ? "rgba(8,8,8,0.72)" : "rgba(211, 248, 241, 0.92)",
    terminalHeaderBg: isDark
      ? "rgba(151,252,228,0.025)"
      : "rgba(0,180,130,0.08)",
    terminalStatsBg: isDark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.04)",
    terminalRowBg: isDark ? "rgba(8,8,8,0.82)" : "rgba(202,247,238,0.82)",
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
      } catch {}
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
