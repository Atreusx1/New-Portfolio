/**
 * Boot.tsx: terminal-inspired loading sequence.
 *
 * > Initializing neural network...        ✓ OK
 * > Connecting validator nodes...         ✓ OK
 * > Welcome, visitor._
 *
 * · Runs once per session (sessionStorage), ~2.4s total.
 * · Click / key / prefers-reduced-motion skips it instantly.
 * · One faint scanline + grain: CRT by suggestion, never cheesy.
 * · Fades out with a blur dissolve, then unmounts completely.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { prefersReducedMotion } from "./motion/Reveal";

const BOOT_LINES = [
  "initializing neural network",
  "loading smart contracts",
  "connecting validator nodes",
  "building blockchain graph",
  "synchronizing portfolio",
] as const;

const FINAL_LINE = "welcome, visitor.";
const LINE_INTERVAL_MS = 340;
const TYPE_INTERVAL_MS = 26;
const EXIT_DELAY_MS = 620;
const SESSION_KEY = "ak-booted";

interface BootProps {
  onDone: () => void;
}

export const Boot = ({ onDone }: BootProps) => {
  const t = useTheme();
  const skip = useMemo(
    () =>
      prefersReducedMotion() ||
      (typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(SESSION_KEY) === "1"),
    [],
  );

  const [lineCount, setLineCount] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = (): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode */
    }
    setLeaving(true);
    window.setTimeout(onDone, EXIT_DELAY_MS);
  };

  // Reveal check-lines one by one, then type the welcome line.
  useEffect(() => {
    if (skip) {
      onDone();
      return;
    }
    if (lineCount < BOOT_LINES.length) {
      const id = window.setTimeout(
        () => setLineCount((n) => n + 1),
        LINE_INTERVAL_MS,
      );
      return () => window.clearTimeout(id);
    }
    if (typedChars < FINAL_LINE.length) {
      const id = window.setTimeout(
        () => setTypedChars((n) => n + 1),
        TYPE_INTERVAL_MS,
      );
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(finish, 520);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, lineCount, typedChars]);

  // Any interaction skips.
  useEffect(() => {
    if (skip) return;
    const onSkip = (): void => finish();
    window.addEventListener("keydown", onSkip);
    window.addEventListener("pointerdown", onSkip);
    return () => {
      window.removeEventListener("keydown", onSkip);
      window.removeEventListener("pointerdown", onSkip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  if (skip) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: t.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: leaving ? 0 : 1,
        filter: leaving ? "blur(10px)" : "none",
        transition: `opacity ${EXIT_DELAY_MS}ms cubic-bezier(0.16,1,0.3,1), filter ${EXIT_DELAY_MS}ms cubic-bezier(0.16,1,0.3,1)`,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      {/* One drifting scanline: CRT by suggestion */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "72px",
          background: `linear-gradient(180deg, transparent, ${t.ac_(0.025)}, transparent)`,
          animation: "scanline 5s linear infinite",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.72rem",
          letterSpacing: "0.04em",
          lineHeight: 2.1,
          minWidth: "min(360px, 82vw)",
        }}
      >
        {BOOT_LINES.slice(0, lineCount).map((line, i) => (
          <div
            key={line}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "2rem",
              color: t.fg_(0.42),
              animation: "fadeIn 0.25s ease forwards",
            }}
          >
            <span>
              <span style={{ color: t.ac_(0.5), marginRight: "0.75rem" }}>
                &gt;
              </span>
              {line}
              {"…"}
            </span>
            <span style={{ color: t.accent }}>
              {i < lineCount - 1 || lineCount === BOOT_LINES.length
                ? "✓ ok"
                : ""}
            </span>
          </div>
        ))}

        {lineCount === BOOT_LINES.length && (
          <div style={{ color: t.fg, marginTop: "0.8rem" }}>
            <span style={{ color: t.ac_(0.5), marginRight: "0.75rem" }}>
              &gt;
            </span>
            {FINAL_LINE.slice(0, typedChars)}
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "0.95em",
                background: t.accent,
                marginLeft: "3px",
                verticalAlign: "text-bottom",
                animation: "blink 1s steps(1) infinite",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
