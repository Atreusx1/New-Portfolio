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

// COMPLIMENTARY LIGHT THEME: "CEMENT & OBSIDIAN"
// Deep obsidian-charcoal for text
const LIGHT_FG = "18, 20, 20";
// Desaturated Spruce — a sophisticated version of the dark mint for light surfaces
const LIGHT_AC = "12, 84, 76";

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

  // Cement surfaces: Matte, low-glare neutrals
  const CEMENT_BG = "#dcdedc"; // A solid, warm gray base
  const CEMENT_BG2 = "#ced1ce"; // Slightly deeper concrete
  const CEMENT_BG3 = "#bfc4bf"; // Inset/Dimmed surface

  return {
    mode,
    isDark,
    toggle,
    bg: isDark ? "#080808" : CEMENT_BG,
    bg2: isDark ? "#111111" : CEMENT_BG2,
    fg: isDark ? "#e2e2e2" : `rgb(${LIGHT_FG})`,
    fgRaw,
    accentRaw,
    accent: isDark ? `rgb(${DARK_AC})` : `rgb(${LIGHT_AC})`,
    navBg: isDark ? "rgba(8,8,8,0.88)" : "rgba(220, 222, 220, 0.94)",
    cardBg: isDark ? "#111111" : CEMENT_BG2,
    cardBgDim: isDark ? "#0b0b0b" : CEMENT_BG3,
    // Terminal: "Matte Paper" look to kill the blue-light glare
    terminalBg: isDark ? "rgba(8,8,8,0.72)" : "rgba(255, 255, 255, 0.75)",
    terminalHeaderBg: isDark
      ? "rgba(151,252,228,0.025)"
      : "rgba(12, 84, 76, 0.1)",
    terminalStatsBg: isDark ? "rgba(0,0,0,0.30)" : "rgba(0, 0, 0, 0.05)",
    terminalRowBg: isDark ? "rgba(8,8,8,0.82)" : "rgba(255, 255, 255, 0.3)",
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
