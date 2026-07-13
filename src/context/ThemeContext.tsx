import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

// ── Raw RGB tuples ────────────────────────────────────────────────────────────
const DARK_FG = "226,226,226";
const DARK_AC = "151,252,228"; // Bright Neon Mint

// Light mode: neutral "paper" surface so the teal reads as a signal color,
// not a background tint. The old palette tinted bg + accent the same
// green-mint hue, which killed the terminal/DEX contrast that makes the
// dark theme work — everything read as one soft color instead of
// "signal punching out of a neutral surface."
const LIGHT_FG = "16,20,19"; // near-black, faint cool undertone for readability
const LIGHT_AC = "0,140,102"; // deepened teal — same brand hue, more punch on white

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

  // ── Light surfaces — neutral cool paper, not mint-tinted ─────────────────
  // Desaturating the surface is what lets the teal accent read as a signal
  // color again instead of blending into a same-hue background.
  const LIGHT_BG = "#f6f7f7";
  const LIGHT_BG2 = "#ebeceb";
  const LIGHT_BG3 = "#dfe1e0";

  return {
    mode,
    isDark,
    toggle,
    bg: isDark ? "#080808" : LIGHT_BG,
    bg2: isDark ? "#111111" : LIGHT_BG2,
    fg: isDark ? "#e2e2e2" : `rgb(${LIGHT_FG})`,
    fgRaw,
    accentRaw,
    accent: isDark ? `rgb(${DARK_AC})` : `rgb(${LIGHT_AC})`,

    // Nav background — frosted effect
    navBg: isDark ? "rgba(8,8,8,0.72)" : "rgba(246,247,247,0.82)",

    cardBg: isDark ? "#111111" : LIGHT_BG2,
    cardBgDim: isDark ? "#0b0b0b" : LIGHT_BG3,

    // Terminal: dark glass in dark mode, paper-white in light
    terminalBg: isDark ? "rgba(8,8,8,0.72)" : "rgba(255,255,255,0.92)",
    terminalHeaderBg: isDark
      ? "rgba(151,252,228,0.025)"
      : "rgba(0,140,102,0.05)",
    terminalStatsBg: isDark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.02)",
    terminalRowBg: isDark ? "rgba(8,8,8,0.82)" : "rgba(255,255,255,0.65)",

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
