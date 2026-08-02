/**
 * HeroRedesign.tsx — the hero, rebuilt around the globe instead of on top of it.
 *
 * ── What changed and why ──
 * The previous hero was a centred column: eyebrow, headline, subtitle, buttons,
 * then a full-width glass strip of tickers, all stacked down the middle of the
 * screen. That layout was designed when the background was a decoration. It no
 * longer is — the globe is three shells, a drawn phyllotactic lattice, rim
 * light and a pointer field, and it sits dead centre of the viewport at roughly
 * 68% of its height. A centred column puts every word of copy directly on top
 * of the one object the section exists to show.
 *
 * So the composition is now a frame with a hole in it:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ ANISH                                 ┌──────┤
 *   │ KADAM              ( globe )          │ ETH  │
 *   │ builds on-chain.                      │ BTC  │
 *   │ subtitle                              │ SOL  │
 *   │ [projects] [contact]                  │ ARB  │
 *   ├───────────────────────────────────────┴──────┤
 *   │ WS LIVE · PYTH $… · BASIS … bps            ↓ │
 *   └──────────────────────────────────────────────┘
 *
 * Three deliberate calls:
 *
 *  1. **Nothing is a solid card.** The rail is glass, the lede sits on a
 *     directional gradient scrim rather than in a box, and the status bar is a
 *     hairline and some type. Every surface the globe passes behind is
 *     translucent, which is the difference between composing with a background
 *     and covering one.
 *  2. **The centre column is empty and stays empty.** It is the widest single
 *     region in the layout and it holds nothing. That is the negative space
 *     doing the work — the eye lands there because there is nothing else there.
 *  3. **The tickers became an instrument rail.** Four rows on the right edge,
 *     right-aligned, tabular, hairline-separated, with the sparkline running
 *     the full width of its row. A vertical tape reads as a market feed; the
 *     old horizontal strip of four equal cards read as a stat block.
 *
 * ── Semantics fixed on the way past ──
 * The old hero had two `<h1>` elements. This has one, with the two type tiers
 * as spans inside it — and it finally uses `.display-sub`, which has been
 * defined in index.css all along with a comment describing exactly this job
 * while the old hero used a second `.display-xl` at 0.3 alpha instead.
 *
 * ── Data plumbing ──
 * Carried over verbatim: the Binance WebSocket ticker stream with its reconnect
 * loop, the 15-minute kline poll for sparkline history, and the Pyth oracle
 * basis. It still mounts immediately rather than waiting for the boot screen,
 * which is the point — see motion/Entrance.tsx.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { ScrambleText } from "./Scrambletext";
import { useTheme } from "../context/ThemeContext";
import { usePythPrice, computeBasisBps } from "./usePythPrice";
import { Magnetic } from "./motion/Magnetic";
import { useStagedEntrance } from "./motion/Entrance";

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

/**
 * Entrance offsets, in ms from the moment the boot screen clears. Slower than
 * the old [180…1250] because it is now actually watched: the previous timings
 * were tuned against an animation nobody could see.
 */
const STAGES = [140, 340, 600, 860, 1080, 1260, 1520] as const;

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
export const HeroRedesign = () => {
  const t = useTheme();

  // Starts when the boot overlay clears, not when this component mounts.
  const stage = useStagedEntrance(STAGES);

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

  /**
   * Entrance state for one stage. Transitions live in CSS (`.hero-step`); this
   * only flips the end values.
   *
   * The rail animates as a single panel rather than row by row — it is a sheet
   * of glass, and a sheet of glass does not arrive in four pieces. A per-row
   * stagger would also have had to share the `transition-delay` the tick flash
   * uses, which would have made every price update feel a fifth of a second
   * late for the rest of the session.
   */
  const step = (from: number): React.CSSProperties => ({
    opacity: stage >= from ? 1 : 0,
    transform: stage >= from ? "none" : "translateY(16px)",
    filter: stage >= from ? "none" : "blur(7px)",
  });

  return (
    <section id="home" className="hero">
      <div className="hero-frame">
        {/* ── Left: the statement ─────────────────────────────────────── */}
        <div className="hero-lede">
          <div className="eyebrow hero-eyebrow hero-step" style={step(1)}>
            <span
              className="hero-pulse"
              style={{ background: t.accent }}
              aria-hidden="true"
            />
            Full-stack · Blockchain · Pune, IN
          </div>

          <h1 className="hero-headline">
            <span className="display-xl hero-name hero-step" style={step(2)}>
              {stage >= 2 ? (
                <ScrambleText text="Anish Kadam" active speed={26} />
              ) : (
                "Anish Kadam"
              )}
            </span>
            <span className="display-sub hero-claim hero-step" style={step(3)}>
              builds on-chain.
            </span>
          </h1>

          <p className="body-text hero-blurb hero-step" style={step(4)}>
            Engineer of Web3 systems — building secure backends, smart contracts,
            and intuitive user experiences.
          </p>

          <div className="hero-actions hero-step" style={step(5)}>
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

        {/*
          The aperture. Deliberately empty, deliberately the widest column:
          this is the hole the globe is seen through, and the only way to
          give a background object presence is to give it room.
        */}
        <div className="hero-aperture" aria-hidden="true" />

        {/* ── Right: the instrument rail ──────────────────────────────── */}
        <aside
          className="hero-tape glass hero-step"
          style={step(6)}
          aria-label="Live market data"
        >
          <header className="hero-tape-head">
            <span>Live market</span>
            <span
              className="hero-tape-state"
              data-live={live ? "true" : "false"}
            >
              {live ? "streaming" : "reconnecting"}
            </span>
          </header>

          {tickers.map((tk, i) => {
            const up = tk.change >= 0;
            return (
              <div
                key={tk.pair}
                className="tape-row"
                data-flash={flashIdx === i ? "true" : "false"}
              >
                <div className="tape-line">
                  <span className="tape-pair">{tk.pair}</span>
                  <span className="tape-price">
                    {tk.price ? fmtPrice(tk.price) : "—"}
                  </span>
                </div>
                <div className="tape-line tape-line-under">
                  <svg
                    className="tape-spark"
                    viewBox="0 0 120 20"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d={sparkPath(sparks[i], 120, 20)}
                      fill="none"
                      stroke={up ? "var(--pos)" : "var(--neg)"}
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span
                    className="tape-change"
                    data-up={up ? "true" : "false"}
                  >
                    {up ? "+" : ""}
                    {tk.change}%
                  </span>
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      {/* ── Bottom: system telemetry, not market data ─────────────────── */}
      <div className="hero-status hero-step" style={step(7)}>
        <span className="hero-stat">
          <span
            className="hero-dot"
            data-live={live ? "true" : "false"}
            aria-hidden="true"
          />
          Binance WS {live ? "live" : "reconnecting"}
        </span>
        <span className="hero-stat">
          Pyth ETH/USDC {pythEth ? `$${fmtPrice(pythEth.price)}` : "—"}
        </span>
        <span className="hero-stat">
          Basis{" "}
          {basisBps !== null
            ? `${basisBps >= 0 ? "+" : ""}${basisBps.toFixed(1)} bps`
            : "—"}
        </span>

        <a href="#about" className="hero-scroll" aria-label="Scroll to about">
          <ArrowDown size={13} />
        </a>
      </div>
    </section>
  );
};
