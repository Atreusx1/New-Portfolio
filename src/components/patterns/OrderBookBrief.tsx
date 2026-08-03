/**
 * OrderBookBrief.tsx
 *
 * The order book terminal was introduced by one caption line, so nobody could
 * tell it apart from a screenshot or an embedded iframe. The first fix stated
 * everything at once and cost most of a viewport, which is a worse problem than
 * the one it solved: the terminal is the thing worth looking at, and the
 * explanation was pushing it up the page.
 *
 * So it collapses. Closed, it is one hairline row and a button, roughly the
 * height of the caption it replaced. Open, it is the full set of labelled
 * facts. The default is closed, because the terminal explains itself to anyone
 * who already knows what they are looking at and this is for everyone else.
 *
 * A <details> element would have been fewer lines and cannot animate its own
 * height, so this is a button and a drawer, with the drawer using the
 * `grid-template-rows: 0fr -> 1fr` technique that animates to content height
 * without measuring anything in JavaScript.
 *
 * ── Two corrections that live in this file ──
 * The brief for this work described the feed as OKX and said four pairs stream
 * simultaneously. Neither matches the source. `useOrderBook.ts` connects to
 * Binance's combined stream endpoint, and subscribes to one pair at a time,
 * tearing the socket down and rebuilding it on switch. Four pairs are
 * selectable. A panel whose entire purpose is "here is what is really
 * happening" cannot be wrong about what is really happening.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";

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

export const OrderBookBrief = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="obb" data-open={open ? "true" : "false"}>
      <button
        className="obb-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="obb-detail"
      >
        <span className="obb-toggle-label">
          Two live sources, one terminal. Binance depth and the Pyth oracle price
        </span>
        <span className="obb-toggle-cta">
          {open ? "Hide" : "How it works"}
          <ChevronDown size={13} className="obb-chevron" aria-hidden="true" />
        </span>
      </button>

      <div className="obb-drawer" id="obb-detail" data-open={open ? "true" : "false"}>
        <div className="obb-drawer-inner">
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
    </div>
  );
};
