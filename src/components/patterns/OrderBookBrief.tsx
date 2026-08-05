/**
 * OrderBookBrief.tsx
 *
 * The terminal was introduced by one caption line, so nobody could tell it
 * apart from a screenshot or an embedded iframe. The first fix stated
 * everything at once and cost most of a viewport. The second collapsed it to a
 * toggle strip *below* the terminal, which had the same disease as the old
 * project drawer: on a short screen, opening it put the answer off-screen and
 * clicking appeared to do nothing.
 *
 * So it is a panel now, opening over the terminal from the control that
 * triggered it, using the same shell and the same motion as the project detail
 * view. That is the point: after seeing one panel open, a reader knows what
 * every other one in the section will do.
 *
 * Hiding the terminal to explain it is not a loss. Anyone who has asked "how
 * does this work" has stopped reading prices, and it dismisses on Escape, on
 * the close button, or on a click anywhere outside.
 *
 * ── Two corrections that live in this file ──
 * The brief for this work described the feed as OKX and said four pairs stream
 * simultaneously. Neither matches the source. `useOrderBook.ts` connects to
 * Binance's combined stream endpoint and subscribes to one pair at a time,
 * tearing the socket down and rebuilding it on switch. Four pairs are
 * selectable. A panel whose entire purpose is "here is what is really
 * happening" cannot be wrong about what is really happening.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface Fact {
  label: string;
  value: string;
}

/** Verified against useOrderBook.ts and usePythPrice.ts, not from memory. */
const LIVE: Fact[] = [
  {
    label: "Feed",
    value: "Binance combined WebSocket: depth20 at 100ms, aggTrade, 24h ticker",
  },
  {
    label: "Oracle",
    value: "Pyth Network over Hermes SSE, one update per Pythnet slot, roughly 400ms",
  },
  {
    label: "Basis",
    value: "Exchange mid against oracle price, in basis points, recomputed per tick",
  },
  { label: "Pairs", value: "ETH/USDC, BTC/USDT, ARB/USDC, SOL/USDC" },
];

const BUILT: Fact[] = [
  { label: "Depth chart", value: "Hand-drawn to a 2D canvas. No charting library" },
  {
    label: "Update path",
    value: "Bursts coalesced into one requestAnimationFrame, flushed at 120ms",
  },
  {
    label: "Pair switching",
    value: "Socket state scoped inside the effect, so a switch is a clean teardown",
  },
  { label: "Recovery", value: "Reconnects two seconds after an unexpected close" },
];

const STACK = [
  "React",
  "TypeScript",
  "WebSocket",
  "Server-Sent Events",
  "Canvas 2D",
  "Pyth Hermes",
] as const;

const Column = ({ title, facts }: { title: string; facts: Fact[] }) => (
  <div className="obb-col">
    <span className="mono-label obb-col-title">{title}</span>
    <dl className="obb-facts">
      {facts.map((f) => (
        <div className="obb-fact" key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export interface OrderBookBriefProps {
  closing: boolean;
  origin: { x: number; y: number };
  onClose: () => void;
}

export const OrderBookBrief = ({ closing, origin, onClose }: OrderBookBriefProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="pv obb glass"
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label="How the order book terminal works"
      data-closing={closing ? "true" : "false"}
      style={
        {
          "--pv-ox": `${origin.x}%`,
          "--pv-oy": `${origin.y}%`,
        } as React.CSSProperties
      }
    >
      <header className="pv-head">
        <span className="pv-index">LIVE</span>
        <div className="pv-heading">
          <h3 className="pv-title">How this terminal works</h3>
        </div>
        <div className="pv-nav">
          <button className="pv-btn pv-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
      </header>

      <div className="pv-body">
        <div className="obb-grid">
          <Column title="What is live" facts={LIVE} />
          <Column title="How it is built" facts={BUILT} />
        </div>
        <div className="obb-stack">
          <span className="mono-label">Stack</span>
          <div className="obb-chips">
            {STACK.map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
