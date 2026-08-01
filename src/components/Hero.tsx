/**
 * Hero.tsx — redesigned.
 *
 * The old hero was a wall of terminal. The new one is one statement and
 * one proof: a display headline, a single readable subtitle, two CTAs —
 * and beneath them a slim glass strip of *real* live market data
 * (Binance WebSocket tickers + sparklines + Pyth oracle basis). The full
 * DEX terminal still lives in Projects → DEX tab; the hero just proves
 * the wires are live.
 *
 * All data plumbing from the previous hero is preserved: kline history,
 * WS ticker stream with reconnect, Pyth SSE basis.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { usePythPrice, computeBasisBps } from "./usePythPrice";
import { Magnetic } from "./motion/Magnetic";

// ─── Pairs ────────────────────────────────────────────────────────────────────
const PAIR_MAP = [
  { symbol: "ethusdt", pair: "ETH" },
  { symbol: "btcusdt", pair: "BTC" },
  { symbol: "solusdt", pair: "SOL" },
  { symbol: "arbusdt", pair: "ARB" },
] as const;

const BINANCE_WS_URL =
  "wss://stream.binance.com:9443/stream?streams=" +
  PAIR_MAP.map((p) => `${p.symbol}@ticker`).join("/");

interface Ticker {
  pair: string;
  price: number;
  change: number;
}

const fmtPrice = (p: number): string =>
  p >= 1000
    ? p.toLocaleString("en", { maximumFractionDigits: 0 })
    : p.toFixed(p < 10 ? 4 : 2);

// ─── Smooth sparkline path ────────────────────────────────────────────────────
const sparkPath = (pts: readonly number[], w: number, h: number): string => {
  if (pts.length < 2) return "";
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const range = mx - mn || 1;
  const pad = h * 0.12;
  const xy = (i: number): [number, number] => [
    (i / (pts.length - 1)) * w,
    pad + (1 - (pts[i] - mn) / range) * (h - pad * 2),
  ];
  let d = `M ${xy(0)[0].toFixed(1)},${xy(0)[1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = xy(i - 1);
    const [x, y] = xy(i);
    const cx = (px + x) / 2;
    d += ` Q ${px.toFixed(1)},${py.toFixed(1)} ${cx.toFixed(1)},${((py + y) / 2).toFixed(1)}`;
  }
  return d;
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const Hero = () => {
  const t = useTheme();

  // Orchestrated entrance: one stagger, keyed off mount.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const ts = [180, 420, 700, 980, 1250].map((ms, i) =>
      window.setTimeout(() => setStage(i + 1), ms),
    );
    return () => ts.forEach(window.clearTimeout);
  }, []);

  // ── Live data (preserved from the previous hero) ──────────────────────────
  const [tickers, setTickers] = useState<Ticker[]>(
    PAIR_MAP.map((c) => ({ pair: c.pair, price: 0, change: 0 })),
  );
  const [sparks, setSparks] = useState<number[][]>(PAIR_MAP.map(() => []));
  const [flashIdx, setFlashIdx] = useState(-1);
  const [live, setLive] = useState(false);
  const flashTimer = useRef(0);

  const pythEth = usePythPrice("ETH/USDC");

  const fetchKlines = useCallback(async () => {
    const results = await Promise.allSettled(
      PAIR_MAP.map(({ symbol }) =>
        fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=15m&limit=96`,
        )
          .then((r) => r.json())
          .then(
            (data: [number, string, string, string, string, ...unknown[]][]) =>
              data.map((k) => parseFloat(k[4])),
          ),
      ),
    );
    setSparks((prev) =>
      results.map((r, i) => (r.status === "fulfilled" ? r.value : prev[i])),
    );
  }, []);

  useEffect(() => {
    void fetchKlines();
    const id = setInterval(() => void fetchKlines(), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchKlines]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let alive = true;

    const connect = (): void => {
      ws = new WebSocket(BINANCE_WS_URL);
      ws.onopen = () => alive && setLive(true);
      ws.onerror = () => alive && setLive(false);
      ws.onclose = () => {
        if (!alive) return;
        setLive(false);
        reconnectTimer = setTimeout(() => alive && connect(), 3000);
      };
      ws.onmessage = (evt: MessageEvent) => {
        if (!alive) return;
        try {
          const msg = JSON.parse(evt.data as string) as {
            data: { s: string; c: string; P: string };
          };
          const symbol = msg.data.s.toLowerCase();
          const idx = PAIR_MAP.findIndex((p) => p.symbol === symbol);
          if (idx === -1) return;
          const price = parseFloat(msg.data.c);
          const change = parseFloat(msg.data.P);

          setTickers((prev) => {
            const next = [...prev];
            next[idx] = {
              pair: next[idx].pair,
              price,
              change: +change.toFixed(2),
            };
            return next;
          });
          setSparks((prev) => {
            if (prev[idx].length === 0) return prev;
            const next = [...prev];
            next[idx] = [...prev[idx].slice(0, -1), price];
            return next;
          });
          setFlashIdx(idx);
          window.clearTimeout(flashTimer.current);
          flashTimer.current = window.setTimeout(() => setFlashIdx(-1), 450);
        } catch {
          /* ignore malformed frames */
        }
      };
    };

    connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      window.clearTimeout(flashTimer.current);
      ws?.close();
    };
  }, []);

  const ethMid = tickers[0]?.price ?? 0;
  const basisBps =
    pythEth && ethMid ? computeBasisBps(ethMid, pythEth.price) : null;

  const reveal = (from: number): React.CSSProperties => ({
    opacity: stage >= from ? 1 : 0,
    transform: stage >= from ? "none" : "translateY(20px)",
    filter: stage >= from ? "none" : "blur(6px)",
    transition:
      "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1), filter 0.9s cubic-bezier(0.16,1,0.3,1)",
  });

  return (
    <section
      id="home"
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6.5rem 1.5rem 4rem",
        textAlign: "center",
      }}
    >
      <div className="text-well">
        {/* Eyebrow */}
        <div
          className="mono-label"
          style={{ ...reveal(1), marginBottom: "1.5rem" }}
        >
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: t.accent,
              marginRight: "0.6rem",
              animation: "blink 2.4s ease-in-out infinite",
              verticalAlign: "middle",
            }}
          />
          Full-stack · Blockchain · Pune, IN
        </div>

        {/* Headline */}
        <h1 className="display-xl" style={{ ...reveal(2), maxWidth: "14ch" }}>
          {stage >= 2 ? (
            <ScrambleText text="Anish Kadam" active speed={26} />
          ) : (
            "Anish Kadam"
          )}
        </h1>
        <h1
          className="display-xl"
          style={{ ...reveal(2), color: t.fg_(0.3), maxWidth: "16ch" }}
        >
          builds on-chain.
        </h1>

        {/* Subtitle — one sentence, readable width */}
        <p
          className="body-text"
          style={{
            ...reveal(3),
            margin: "1.75rem auto 2.5rem",
            maxWidth: "46ch",
            fontSize: "1.0313rem",
          }}
        >
          Engineer of Web3 systems — building secure backends, smart contracts,
          and intuitive user experiences.
        </p>

        {/* CTAs */}
        <div
          style={{
            ...reveal(4),
            display: "flex",
            gap: "0.9rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Magnetic strength={8}>
            <a href="#projects" className="btn btn-primary">
              View projects <ArrowUpRight size={14} />
            </a>
          </Magnetic>
          <Magnetic strength={8}>
            <a href="#contact" className="btn btn-outline">
              Get in touch
            </a>
          </Magnetic>
        </div>
      </div>

      {/* Live market strip — the proof the wires are real */}
      <div
        className="glass"
        style={{
          ...reveal(5),
          marginTop: "clamp(2.5rem, 7vh, 4.5rem)",
          display: "flex",
          alignItems: "stretch",
          maxWidth: "min(760px, calc(100vw - 2rem))",
          width: "100%",
          background: t.navBg,
        }}
      >
        {tickers.map((tk, i) => {
          const up = tk.change >= 0;
          return (
            <div
              key={tk.pair}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "0.8rem 1rem 0.65rem",
                borderRight:
                  i < tickers.length - 1
                    ? "1px solid var(--border-mid)"
                    : "none",
                background: flashIdx === i ? t.ac_(0.05) : "transparent",
                transition: "background 0.4s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.15rem",
                }}
              >
                <span
                  className="data-text"
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    color: t.fg_(0.4),
                  }}
                >
                  {tk.pair}
                </span>
                <span
                  className="data-text"
                  style={{
                    fontSize: "0.58rem",
                    color: up ? t.accent : "rgba(255,110,110,0.85)",
                  }}
                >
                  {up ? "+" : ""}
                  {tk.change}%
                </span>
              </div>
              <div
                className="data-text"
                style={{
                  fontSize: "0.82rem",
                  color: t.fg_(0.9),
                  marginBottom: "0.3rem",
                }}
              >
                {tk.price ? `$${fmtPrice(tk.price)}` : "—"}
              </div>
              <svg
                width="100%"
                height="22"
                viewBox="0 0 120 22"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d={sparkPath(sparks[i], 120, 22)}
                  fill="none"
                  stroke={up ? t.ac_(0.7) : "rgba(255,110,110,0.6)"}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          );
        })}
      </div>

      {/* Status line under the strip */}
      <div
        className="data-text"
        style={{
          ...reveal(5),
          marginTop: "0.7rem",
          fontSize: "0.55rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: t.fg_(0.28),
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span>
          <span style={{ color: live ? t.accent : "rgba(255,160,80,0.8)" }}>
            ●
          </span>{" "}
          {live ? "Binance WS live" : "reconnecting"}
        </span>
        <span>Pyth oracle {pythEth ? `$${fmtPrice(pythEth.price)}` : "—"}</span>
        <span>
          basis{" "}
          {basisBps !== null
            ? `${basisBps >= 0 ? "+" : ""}${basisBps.toFixed(1)} bps`
            : "—"}
        </span>
      </div>

      {/* Scroll cue */}
      <a
        href="#about"
        aria-label="Scroll to about"
        style={{
          ...reveal(5),
          position: "absolute",
          bottom: "1.75rem",
          left: "50%",
          marginLeft: "-14px",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.fg_(0.3),
        }}
      >
        <ArrowDown size={14} />
      </a>
    </section>
  );
};
