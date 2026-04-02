/**
 * usePythPrice.ts
 *
 * Streams the Pyth Network oracle price for a given pair via the Hermes
 * Server-Sent Events (SSE) endpoint. No API key required.
 *
 * Why Pyth in a DEX terminal?
 * ───────────────────────────
 * Pyth is the price feed that smart contracts (Uniswap, Aave, dYdX, etc.)
 * actually read on-chain. Showing the "basis" — the difference between the
 * live exchange mid price and the oracle price — tells a trader whether the
 * on-chain price has caught up to the market yet. A large positive basis means
 * the exchange is running ahead of the oracle (arbitrage may be live).
 *
 * Hermes endpoint
 * ───────────────
 * https://hermes.pyth.network/v2/updates/price/stream?ids[]={id}&parsed=true
 * Pushes an SSE event roughly every 400ms (each Pythnet slot).
 *
 * Price encoding
 * ──────────────
 * Pyth stores prices as fixed-point integers:
 *   actual_price = raw_price * 10^expo
 * Example: price = "185000000000", expo = -8 → $1850.00000000
 */

import { useEffect, useRef, useState } from "react";

// ─── Pyth price feed IDs (EVM / Crypto) ──────────────────────────────────────
// Full list: https://pyth.network/developers/price-feed-ids#pyth-evm-stable
const PYTH_FEED_IDS: Record<string, string> = {
  "ETH/USDC":
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BTC/USDT":
    "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ARB/USDC":
    "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  "SOL/USDC":
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
};

const HERMES_BASE = "https://hermes.pyth.network";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PythPrice {
  /** Oracle price in USD */
  price: number;
  /** ±confidence interval in USD */
  conf: number;
  /** Unix timestamp of the last on-chain publish */
  publishTime: number;
  /** Milliseconds since the price was last published (staleness indicator) */
  ageMs: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const usePythPrice = (pairLabel: string): PythPrice | null => {
  const [data, setData] = useState<PythPrice | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const feedId = PYTH_FEED_IDS[pairLabel];
    if (!feedId) return;

    // Reset on pair switch
    setData(null);
    esRef.current?.close();

    const url = `${HERMES_BASE}/v2/updates/price/stream?ids[]=${feedId}&parsed=true`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (evt: MessageEvent) => {
      try {
        const json = JSON.parse(evt.data as string) as {
          parsed?: {
            id: string;
            price: {
              price: string;
              conf: string;
              expo: number;
              publish_time: number;
            };
          }[];
        };

        const feed = json.parsed?.[0];
        if (!feed) return;

        const expo = feed.price.expo;
        const scale = Math.pow(10, expo);

        setData({
          price: parseFloat(feed.price.price) * scale,
          conf: parseFloat(feed.price.conf) * scale,
          publishTime: feed.price.publish_time,
          ageMs: Date.now() - feed.price.publish_time * 1000,
        });
      } catch {
        /* ignore malformed frames */
      }
    };

    es.onerror = () => {
      // SSE will auto-reconnect; just close and let the browser retry
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [pairLabel]);

  return data;
};

// ─── Utility: compute basis in basis points ───────────────────────────────────
/**
 * Basis = (exchangePrice - oraclePrice) / oraclePrice × 10_000
 *
 * > 0  → exchange is trading above oracle (bullish pressure, arb opportunity)
 * < 0  → exchange is below oracle (bearish, oracle catching up)
 * ≈ 0  → prices are in sync
 */
export const computeBasisBps = (
  exchangeMid: number,
  oraclePrice: number,
): number => {
  if (!oraclePrice) return 0;
  return ((exchangeMid - oraclePrice) / oraclePrice) * 10_000;
};
