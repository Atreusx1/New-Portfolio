/**
 * Dexorderbook.tsx
 *
 * Live DEX order book terminal.
 * Data sources:
 *   • OKX WebSocket  → order book depth, trades, 24h stats
 *   • Pyth Hermes    → on-chain oracle price + basis vs market
 */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useOrderBook, type OrderLevel, type Trade } from "./useOrderBook";
import { usePythPrice, computeBasisBps } from "./usePythPrice";

// ─── Pairs config ─────────────────────────────────────────────────────────────
const PAIRS = [
  { label: "ETH/USDC", base: "ETH", quote: "USDT" },
  { label: "BTC/USDT", base: "BTC", quote: "USDT" },
  { label: "ARB/USDC", base: "ARB", quote: "USDT" },
  { label: "SOL/USDC", base: "SOL", quote: "USDT" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, dp = 2) =>
  n >= 1000
    ? n.toLocaleString("en", { maximumFractionDigits: dp })
    : n.toFixed(n < 1 ? 4 : dp);

const fmtSz = (n: number) => (n >= 1 ? n.toFixed(3) : n.toFixed(6));

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  connecting: "rgba(255,200,80,0.9)",
  live: "",
  error: "rgba(255,60,60,0.9)",
  closed: "rgba(120,120,120,0.7)",
};
const STATUS_LABEL: Record<string, string> = {
  connecting: "CONNECTING",
  live: "LIVE · BINANCE",
  error: "ERROR",
  closed: "CLOSED",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const BookRow = ({
  level,
  maxTotal,
  side,
  accent,
  fg_,
}: {
  level: OrderLevel;
  maxTotal: number;
  side: "ask" | "bid";
  accent: string;
  fg_: (a: number) => string;
}) => {
  const pct = Math.min(100, (level.total / maxTotal) * 100);
  const color = side === "ask" ? "rgba(255,100,100,0.85)" : accent;
  const bgColor =
    side === "ask"
      ? "rgba(255,60,60,0.06)"
      : `${accent.replace("rgb", "rgba").replace(")", ",0.06)")}`;

  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        padding: "0.18rem 0.75rem",
        fontFamily: "Space Mono, monospace",
        fontSize: "0.58rem",
        letterSpacing: "0.03em",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: `${pct}%`,
          background: bgColor,
          transition: "width 0.15s ease",
          pointerEvents: "none",
        }}
      />
      <span style={{ color, position: "relative", zIndex: 1 }}>
        {fmt(level.price)}
      </span>
      <span
        style={{
          color: fg_(0.55),
          textAlign: "right",
          position: "relative",
          zIndex: 1,
        }}
      >
        {fmtSz(level.size)}
      </span>
      <span
        style={{
          color: fg_(0.3),
          textAlign: "right",
          position: "relative",
          zIndex: 1,
        }}
      >
        {fmtSz(level.total)}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const DepthChart = ({
  asks,
  bids,
  maxTotal,
  accent,
  fg_,
  isDark,
}: {
  asks: OrderLevel[];
  bids: OrderLevel[];
  maxTotal: number;
  accent: string;
  fg_: (a: number) => string;
  isDark: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, W, H);

    const mid = W / 2;

    const drawSide = (
      levels: OrderLevel[],
      fromX: number,
      dirRight: boolean,
      color: string,
      fillColor: string,
    ) => {
      if (levels.length === 0) return;
      const step = mid / levels.length;
      ctx.beginPath();
      ctx.moveTo(fromX, H);
      levels.forEach((l, i) => {
        const x = dirRight ? fromX + (i + 1) * step : fromX - (i + 1) * step;
        const y = H - (l.total / maxTotal) * H * 0.9;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(
        dirRight ? fromX + levels.length * step : fromX - levels.length * step,
        H,
      );
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fromX, H);
      levels.forEach((l, i) => {
        const x = dirRight ? fromX + (i + 1) * step : fromX - (i + 1) * step;
        const y = H - (l.total / maxTotal) * H * 0.9;
        ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    const accentRgb = accent.replace("rgb(", "").replace(")", "");
    // Bids are sorted high→low; reverse so the closest bid is nearest the midline
    drawSide(
      [...bids].reverse(),
      mid,
      false,
      `rgba(${accentRgb},0.8)`,
      `rgba(${accentRgb},0.08)`,
    );
    drawSide(asks, mid, true, "rgba(255,80,80,0.7)", "rgba(255,60,60,0.06)");

    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, H);
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }, [asks, bids, maxTotal, accent, isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
};

// ─── Pyth oracle badge ────────────────────────────────────────────────────────
/**
 * Shown in the price bar stats row.
 * Displays oracle price, ±confidence, and basis vs exchange mid.
 */
const OracleBadge = ({
  pythPrice,
  midPrice,
  fg_,
  accent,
}: {
  pythPrice: ReturnType<typeof usePythPrice>;
  midPrice: number;
  fg_: (a: number) => string;
  accent: string;
}) => {
  if (!pythPrice) {
    return (
      <div>
        <div
          style={{
            fontSize: "0.44rem",
            letterSpacing: "0.14em",
            color: fg_(0.22),
            marginBottom: "0.1rem",
          }}
        >
          PYTH ORACLE
        </div>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: fg_(0.2) }}>
          —
        </div>
      </div>
    );
  }

  const basisBps =
    midPrice > 0 ? computeBasisBps(midPrice, pythPrice.price) : 0;
  const basisPositive = basisBps >= 0;

  // Age indicator: turns amber if oracle is >5s stale
  const stale = pythPrice.ageMs > 5000;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.05rem" }}>
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          fontSize: "0.44rem",
          letterSpacing: "0.14em",
          color: fg_(0.22),
        }}
      >
        PYTH ORACLE
        {/* Staleness dot */}
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: stale ? "rgba(255,180,50,0.8)" : "rgba(80,220,120,0.8)",
            display: "inline-block",
          }}
        />
      </div>

      {/* Price */}
      <div
        style={{
          fontSize: "0.6rem",
          fontWeight: 700,
          color: fg_(0.65),
          letterSpacing: "-0.01em",
        }}
      >
        ${fmt(pythPrice.price)}
        <span
          style={{
            fontSize: "0.44rem",
            fontWeight: 400,
            color: fg_(0.25),
            marginLeft: "0.25rem",
          }}
        >
          ±{fmt(pythPrice.conf, 3)}
        </span>
      </div>

      {/* Basis */}
      {midPrice > 0 && (
        <div
          style={{
            fontSize: "0.46rem",
            letterSpacing: "0.06em",
            color: basisPositive
              ? `${accent.replace("rgb", "rgba").replace(")", ",0.8)")}`
              : "rgba(255,100,100,0.8)",
          }}
        >
          {basisPositive ? "+" : ""}
          {basisBps.toFixed(1)} bps
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DEXOrderBook = () => {
  const t = useTheme();
  const [pairIdx, setPairIdx] = useState(0);
  const [tab, setTab] = useState<"book" | "depth" | "trades">("book");

  const pair = PAIRS[pairIdx];

  // ── Live data hooks ────────────────────────────────────────────────────────
  const {
    asks,
    bids,
    midPrice,
    prevPrice,
    trades,
    ticker,
    status,
    spread,
    spreadPct,
    maxTotal,
  } = useOrderBook(pair.label);

  // Pyth oracle — independent SSE stream
  const pythPrice = usePythPrice(pair.label);

  // loading = true only on the very first connection (no data yet at all)
  const loading = status === "connecting" && midPrice === 0;
  // stale = switching pairs but we have old data to show while reconnecting
  const stale = status === "connecting" && midPrice > 0;
  const priceUp = midPrice >= prevPrice;
  const ACCENT = t.accent;

  return (
    <div
      style={{
        border: `1px solid ${t.ac_(0.2)}`,
        background: t.terminalBg,
        backdropFilter: "blur(6px)",
        fontFamily: "Space Mono, monospace",
        position: "relative",
        overflow: "hidden",
        boxShadow: `0 0 40px ${t.ac_(0.04)}`,
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

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.55rem 0.9rem",
          borderBottom: `1px solid ${t.ac_(0.12)}`,
          background: t.terminalHeaderBg,
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Pair tabs */}
        <div style={{ display: "flex", gap: "0px" }}>
          {PAIRS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPairIdx(i)}
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.55rem",
                letterSpacing: "0.1em",
                padding: "0.25rem 0.6rem",
                background: pairIdx === i ? t.ac_(0.12) : "transparent",
                color: pairIdx === i ? ACCENT : t.fg_(0.3),
                border: `1px solid ${pairIdx === i ? t.ac_(0.25) : "transparent"}`,
                borderRight:
                  i < PAIRS.length - 1
                    ? `1px solid ${t.fg_(0.06)}`
                    : `1px solid ${pairIdx === i ? t.ac_(0.25) : "transparent"}`,
                transition: "all 0.2s ease",
                cursor: "crosshair",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Connection status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.5rem",
            letterSpacing: "0.12em",
            color: status === "live" ? t.ac_(0.4) : STATUS_COLOR[status],
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: status === "live" ? ACCENT : STATUS_COLOR[status],
              animation:
                status === "live" || status === "connecting"
                  ? "blink 2s ease-in-out infinite"
                  : "none",
            }}
          />
          {STATUS_LABEL[status]}
        </div>
      </div>

      {/* ── Price bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "0.6rem 0.9rem",
          borderBottom: `1px solid ${t.fg_(0.06)}`,
          flexWrap: "wrap",
          gap: "0.75rem",
          background: t.terminalStatsBg,
        }}
      >
        {/* Left: big price + 24h change */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
          <span
            style={{
              fontSize: loading ? "0.8rem" : "1.2rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: loading
                ? t.fg_(0.2)
                : priceUp
                  ? ACCENT
                  : "rgba(255,100,100,0.9)",
              transition: "color 0.3s ease",
            }}
          >
            {loading ? "Connecting…" : `$${fmt(midPrice)}`}
          </span>
          {!loading && (
            <span
              style={{
                fontSize: "0.65rem",
                color:
                  ticker.change >= 0 ? t.ac_(0.8) : "rgba(255,100,100,0.8)",
              }}
            >
              {ticker.change >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(ticker.change).toFixed(2)}%
            </span>
          )}
        </div>

        {/* Right: stats grid — 24h vol/high/low/spread + Pyth oracle */}
        {!loading && (
          <div
            style={{
              display: "flex",
              gap: "1.2rem",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            {/* Standard stats */}
            {[
              ["24H VOL", ticker.volume],
              ["24H HIGH", `$${fmt(ticker.high)}`],
              ["24H LOW", `$${fmt(ticker.low)}`],
              ["SPREAD", `${spreadPct.toFixed(3)}%`],
            ].map(([label, val]) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: "0.44rem",
                    letterSpacing: "0.14em",
                    color: t.fg_(0.22),
                    marginBottom: "0.1rem",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: t.fg_(0.65),
                  }}
                >
                  {val}
                </div>
              </div>
            ))}

            {/* Pyth oracle — rendered as its own compound badge */}
            <OracleBadge
              pythPrice={pythPrice}
              midPrice={midPrice}
              fg_={t.fg_}
              accent={ACCENT}
            />
          </div>
        )}
      </div>

      {/* ── Tab selector ── */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${t.fg_(0.07)}`,
        }}
      >
        {(["book", "depth", "trades"] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.54rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "0.45rem 1rem",
              background: "transparent",
              color: tab === t2 ? ACCENT : t.fg_(0.3),
              border: "none",
              borderBottom:
                tab === t2 ? `1px solid ${ACCENT}` : "1px solid transparent",
              marginBottom: "-1px",
              transition: "all 0.2s ease",
              cursor: "crosshair",
            }}
          >
            {t2 === "book"
              ? "Order Book"
              : t2 === "depth"
                ? "Depth Chart"
                : "Trades"}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ minHeight: "340px", position: "relative" }}>
        {/* Stale overlay — shown while reconnecting with old data still visible */}
        {stale && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: t.isDark
                ? "rgba(8,8,8,0.45)"
                : "rgba(202,247,238,0.45)",
              backdropFilter: "blur(1px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "0.52rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: t.ac_(0.55),
                animation: "blink 1.4s ease-in-out infinite",
              }}
            >
              Switching pair…
            </span>
          </div>
        )}
        {/* ── Order Book tab ── */}
        {tab === "book" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "0.28rem 0.75rem",
                borderBottom: `1px solid ${t.fg_(0.05)}`,
              }}
            >
              {["Price (USDT)", "Size", "Total"].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: "0.46rem",
                    letterSpacing: "0.12em",
                    color: t.fg_(0.2),
                    textAlign: h === "Price (USDT)" ? "left" : "right",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Asks — reversed so highest is at top */}
            <div>
              {[...asks].reverse().map((level, i) => (
                <BookRow
                  key={i}
                  level={level}
                  maxTotal={maxTotal}
                  side="ask"
                  accent={ACCENT}
                  fg_={t.fg_}
                />
              ))}
            </div>

            {/* Mid price row — shows Pyth oracle line if available */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.38rem 0.75rem",
                background: priceUp ? t.ac_(0.08) : "rgba(255,60,60,0.06)",
                borderTop: `1px solid ${priceUp ? t.ac_(0.15) : "rgba(255,60,60,0.15)"}`,
                borderBottom: `1px solid ${priceUp ? t.ac_(0.15) : "rgba(255,60,60,0.15)"}`,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: priceUp ? ACCENT : "rgba(255,100,100,0.9)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {loading ? "—" : `$${fmt(midPrice)}`}
                </span>
                <span
                  style={{
                    fontSize: "0.5rem",
                    color: priceUp ? t.ac_(0.5) : "rgba(255,100,100,0.5)",
                  }}
                >
                  {priceUp ? "▲" : "▼"}
                </span>
              </div>

              {/* Pyth inline tag in mid-price row */}
              {pythPrice && midPrice > 0 && (
                <span
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.46rem",
                    letterSpacing: "0.08em",
                    color: t.fg_(0.3),
                  }}
                >
                  ORACLE{" "}
                  <span style={{ color: t.fg_(0.55) }}>
                    ${fmt(pythPrice.price)}
                  </span>
                </span>
              )}
            </div>

            {/* Bids */}
            <div>
              {bids.map((level, i) => (
                <BookRow
                  key={i}
                  level={level}
                  maxTotal={maxTotal}
                  side="bid"
                  accent={ACCENT}
                  fg_={t.fg_}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Depth Chart tab ── */}
        {tab === "depth" && (
          <div style={{ padding: "0.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.5rem",
                  letterSpacing: "0.1em",
                  color: t.ac_(0.5),
                }}
              >
                BID SIDE
              </span>
              <span
                style={{
                  fontSize: "0.5rem",
                  letterSpacing: "0.1em",
                  color: "rgba(255,100,100,0.6)",
                }}
              >
                ASK SIDE
              </span>
            </div>
            <div style={{ height: "260px" }}>
              <DepthChart
                asks={asks}
                bids={bids}
                maxTotal={maxTotal}
                accent={ACCENT}
                fg_={t.fg_}
                isDark={t.isDark}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "0.5rem",
                fontSize: "0.46rem",
                letterSpacing: "0.08em",
                color: t.fg_(0.2),
              }}
            >
              <span>${fmt(bids[bids.length - 1]?.price ?? 0)}</span>
              <span style={{ color: t.fg_(0.35) }}>
                Mid: ${fmt(midPrice)}
                {pythPrice ? ` · Oracle: $${fmt(pythPrice.price)}` : ""}
              </span>
              <span>${fmt(asks[asks.length - 1]?.price ?? 0)}</span>
            </div>
          </div>
        )}

        {/* ── Trades tab ── */}
        {tab === "trades" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "0.28rem 0.75rem",
                borderBottom: `1px solid ${t.fg_(0.05)}`,
              }}
            >
              {["Price", "Size", "Time"].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: "0.46rem",
                    letterSpacing: "0.12em",
                    color: t.fg_(0.2),
                    textAlign: h === "Price" ? "left" : "right",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {trades.length === 0 ? (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    fontSize: "0.58rem",
                    color: t.fg_(0.2),
                    letterSpacing: "0.08em",
                  }}
                >
                  {status === "connecting"
                    ? "Connecting to stream…"
                    : "Awaiting trades…"}
                </div>
              ) : (
                trades.map((tr, i) => (
                  <div
                    key={tr.ts + "-" + i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      padding: "0.22rem 0.75rem",
                      borderBottom: `1px solid ${t.fg_(0.04)}`,
                      animation: i === 0 ? "fadeIn 0.25s ease" : undefined,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.58rem",
                        color:
                          tr.side === "buy" ? ACCENT : "rgba(255,100,100,0.85)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      ${fmt(tr.price)}
                    </span>
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.58rem",
                        color: t.fg_(0.5),
                        textAlign: "right",
                      }}
                    >
                      {fmtSz(tr.size)}
                    </span>
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "0.52rem",
                        color: t.fg_(0.25),
                        textAlign: "right",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {fmtTime(tr.ts)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.4rem 0.9rem",
          borderTop: `1px solid ${t.fg_(0.06)}`,
          background: t.ac_(0.015),
          flexWrap: "wrap",
          gap: "0.4rem",
        }}
      >
        <span
          style={{
            fontSize: "0.46rem",
            letterSpacing: "0.1em",
            color: t.fg_(0.2),
          }}
        >
          Binance WebSocket · Pyth Oracle · Not financial advice
        </span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <a
            href="https://app.uniswap.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.46rem",
              letterSpacing: "0.1em",
              color: t.ac_(0.45),
              textDecoration: "none",
            }}
          >
            Trade on Uniswap ↗
          </a>
          <a
            href="https://dydx.exchange"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.46rem",
              letterSpacing: "0.1em",
              color: t.ac_(0.45),
              textDecoration: "none",
            }}
          >
            dYdX ↗
          </a>
        </div>
      </div>
    </div>
  );
};
