import { useEffect, useState, useRef, useCallback } from "react";
import { ScrambleText } from "./Scrambletext";
import { HeroThree } from "./HeroThree";
import { useTheme } from "../context/ThemeContext";
import { usePythPrice, computeBasisBps } from "./usePythPrice";

// ─── Pairs ────────────────────────────────────────────────────
const PAIR_MAP = [
  { symbol: "ethusdt", pair: "ETH/USDC" },
  { symbol: "btcusdt", pair: "BTC/USDT" },
  { symbol: "solusdt", pair: "SOL/USDC" },
  { symbol: "arbusdt", pair: "ARB/USDC" },
];

const BINANCE_WS_URL =
  "wss://stream.binance.com:9443/stream?streams=" +
  PAIR_MAP.map((p) => `${p.symbol}@ticker`).join("/");

// ─── Sarcasm ──────────────────────────────────────────────────
const SARCASM = [
  "pro tip: buy high, sell low",
  "just one more dip",
  "this is good for bitcoin",
  "to the moon 🚀 (any day now)",
  "it's a healthy correction",
  "have you tried turning the market off and on again?",
  "just hodl bro, trust the process",
  "ser, this is a dex",
  "it's not a crash, it's a discount",
  "1 ETH = 1 ETH. fundamentals.",
  "wen lambo? soon™",
  "we are still early",
  "buy the dip",
  "price is just noise",
  "long term play",
  "generational wealth",
];

const genHash = () =>
  "0x" +
  Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");

interface Ticker {
  pair: string;
  price: number;
  change: number;
  vol: string;
  prevPrice?: number;
}

