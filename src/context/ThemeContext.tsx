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
const DARK_AC = "151,252,228"; // Bright Neon Mint

// Light: High-contrast compliment to the dark theme
// Deep, dark charcoal with a hint of teal to match the accent family
const LIGHT_FG = "10, 24, 22";
// A weighted "Deep Mint" - provides the same color energy as DARK_AC but visible on white
const LIGHT_AC = "0, 102, 89";

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

  // Light surfaces: "Ice Flow" palette
  // These compliment the #080808 dark background by using the opposite end of the luminance scale
  const ICE_BG = "#f5f9f8"; // Crisp, slightly cool white
  const ICE_BG2 = "#ebf2f1"; // Soft frost gray-green
  const ICE_BG3 = "#dfece9"; // Depth layer

  return {
    mode,
    isDark,
    toggle,
    bg: isDark ? "#080808" : ICE_BG,
    bg2: isDark ? "#111111" : ICE_BG2,
    fg: isDark ? "#e2e2e2" : `rgb(${LIGHT_FG})`,
    fgRaw,
    accentRaw,
    accent: isDark ? `rgb(${DARK_AC})` : `rgb(${LIGHT_AC})`,
    navBg: isDark ? "rgba(8,8,8,0.88)" : "rgba(245, 249, 248, 0.92)",
    cardBg: isDark ? "#111111" : ICE_BG2,
    cardBgDim: isDark ? "#0b0b0b" : ICE_BG3,
    // Terminal adjustments: Pure white base in light mode for maximum "paper" feel
    terminalBg: isDark ? "rgba(8,8,8,0.72)" : "rgba(255, 255, 255, 0.98)",
    terminalHeaderBg: isDark
      ? "rgba(151,252,228,0.025)"
      : "rgba(0, 102, 89, 0.04)",
    terminalStatsBg: isDark ? "rgba(0,0,0,0.30)" : "rgba(0, 0, 0, 0.02)",
    terminalRowBg: isDark ? "rgba(8,8,8,0.82)" : "rgba(255, 255, 255, 0.6)",
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
