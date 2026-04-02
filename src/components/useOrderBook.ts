/**
 * useOrderBook.ts
 *
 * Live order book via Binance public WebSocket combined stream.
 *
 * Key design: ALL mutable state (refs, RAF id, WebSocket, pending buffers)
 * lives INSIDE the useEffect. Each pair switch gets a completely fresh,
 * isolated instance. Cleanup tears it all down atomically — no shared refs
 * that can bleed between effect runs when the user switches pairs rapidly.
 */

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

export interface Trade {
  price: number;
  size: number;
  side: "buy" | "sell";
  ts: number;
}

export interface Ticker24h {
  change: number;
  volume: string;
  high: number;
  low: number;
}

export interface OrderBookState {
  asks: OrderLevel[];
  bids: OrderLevel[];
  midPrice: number;
  prevPrice: number;
  trades: Trade[];
  ticker: Ticker24h;
  status: "connecting" | "live" | "error" | "closed";
  spread: number;
  spreadPct: number;
  maxTotal: number;
}

// ─── Binance pair map ─────────────────────────────────────────────────────────

export const PAIR_TO_BINANCE: Record<string, string> = {
  "ETH/USDC": "ethusdt",
  "BTC/USDT": "btcusdt",
  "ARB/USDC": "arbusdt",
  "SOL/USDC": "solusdt",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BINANCE_WS_BASE = "wss://stream.binance.com:9443/stream";
const THROTTLE_MS = 120;
const BOOK_DEPTH = 20;
const MAX_TRADES = 30;
const RECONNECT_DELAY_MS = 2_000;

const emptyTicker: Ticker24h = { change: 0, volume: "—", high: 0, low: 0 };

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const fmtVolume = (v: number): string =>
  v >= 1e9
    ? `$${(v / 1e9).toFixed(2)}B`
    : v >= 1e6
      ? `$${(v / 1e6).toFixed(0)}M`
      : `$${v.toFixed(0)}`;

const buildLevels = (raw: [string, string][]): OrderLevel[] => {
  let total = 0;
  return raw.slice(0, BOOK_DEPTH).map(([px, qty]) => {
    const size = parseFloat(qty);
    total += size;
    return { price: parseFloat(px), size, total };
  });
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useOrderBook = (pairLabel: string): OrderBookState => {
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [midPrice, setMidPrice] = useState(0);
  const [prevPrice, setPrevPrice] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ticker, setTicker] = useState<Ticker24h>(emptyTicker);
  const [status, setStatus] = useState<OrderBookState["status"]>("connecting");

  // Stable setter refs — React guarantees setState functions never change,
  // so we can safely close over these inside the effect without listing them
  // as dependencies (which would defeat the isolation goal).
  const setAsksRef = useRef(setAsks);
  const setBidsRef = useRef(setBids);
  const setMidPriceRef = useRef(setMidPrice);
  const setPrevPriceRef = useRef(setPrevPrice);
  const setTradesRef = useRef(setTrades);
  const setTickerRef = useRef(setTicker);
  const setStatusRef = useRef(setStatus);

  useEffect(() => {
    const symbol = PAIR_TO_BINANCE[pairLabel];
    if (!symbol) return;

    // ── All mutable state is LOCAL to this effect instance ──────────────────
    // Rapid pair switches create a new instance; cleanup destroys the old one
    // before the new one's callbacks can fire. No shared refs = no conflicts.

    let ws: WebSocket | null = null;
    let rafId = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    let pendingAsks: [string, string][] | null = null;
    let pendingBids: [string, string][] | null = null;
    const pendingTrades: Trade[] = [];
    let lastFlush = 0;
    let prevMid = 0;

    // Mark connecting but keep previous pair data visible in the UI
    setStatusRef.current("connecting");

    // ── Throttled flush ────────────────────────────────────────────────────
    const scheduleFlush = () => {
      if (rafId || dead) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (dead) return;

        const now = performance.now();
        if (now - lastFlush < THROTTLE_MS) {
          scheduleFlush();
          return;
        }
        lastFlush = now;

        if (pendingAsks !== null && pendingBids !== null) {
          const a = buildLevels(pendingAsks);
          const b = buildLevels(pendingBids);
          pendingAsks = null;
          pendingBids = null;

          setAsksRef.current(a);
          setBidsRef.current(b);

          const bestAsk = a[0]?.price ?? 0;
          const bestBid = b[0]?.price ?? 0;
          if (bestAsk > 0 && bestBid > 0) {
            const mid = (bestAsk + bestBid) / 2;
            setPrevPriceRef.current(prevMid || mid);
            prevMid = mid;
            setMidPriceRef.current(mid);
          }
        }

        if (pendingTrades.length > 0) {
          const incoming = pendingTrades.splice(0);
          setTradesRef.current((prev) =>
            [...incoming, ...prev].slice(0, MAX_TRADES),
          );
        }
      });
    };

    // ── Connect ───────────────────────────────────────────────────────────
    const connect = () => {
      if (dead) return;

      const streams = [
        `${symbol}@depth20@100ms`,
        `${symbol}@aggTrade`,
        `${symbol}@ticker`,
      ].join("/");

      ws = new WebSocket(`${BINANCE_WS_BASE}?streams=${streams}`);

      ws.onopen = () => {
        if (dead) {
          ws?.close();
          return;
        }
        setStatusRef.current("live");
      };

      ws.onerror = () => {
        if (dead) return;
        setStatusRef.current("error");
      };

      ws.onclose = () => {
        if (dead) return;
        setStatusRef.current("connecting");
        reconnectTimer = setTimeout(() => {
          if (!dead) connect();
        }, RECONNECT_DELAY_MS);
      };

      ws.onmessage = (evt: MessageEvent) => {
        if (dead) return;

        let envelope: { stream: string; data: unknown };
        try {
          envelope = JSON.parse(evt.data as string) as {
            stream: string;
            data: unknown;
          };
        } catch {
          return;
        }

        const { stream, data } = envelope;

        if (stream.endsWith("@depth20@100ms")) {
          const d = data as {
            bids: [string, string][];
            asks: [string, string][];
          };
          pendingAsks = d.asks;
          pendingBids = d.bids;
          scheduleFlush();
          return;
        }

        if (stream.endsWith("@aggTrade")) {
          const d = data as { p: string; q: string; m: boolean; T: number };
          pendingTrades.unshift({
            price: parseFloat(d.p),
            size: parseFloat(d.q),
            side: d.m ? "sell" : "buy",
            ts: d.T,
          });
          scheduleFlush();
          return;
        }

        if (stream.endsWith("@ticker")) {
          const d = data as { P: string; q: string; h: string; l: string };
          setTickerRef.current({
            change: parseFloat(parseFloat(d.P).toFixed(2)),
            volume: fmtVolume(parseFloat(d.q)),
            high: parseFloat(d.h),
            low: parseFloat(d.l),
          });
        }
      };
    };

    connect();

    // ── Cleanup — runs synchronously before the next effect instance ────────
    return () => {
      dead = true;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Null out all handlers BEFORE close() so onclose can't trigger a reconnect
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
        ws = null;
      }
    };
  }, [pairLabel]);

  // ── Derived values ────────────────────────────────────────────────────────
  const spread =
    asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0;
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;
  const maxTotal = Math.max(
    asks[asks.length - 1]?.total ?? 1,
    bids[bids.length - 1]?.total ?? 1,
  );

  return {
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
  };
};
