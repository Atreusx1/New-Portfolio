import { useEffect, useState, useRef, useCallback } from "react";
import { ScrambleText } from "./ScrambleText";
import { HeroThree } from "./HeroThree";

const ACCENT = "rgb(151,252,228)";
const ADIM = "rgba(151,252,228,0.55)";
const ABORDER = "rgba(151,252,228,0.18)";

// ─── CoinGecko coin IDs → display pairs ────────────────────
const COIN_MAP = [
  { id: "ethereum", pair: "ETH/USDC" },
  { id: "bitcoin", pair: "BTC/USDT" },
  { id: "solana", pair: "SOL/USDC" },
  { id: "arbitrum", pair: "ARB/USDC" },
];

// ─── Sarcastic wisdom from the blockchain oracle ────────────
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
  "just hodl",
  "price is just noise",
  "long term play",
  "generational wealth",
];

interface Ticker {
  pair: string;
  price: number;
  change: number;
  vol: string;
  prevPrice?: number;
}

const makeSpark = (pts: number[], w = 64, h = 18) => {
  const mn = Math.min(...pts),
    mx = Math.max(...pts);
  const range = mx - mn || 1;
  return pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${((i / (pts.length - 1)) * w).toFixed(1)},${(h - ((p - mn) / range) * h).toFixed(1)}`,
    )
    .join(" ");
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

const Sep = () => (
  <div style={{ height: "1px", background: "rgba(151,252,228,0.07)" }} />
);

// ─── Sarcasm ticker that fades + types ──────────────────────
const SarcasmTicker = () => {
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
        color: "rgba(151,252,228,0.45)",
        fontStyle: "italic",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.45s ease",
        minHeight: "1.2em",
        padding: "0.55rem 1rem",
        borderTop: "1px solid rgba(151,252,228,0.07)",
        background: "rgba(151,252,228,0.015)",
      }}
    >
      {SARCASM[idx]}
    </div>
  );
};

export const Hero = () => {
  const [active, setActive] = useState(false);
  const [lineVis, setLineVis] = useState(false);
  const [subVis, setSubVis] = useState(false);
  const [ctaVis, setCtaVis] = useState(false);
  const [threeVis, setThreeVis] = useState(false);

  const [tickers, setTickers] = useState<Ticker[]>(
    COIN_MAP.map((c) => ({ pair: c.pair, price: 0, change: 0, vol: "—" })),
  );
  const [sparks, setSparks] = useState<number[][]>(
    COIN_MAP.map(() =>
      Array.from({ length: 16 }, () => 50 + Math.random() * 50),
    ),
  );
  const [flashIdx, setFlashIdx] = useState(-1);
  const [upIdx, setUpIdx] = useState<boolean[]>(COIN_MAP.map(() => true));
  const [blockNum, setBlockNum] = useState(19_482_341);
  const [tps, setTps] = useState(4218);
  const [fetchErr, setFetchErr] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("—");

  const gridRef = useRef<HTMLCanvasElement>(null);

  // ── Reveals ───────────────────────────────────────────────
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

  // ── CoinGecko live fetch ──────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const ids = COIN_MAP.map((c) => c.id).join(",");
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("non-200");
      const data = await res.json();

      setTickers((prev) =>
        COIN_MAP.map((c, i) => {
          const raw = data[c.id];
          if (!raw) return prev[i];
          const newPrice = raw.usd as number;
          return {
            pair: c.pair,
            price: newPrice,
            change: +(raw.usd_24h_change as number).toFixed(2),
            vol: fmtVol(raw.usd_24h_vol as number),
            prevPrice: prev[i].price || newPrice,
          };
        }),
      );

      setUpIdx((prev) =>
        COIN_MAP.map((c, i) => {
          const raw = data[c.id];
          return raw ? (raw.usd_24h_change as number) >= 0 : prev[i];
        }),
      );

      setSparks((prev) =>
        COIN_MAP.map((c, i) => {
          const raw = data[c.id];
          if (!raw) return prev[i];
          return [...prev[i].slice(1), raw.usd as number];
        }),
      );

      setFetchErr(false);
      const now = new Date();
      setLastUpdated(
        `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
      );

      // Flash a random row
      const fi = Math.floor(Math.random() * COIN_MAP.length);
      setFlashIdx(fi);
      setTimeout(() => setFlashIdx(-1), 500);
    } catch {
      setFetchErr(true);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    // CoinGecko free tier: ~30 req/min — poll every 30s to be safe
    const id = setInterval(fetchPrices, 30_000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  // ── Block counter + TPS (cosmetic, not live) ──────────────
  useEffect(() => {
    const id = setInterval(() => {
      setBlockNum((n) => n + Math.floor(Math.random() * 3));
      setTps((n) =>
        Math.max(
          3800,
          Math.min(4800, n + Math.floor((Math.random() - 0.5) * 120)),
        ),
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // ── Background grid canvas ────────────────────────────────
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
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const x = c * S,
            y = r * S;
          const inf = Math.max(0, 1 - Math.hypot(mx - x, my - y) / 320);
          ctx.beginPath();
          ctx.arc(x, y, 1 + inf * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(151,252,228,${0.022 + inf * 0.13})`;
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

      {/* Corner meta */}
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
          style={{
            position: "absolute",
            ...pos,
            zIndex: 2,
            fontFamily: "Space Mono, monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            color: "rgba(226,226,226,0.18)",
            textTransform: "uppercase",
            lineHeight: 2,
            textAlign: align as "left" | "right",
          }}
        >
          {lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      ))}

      {/* ── Two-column ─────────────────────────────────────────── */}
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
        {/* ── LEFT ─────────────────────────────────────────────── */}
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
              fontSize: "clamp(3rem, 7.5vw, 7.5rem)",
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: "#e2e2e2",
              marginBottom: "1.5rem",
            }}
          >
            {active ? (
              <>
                <ScrambleText text="ANISH" active={active} speed={28} />
                <br />
                <ScrambleText text="KUMAR" active={active} speed={28} />
              </>
            ) : (
              <>
                ANISH
                <br />
                KUMAR
              </>
            )}
          </h1>

          <div
            style={{
              height: "1px",
              background: "rgba(226,226,226,0.15)",
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
              color: "rgba(226,226,226,0.5)",
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
                    color: "rgba(226,226,226,0.22)",
                    marginTop: "0.2rem",
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — DEX terminal ─────────────────────────────── */}
        <div
          style={{
            opacity: threeVis ? 1 : 0,
            transform: threeVis ? "none" : "translateX(24px)",
            transition: "all 1s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div
            style={{
              border: `1px solid ${ABORDER}`,
              background: "rgba(8,8,8,0.6)",
              backdropFilter: "blur(4px)",
              position: "relative",
              overflow: "hidden",
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
                  width: 14,
                  height: 14,
                  zIndex: 5,
                  ...s,
                }}
              />
            ))}

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 1rem",
                borderBottom: `1px solid ${ABORDER}`,
                background: "rgba(151,252,228,0.03)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: fetchErr ? "#ff6464" : ACCENT,
                    display: "inline-block",
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
                      fontSize: "0.52rem",
                      color: "rgba(255,100,100,0.7)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    [fallback]
                  </span>
                )}
              </div>
              <div
                style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}
              >
                <span
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.52rem",
                    letterSpacing: "0.08em",
                    color: "rgba(226,226,226,0.2)",
                  }}
                >
                  upd {lastUpdated}
                </span>
                <span
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.55rem",
                    letterSpacing: "0.1em",
                    color: "rgba(226,226,226,0.25)",
                  }}
                >
                  BLK #{blockNum.toLocaleString()}
                </span>
                <span
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.55rem",
                    letterSpacing: "0.1em",
                    color: ADIM,
                  }}
                >
                  TPS {tps.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 3D scene */}
            <div style={{ height: "420px", position: "relative" }}>
              <HeroThree />
              {[
                { label: "L1 Mainnet", style: { top: "12%", left: "8%" } },
                { label: "L2 Network", style: { top: "58%", left: "5%" } },
                { label: "DeFi Layer", style: { top: "18%", right: "6%" } },
              ].map(({ label, style }) => (
                <div
                  key={label}
                  style={{
                    position: "absolute",
                    ...style,
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.52rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(151,252,228,0.28)",
                    pointerEvents: "none",
                  }}
                >
                  {label}
                </div>
              ))}
              <div
                style={{
                  position: "absolute",
                  bottom: "0.7rem",
                  right: "0.75rem",
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.5rem",
                  letterSpacing: "0.08em",
                  color: "rgba(151,252,228,0.25)",
                  textAlign: "right",
                  lineHeight: 1.9,
                }}
              >
                <div>NODES 24</div>
                <div>DEPTH BARS 60</div>
              </div>
            </div>

            <Sep />

            {/* Ticker table */}
            <div style={{ background: "rgba(8,8,8,0.82)" }}>
              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 64px 60px",
                  padding: "0.4rem 1rem",
                  background: "rgba(151,252,228,0.02)",
                }}
              >
                {["Pair", "Price (USD)", "24h", "Vol"].map((h) => (
                  <span
                    key={h}
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.5rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(226,226,226,0.2)",
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
              <Sep />

              {tickers.map((t, i) => {
                const isFlash = flashIdx === i;
                const up = t.change >= 0;
                const priceUp =
                  t.prevPrice !== undefined ? t.price >= t.prevPrice : up;

                return (
                  <div key={t.pair}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px 64px 60px",
                        alignItems: "center",
                        padding: "0.5rem 1rem",
                        background: isFlash
                          ? "rgba(151,252,228,0.04)"
                          : "transparent",
                        transition: "background 0.35s ease",
                      }}
                    >
                      {/* Pair + sparkline */}
                      <div>
                        <div
                          style={{
                            fontFamily: "Space Mono, monospace",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "#e2e2e2",
                            letterSpacing: "0.02em",
                            marginBottom: "2px",
                          }}
                        >
                          {t.pair}
                        </div>
                        <svg width="64" height="16">
                          {sparks[i].length > 1 && (
                            <path
                              d={makeSpark(sparks[i], 64, 16)}
                              fill="none"
                              stroke={
                                up
                                  ? "rgba(151,252,228,0.7)"
                                  : "rgba(255,100,100,0.65)"
                              }
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                          )}
                        </svg>
                      </div>

                      {/* Price — flashes accent when updated */}
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "0.66rem",
                          color: isFlash
                            ? priceUp
                              ? ACCENT
                              : "#ff8080"
                            : "rgba(226,226,226,0.75)",
                          transition: "color 0.35s ease",
                          letterSpacing: "0.01em",
                          fontWeight: isFlash ? 700 : 400,
                        }}
                      >
                        {t.price > 0 ? `$${fmtPrice(t.price)}` : "…"}
                      </span>

                      {/* 24h change */}
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "0.6rem",
                          color: up
                            ? "rgba(151,252,228,0.85)"
                            : "rgba(255,100,100,0.8)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {t.price > 0
                          ? `${up ? "▲" : "▼"} ${Math.abs(t.change).toFixed(2)}%`
                          : "—"}
                      </span>

                      {/* Volume */}
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "0.56rem",
                          color: "rgba(226,226,226,0.28)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t.vol !== "—" ? `$${t.vol}` : "—"}
                      </span>
                    </div>
                    {i < tickers.length - 1 && <Sep />}
                  </div>
                );
              })}
            </div>

            {/* Sarcasm strip */}
            <SarcasmTicker />

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem 1rem",
                background: "rgba(151,252,228,0.02)",
                borderTop: "1px solid rgba(151,252,228,0.07)",
              }}
            >
              {[
                ["Source", "CoinGecko"],
                ["Interval", "30s"],
                ["Status", fetchErr ? "ERROR" : "LIVE"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.48rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(226,226,226,0.2)",
                      marginBottom: "0.12rem",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color:
                        value === "LIVE"
                          ? ACCENT
                          : value === "ERROR"
                            ? "#ff8080"
                            : "rgba(226,226,226,0.65)",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
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
                fontSize: "0.5rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(151,252,228,0.2)",
              }}
            >
              Data via CoinGecko · Not financial advice (obviously)
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
          color: "rgba(151,252,228,0.3)",
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
        @media (max-width: 820px) {
          .hero-grid { grid-template-columns: 1fr !important; padding-top: 7rem !important; align-items: start !important; }
        }
      `}</style>
    </section>
  );
};