// ─── Smooth Catmull-Rom sparkline ─────────────────────────────
// Returns {line, area} SVG path strings for a given price series.
const makeSmoothSpark = (
  pts: number[],
  w: number,
  h: number,
): { line: string; area: string } => {
  if (pts.length < 2) return { line: "", area: "" };
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const range = mx - mn || 1;
  const pad = h * 0.08;

  const coords = pts.map((p, i) => ({
    x: (i / (pts.length - 1)) * w,
    y: pad + (1 - (p - mn) / range) * (h - pad * 2),
  }));

  // Catmull-Rom → cubic bezier
  let line = `M ${coords[0].x.toFixed(2)},${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  const last = coords[coords.length - 1];
  const area =
    line + ` L ${last.x.toFixed(2)},${h} L ${coords[0].x.toFixed(2)},${h} Z`;

  return { line, area };
};

const fmtVol = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return `${(v / 1e3).toFixed(0)}K`;
};
const fmtPrice = (p: number) =>
  p >= 1000
    ? p.toLocaleString("en", { maximumFractionDigits: 0 })
    : p.toFixed(p < 10 ? 4 : 2);

// ─── Sub-components ───────────────────────────────────────────

const Sep = ({ accentRaw }: { accentRaw: string }) => (
  <div style={{ height: "1px", background: `rgba(${accentRaw},0.07)` }} />
);

const SarcasmTicker = ({ accentRaw }: { accentRaw: string }) => {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % SARCASM.length);
        setVisible(true);
      }, 500);
    }, 4500);
    return () => clearInterval(cycle);
  }, []);
  return (
    <div
      style={{
        fontFamily: "Space Mono, monospace",
        fontSize: "0.58rem",
        letterSpacing: "0.08em",
        color: `rgba(${accentRaw},0.42)`,
        fontStyle: "italic",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.45s ease",
        minHeight: "1.2em",
        padding: "0.5rem 1rem",
        borderTop: `1px solid rgba(${accentRaw},0.07)`,
        background: `rgba(${accentRaw},0.012)`,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span style={{ color: `rgba(${accentRaw},0.55)`, fontStyle: "normal" }}>
        oracle://
      </span>
      {SARCASM[idx]}
    </div>
  );
};

const ActivityStrip = ({ accentRaw }: { accentRaw: string }) => {
  const [hashes, setHashes] = useState(() =>
    Array.from({ length: 6 }, () => ({
      hash: genHash(),
      type: Math.random() > 0.5 ? "SWAP" : "BRIDGE",
    })),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setHashes((prev) => [
        { hash: genHash(), type: Math.random() > 0.5 ? "SWAP" : "BRIDGE" },
        ...prev.slice(0, 5),
      ]);
    }, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      style={{
        overflow: "hidden",
        padding: "0.35rem 1rem",
        borderTop: `1px solid rgba(${accentRaw},0.06)`,
        background: `rgba(${accentRaw},0.008)`,
        display: "flex",
        gap: "1.2rem",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "0.46rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: `rgba(${accentRaw},0.25)`,
          flexShrink: 0,
        }}
      >
        MEMPOOL
      </span>
      <div
        style={{ display: "flex", gap: "1rem", overflow: "hidden", flex: 1 }}
      >
        {hashes.map(({ hash, type }, i) => (
          <span
            key={i}
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.46rem",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
              flexShrink: 0,
              color:
                i === 0 ? `rgba(${accentRaw},0.55)` : `rgba(${accentRaw},0.18)`,
              transition: "color 0.4s ease",
            }}
          >
            <span
              style={{
                color:
                  type === "SWAP"
                    ? `rgba(${accentRaw},0.5)`
                    : "rgba(255,200,100,0.4)",
                marginRight: "0.3em",
              }}
            >
              {type}
            </span>
            {hash}
          </span>
        ))}
      </div>
    </div>
  );
};

const NetworkHealth = ({
  tps,
  blockNum,
  accentRaw,
}: {
  tps: number;
  blockNum: number;
  accentRaw: string;
}) => {
  const bars = 16;
  const health = Math.min(1, (tps - 3800) / 1200);
  return (
    <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
      {Array.from({ length: bars }, (_, i) => {
        const active = i / bars < health;
        return (
          <div
            key={i}
            style={{
              width: "2px",
              height: `${6 + (i % 3) * 2}px`,
              background: active
                ? `rgb(${accentRaw})`
                : `rgba(${accentRaw},0.12)`,
              borderRadius: "1px",
              transition: "background 0.4s ease",
            }}
          />
        );
      })}
    </div>
  );
};

// ─── Sparkline with gradient fill ─────────────────────────────
const SparkLine = ({
  pts,
  up,
  accentRaw,
  id,
}: {
  pts: number[];
  up: boolean;
  accentRaw: string;
  id: string;
}) => {
  const W = 88;
  const H = 28;
  const { line, area } = makeSmoothSpark(pts, W, H);
  const lineColor = up ? `rgb(${accentRaw})` : "rgb(255,90,90)";
  const fillId = `spark-fill-${id}`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={lineColor}
            stopOpacity={up ? 0.22 : 0.18}
          />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${fillId})`} />}
      {line && (
        <path
          d={line}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {/* Live dot at end */}
      {pts.length > 1 &&
        (() => {
          const mn = Math.min(...pts),
            mx = Math.max(...pts);
          const range = mx - mn || 1;
          const pad = H * 0.08;
          const ly =
            pad + (1 - (pts[pts.length - 1] - mn) / range) * (H - pad * 2);
          return <circle cx={W} cy={ly} r="2" fill={lineColor} opacity="0.9" />;
        })()}
    </svg>
  );
};

// ─── Hero ─────────────────────────────────────────────────────
export const Hero = () => {
  const t = useTheme();

  const [active, setActive] = useState(false);
  const [lineVis, setLineVis] = useState(false);
  const [subVis, setSubVis] = useState(false);
  const [ctaVis, setCtaVis] = useState(false);
  const [threeVis, setThreeVis] = useState(false);

  const [tickers, setTickers] = useState<Ticker[]>(
    PAIR_MAP.map((c) => ({ pair: c.pair, price: 0, change: 0, vol: "—" })),
  );
  // sparks[i] = array of close prices from Binance klines (24 hr, 15-min candles)
  const [sparks, setSparks] = useState<number[][]>(PAIR_MAP.map(() => []));
  const [flashIdx, setFlashIdx] = useState(-1);
  const [blockNum, setBlockNum] = useState(19_482_341);
  const [tps, setTps] = useState(4218);
  const [fetchErr, setFetchErr] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [latency, setLatency] = useState(18);
  const [gasPrice, setGasPrice] = useState(24);

  const pythEth = usePythPrice("ETH/USDC");

  const gridRef = useRef<HTMLCanvasElement>(null);
  const accentRawRef = useRef(t.accentRaw);
  const isDarkRef = useRef(t.isDark);
  useEffect(() => {
    accentRawRef.current = t.accentRaw;
    isDarkRef.current = t.isDark;
  }, [t.accentRaw, t.isDark]);

  // ── Reveals ────────────────────────────────────────────────
  useEffect(() => {
    const ts = [
      setTimeout(() => setActive(true), 280),
      setTimeout(() => setLineVis(true), 560),
      setTimeout(() => setSubVis(true), 840),
      setTimeout(() => setCtaVis(true), 1100),
      setTimeout(() => setThreeVis(true), 450),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  // ── Fetch 24 hr kline history from Binance REST ─────────────
  // 96 × 15-min candles = 24 hr of smooth data
  const fetchKlines = useCallback(async () => {
    const results = await Promise.allSettled(
      PAIR_MAP.map(({ symbol }) =>
        fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=15m&limit=96`,
        )
          .then((r) => r.json())
          .then(
            (data: [number, string, string, string, string, ...unknown[]][]) =>
              data.map((k) => parseFloat(k[4])), // close price
          ),
      ),
    );
    setSparks(
      results.map((r, i) => (r.status === "fulfilled" ? r.value : sparks[i])),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchKlines();
    // Refresh kline history every 15 min to keep it aligned
    const id = setInterval(fetchKlines, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchKlines]);

  // ── Binance WebSocket — real-time ticker updates ─────────────
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let alive = true;

    const connect = () => {
      ws = new WebSocket(BINANCE_WS_URL);
      ws.onopen = () => {
        if (alive) setFetchErr(false);
      };
      ws.onerror = () => {
        if (alive) setFetchErr(true);
      };
      ws.onclose = () => {
        if (alive) {
          setFetchErr(true);
          reconnectTimer = setTimeout(() => {
            if (alive) connect();
          }, 3000);
        }
      };
      ws.onmessage = (evt: MessageEvent) => {
        if (!alive) return;
        try {
          const msg = JSON.parse(evt.data as string) as {
            stream: string;
            data: { s: string; c: string; P: string; q: string };
          };
          const { s, c, P, q } = msg.data;
          const symbol = s.toLowerCase();
          const idx = PAIR_MAP.findIndex((p) => p.symbol === symbol);
          if (idx === -1) return;

          const newPrice = parseFloat(c);
          const newChange = parseFloat(P);

          setTickers((prev) => {
            const next = [...prev];
            next[idx] = {
              pair: next[idx].pair,
              price: newPrice,
              change: +newChange.toFixed(2),
              vol: fmtVol(parseFloat(q)),
              prevPrice: next[idx].price || newPrice,
            };
            return next;
          });

          // Replace the last kline close with the live price so the chart
          // tail tracks the current price in real-time
          setSparks((prev) => {
            if (prev[idx].length === 0) return prev;
            const next = [...prev];
            next[idx] = [...prev[idx].slice(0, -1), newPrice];
            return next;
          });

          setFlashIdx(idx);
          setTimeout(() => setFlashIdx(-1), 500);

          const now = new Date();
          setLastUpdated(
            `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
          );
          setLatency(8 + Math.floor(Math.random() * 18));
        } catch {
          /* ignore */
        }
      };
    };

    connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // ── Block counter + TPS + Gas ───────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setBlockNum((n) => n + Math.floor(Math.random() * 3));
      setTps((n) =>
        Math.max(
          3800,
          Math.min(4800, n + Math.floor((Math.random() - 0.5) * 120)),
        ),
      );
      setGasPrice((n) =>
        Math.max(14, Math.min(64, n + Math.floor((Math.random() - 0.5) * 6))),
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // ── Background grid canvas ──────────────────────────────────
  useEffect(() => {
    const canvas = gridRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    let mx = -999,
      my = -999;
    const onMouse = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("mousemove", onMouse);
    const S = 80;
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / S) + 1;
      const rows = Math.ceil(canvas.height / S) + 1;
      const ac = accentRawRef.current;
      const dark = isDarkRef.current;
      const baseAlpha = dark ? 0.022 : 0.042;
      const infAlpha = dark ? 0.13 : 0.2;
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const x = c * S,
            y = r * S;
          const inf = Math.max(0, 1 - Math.hypot(mx - x, my - y) / 320);
          ctx.beginPath();
          ctx.arc(x, y, 1 + inf * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ac},${(baseAlpha + inf * infAlpha).toFixed(3)})`;
          ctx.fill();
        }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      cancelAnimationFrame(raf);
    };
  }, []);

  const ACCENT = t.accent;
  const ADIM = t.ac_(0.55);
  const ABORDER = t.ac_(0.18);
  const ADIM2 = t.ac_(0.22);
  const ac = t.accentRaw;

  const ethMid = tickers[0]?.price ?? 0;
  const basisBps =
    pythEth && ethMid ? computeBasisBps(ethMid, pythEth.price) : null;
  const basisStr =
    basisBps !== null
      ? `${basisBps >= 0 ? "+" : ""}${basisBps.toFixed(1)} bps`
      : "—";
  const pythPriceStr = pythEth ? `$${fmtPrice(pythEth.price)}` : "—";

  return (
    <section
      id="home"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={gridRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Corner meta labels — hidden on small screens */}
      {[
        {
          pos: { top: "5.5rem", left: "2rem" },
          align: "left",
          lines: ["Portfolio — 2025", "Full-Stack / Blockchain"],
        },
        {
          pos: { top: "5.5rem", right: "2rem" },
          align: "right",
          lines: ["Pune, IN", "UTC+5:30"],
        },
      ].map(({ pos, align, lines }) => (
        <div
          key={align}
          className="hero-corner-label"
          style={{
            position: "absolute",
            ...pos,
            zIndex: 2,
            fontFamily: "Space Mono, monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            color: t.fg_(0.18),
            textTransform: "uppercase",
            lineHeight: 2,
            textAlign: align as "left" | "right",
            transition: "color 0.35s ease",
          }}
        >
          {lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      ))}

      {/* ── Two-column grid ──────────────────────────── */}
      <div
        className="hero-grid"
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 2rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3.5rem",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        {/* ── LEFT ──────────────────────────────────── */}
        <div>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: "2rem",
              opacity: active ? 1 : 0,
              transform: active ? "none" : "translateY(8px)",
              transition: "all 0.6s ease 0.2s",
            }}
          >
            Welcome
          </div>

          <h1
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "clamp(2.6rem, 7.5vw, 7.5rem)",
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: t.fg,
              marginBottom: "1.5rem",
              transition: "color 0.35s ease",
            }}
          >
            {active ? (
              <>
                <ScrambleText text="ANISH" active={active} speed={28} />
                <br />
                <ScrambleText text="KADAM" active={active} speed={28} />
              </>
            ) : (
              <>
                ANISH
                <br />
                KADAM
              </>
            )}
          </h1>

          <div
            style={{
              height: "1px",
              background: t.fg_(0.15),
              marginBottom: "2rem",
              transformOrigin: "left",
              maxWidth: "420px",
              transform: lineVis ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1)",
            }}
          />

          <p
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "clamp(0.7rem, 1.3vw, 0.9rem)",
              color: t.fg_(0.5),
              letterSpacing: "0.05em",
              maxWidth: "400px",
              lineHeight: 1.75,
              marginBottom: "3rem",
              opacity: subVis ? 1 : 0,
              transform: subVis ? "none" : "translateY(12px)",
              transition: "all 0.7s ease",
            }}
          >
            Full-Stack Developer &amp; Blockchain Engineer
            <br />
            Building immersive on-chain experiences
          </p>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              opacity: ctaVis ? 1 : 0,
              transform: ctaVis ? "none" : "translateY(12px)",
              transition: "all 0.7s ease",
            }}
          >
            <a href="#projects" className="btn-primary">
              View Work →
            </a>
            <a href="#contact" className="btn-outline">
              Get in Touch
            </a>
          </div>

          <div
            style={{
              display: "flex",
              gap: "2rem",
              marginTop: "3.5rem",
              opacity: ctaVis ? 1 : 0,
              transition: "opacity 0.7s ease 0.3s",
            }}
          >
            {[
              ["3+", "Years"],
              ["8+", "Projects"],
              ["20+", "Stack"],
            ].map(([n, l]) => (
              <div key={l}>
                <div
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: ACCENT,
                    lineHeight: 1,
                    transition: "color 0.35s ease",
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.58rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: t.fg_(0.22),
                    marginTop: "0.2rem",
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — DEX terminal ──────────────────── */}
        <div
          className="hero-terminal-wrapper"
          style={{
            opacity: threeVis ? 1 : 0,
            transform: threeVis ? "none" : "translateX(24px)",
            transition: "all 1s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div
            style={{
              position: "relative",
              boxShadow: `0 0 48px ${t.ac_(0.04)}, 0 0 1px ${t.ac_(0.12)} inset`,
              transition: "box-shadow 0.35s ease",
            }}
          >
            <div
              style={{
                border: `1px solid ${ABORDER}`,
                background: t.terminalBg,
                backdropFilter: "blur(6px)",
                position: "relative",
                overflow: "hidden",
                transition: "background 0.35s ease, border-color 0.35s ease",
              }}
            >
              {/* Corner brackets */}
              {[
                {
                  top: -1,
                  left: -1,
                  borderTop: `1px solid ${ACCENT}`,
                  borderLeft: `1px solid ${ACCENT}`,
                },
                {
                  top: -1,
                  right: -1,
                  borderTop: `1px solid ${ACCENT}`,
                  borderRight: `1px solid ${ACCENT}`,
                },
                {
                  bottom: -1,
                  left: -1,
                  borderBottom: `1px solid ${ACCENT}`,
                  borderLeft: `1px solid ${ACCENT}`,
                },
                {
                  bottom: -1,
                  right: -1,
                  borderBottom: `1px solid ${ACCENT}`,
                  borderRight: `1px solid ${ACCENT}`,
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 18,
                    height: 18,
                    zIndex: 5,
                    ...s,
                  }}
                />
              ))}

              {/* ── Header row 1 ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.58rem 1rem",
                  borderBottom: `1px solid ${ABORDER}`,
                  background: t.terminalHeaderBg,
                  transition: "background 0.35s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: fetchErr ? "#ff6464" : ACCENT,
                      display: "inline-block",
                      boxShadow: fetchErr
                        ? "0 0 6px #ff6464"
                        : `0 0 6px ${ACCENT}`,
                      animation: "blink 2s ease-in-out infinite",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.6rem",
                      letterSpacing: "0.15em",
                      color: ADIM,
                      textTransform: "uppercase",
                    }}
                  >
                    Exchange Core
                  </span>
                  {fetchErr && (
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.5rem",
                        color: "rgba(255,100,100,0.7)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      [reconnecting]
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "1.1rem",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.5rem",
                      letterSpacing: "0.08em",
                      color: t.fg_(0.2),
                    }}
                  >
                    upd {lastUpdated}
                  </span>
                  <span
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.52rem",
                      letterSpacing: "0.08em",
                      color: t.fg_(0.25),
                    }}
                  >
                    BLK #{blockNum.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ── Header row 2 — network stats ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.38rem 1rem",
                  borderBottom: `1px solid ${t.ac_(0.05)}`,
                  background: t.terminalStatsBg,
                  gap: "1rem",
                  transition: "background 0.35s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "1.4rem",
                    alignItems: "center",
                  }}
                >
                  {[
                    { label: "TPS", value: tps.toLocaleString(), accent: true },
                    { label: "GAS", value: `${gasPrice} gwei`, accent: false },
                    { label: "PING", value: `${latency}ms`, accent: false },
                    {
                      label: "STATUS",
                      value: fetchErr ? "ERR" : "LIVE",
                      accent: !fetchErr,
                    },
                  ].map(({ label, value, accent }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.12rem",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "0.44rem",
                          letterSpacing: "0.14em",
                          color: t.fg_(0.22),
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "0.58rem",
                          letterSpacing: "0.06em",
                          fontWeight: 700,
                          color: accent
                            ? ACCENT
                            : fetchErr && label === "STATUS"
                              ? "#ff8080"
                              : t.fg_(0.65),
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <NetworkHealth tps={tps} blockNum={blockNum} accentRaw={ac} />
              </div>

              {/* ── 3D scene — hidden on mobile ── */}
              <div
                className="hero-threejs-panel"
                style={{
                  height: "280px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <HeroThree
                  key={t.isDark ? "dark" : "light"}
                  isDark={t.isDark}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
                    zIndex: 2,
                  }}
                />
                {[
                  {
                    style: { top: "10%", left: "7%" },
                    label: "L1 MAINNET",
                    sub: "ETH · EVM",
                    dot: true,
                  },
                  {
                    style: { top: "55%", left: "5%" },
                    label: "L2 NETWORK",
                    sub: "ARB · OP",
                    dot: false,
                  },
                  {
                    style: { top: "14%", right: "5%" },
                    label: "DEFI LAYER",
                    sub: "AMM · CLOB",
                    dot: false,
                  },
                ].map(({ style, label, sub, dot }) => (
                  <div
                    key={label}
                    style={{
                      position: "absolute",
                      ...style,
                      fontFamily: "Space Mono, monospace",
                      pointerEvents: "none",
                      zIndex: 3,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      {dot && (
                        <span
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: ACCENT,
                            display: "inline-block",
                            animation: "blink 2.4s ease-in-out infinite",
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: "0.5rem",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: t.ac_(0.35),
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.42rem",
                        letterSpacing: "0.1em",
                        color: t.ac_(0.18),
                        marginTop: "0.15rem",
                        paddingLeft: dot ? "0.55rem" : "0",
                      }}
                    >
                      {sub}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    position: "absolute",
                    bottom: "0.7rem",
                    right: "0.75rem",
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.46rem",
                    letterSpacing: "0.09em",
                    color: t.ac_(0.22),
                    textAlign: "right",
                    lineHeight: 2.1,
                    zIndex: 3,
                  }}
                >
                  <div>
                    NODES <span style={{ color: ADIM2 }}>24</span>
                  </div>
                  <div>
                    DEPTH BARS <span style={{ color: ADIM2 }}>60</span>
                  </div>
                  <div>
                    VALIDATORS <span style={{ color: ADIM2 }}>512</span>
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "0.7rem",
                    left: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.28rem",
                    zIndex: 3,
                  }}
                >
                  {[
                    { name: "ETH", active: true },
                    { name: "ARB", active: false },
                    { name: "SOL", active: false },
                  ].map(({ name, active: a }) => (
                    <div
                      key={name}
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.44rem",
                        letterSpacing: "0.12em",
                        padding: "0.1rem 0.4rem",
                        border: `1px solid ${a ? t.ac_(0.4) : t.ac_(0.1)}`,
                        color: a ? ADIM : t.ac_(0.2),
                        background: a ? t.ac_(0.06) : "transparent",
                      }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Mempool strip ── */}
              <ActivityStrip accentRaw={ac} />
              <Sep accentRaw={ac} />

              {/* ── Ticker table ── */}
              <div
                style={{
                  background: t.terminalRowBg,
                  transition: "background 0.35s ease",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 88px 62px 54px",
                    padding: "0.38rem 1rem",
                    background: t.ac_(0.02),
                  }}
                >
                  {["Pair", "Price (USD)", "24h", "Vol"].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.48rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: t.fg_(0.2),
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <Sep accentRaw={ac} />

                {tickers.map((tk, i) => {
                  const isFlash = flashIdx === i;
                  const up = tk.change >= 0;
                  const priceUp =
                    tk.prevPrice !== undefined ? tk.price >= tk.prevPrice : up;

                  return (
                    <div key={tk.pair}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 88px 62px 54px",
                          alignItems: "center",
                          padding: "0.44rem 1rem",
                          background: isFlash ? t.ac_(0.045) : "transparent",
                          transition: "background 0.35s ease",
                          // borderLeft: isFlash
                          //   ? `2px solid ${ACCENT}`
                          //   : "2px solid transparent",
                        }}
                      >
                        {/* Pair + smooth 24h sparkline */}
                        <div>
                          <div
                            style={{
                              fontFamily: "Space Mono, monospace",
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              color: t.fg,
                              letterSpacing: "0.02em",
                              marginBottom: "3px",
                              transition: "color 0.35s ease",
                            }}
                          >
                            {tk.pair}
                          </div>
                          {sparks[i].length > 1 ? (
                            <SparkLine
                              pts={sparks[i]}
                              up={up}
                              accentRaw={ac}
                              id={`${tk.pair}-${i}`}
                            />
                          ) : (
                            /* Skeleton while klines load */
                            <div
                              style={{
                                width: 88,
                                height: 28,
                                background: `rgba(${ac},0.05)`,
                                borderRadius: 2,
                                animation: "blink 1.5s ease-in-out infinite",
                              }}
                            />
                          )}
                        </div>

                        {/* Price */}
                        <span
                          style={{
                            fontFamily: "Space Mono, monospace",
                            fontSize: "0.64rem",
                            color: isFlash
                              ? priceUp
                                ? ACCENT
                                : "#ff8080"
                              : t.fg_(0.75),
                            transition: "color 0.35s ease",
                            letterSpacing: "0.01em",
                            fontWeight: isFlash ? 700 : 400,
                          }}
                        >
                          {tk.price > 0 ? `$${fmtPrice(tk.price)}` : "…"}
                        </span>

                        {/* 24h change */}
                        <span
                          style={{
                            fontFamily: "Space Mono, monospace",
                            fontSize: "0.58rem",
                            color: up ? t.ac_(0.85) : "rgba(255,100,100,0.8)",
                            letterSpacing: "0.01em",
                          }}
                        >
                          {tk.price > 0
                            ? `${up ? "▲" : "▼"} ${Math.abs(tk.change).toFixed(2)}%`
                            : "—"}
                        </span>

                        {/* Volume */}
                        <span
                          style={{
                            fontFamily: "Space Mono, monospace",
                            fontSize: "0.54rem",
                            color: t.fg_(0.28),
                            letterSpacing: "0.04em",
                          }}
                        >
                          {tk.vol !== "—" ? `$${tk.vol}` : "—"}
                        </span>
                      </div>
                      {i < tickers.length - 1 && <Sep accentRaw={ac} />}
                    </div>
                  );
                })}
              </div>

              <SarcasmTicker accentRaw={ac} />

              {/* ── Footer ── */}
              <div
                className="hero-terminal-footer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.48rem 1rem",
                  background: t.ac_(0.018),
                  borderTop: `1px solid ${t.ac_(0.07)}`,
                  flexWrap: "wrap",
                  gap: "0.6rem",
                  transition: "background 0.35s ease",
                }}
              >
                {[
                  ["Source", "Binance WS"],
                  ["Feed", "Pyth Network"],
                  ["Status", fetchErr ? "ERROR" : "LIVE"],
                  ["Gas", `${gasPrice} gwei`],
                  ["Oracle ETH", pythPriceStr],
                  ["Basis", basisStr],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.44rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: t.fg_(0.2),
                        marginBottom: "0.1rem",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.58rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        color:
                          value === "LIVE"
                            ? ACCENT
                            : value === "ERROR"
                              ? "#ff8080"
                              : label === "Basis" && basisBps !== null
                                ? basisBps > 0
                                  ? t.ac_(0.9)
                                  : "rgba(255,120,120,0.9)"
                                : t.fg_(0.62),
                        transition: "color 0.35s ease",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "0.6rem",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.48rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: t.ac_(0.18),
              }}
            >
              Prices via Binance WS · Oracle via Pyth · Not financial advice
            </span>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "Space Mono, monospace",
          fontSize: "0.58rem",
          letterSpacing: "0.15em",
          color: t.ac_(0.3),
          textTransform: "uppercase",
          zIndex: 2,
          animation: "fadeIn 1s ease 2s both",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        Scroll
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{ animation: "blink 2s ease-in-out infinite" }}
        >
          <path
            d="M5 1 L5 9 M2 6 L5 9 L8 6"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <style>{`
        /* ── Mobile: stack layout ───────────────────────── */
        @media (max-width: 820px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            padding-top: 6rem !important;
            padding-bottom: 3rem !important;
            align-items: start !important;
            min-height: unset !important;
            gap: 2.5rem !important;
          }
          .hero-corner-label { display: none !important; }
          .hero-terminal-wrapper {
            transform: none !important;
            opacity: 1 !important;
          }
          /* Hide the heavy Three.js panel on mobile — keeps perf smooth */
          .hero-threejs-panel { display: none !important; }
          /* Compress footer into 2×3 grid */
          .hero-terminal-footer {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.5rem 0.6rem !important;
          }
        }

        /* ── Very small screens ─────────────────────────── */
        @media (max-width: 420px) {
          .hero-grid { padding: 5rem 1rem 2rem !important; }
          .hero-terminal-footer {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
};
