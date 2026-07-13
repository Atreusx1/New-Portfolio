/**
 * WalletBadge.tsx — the reason wallet connect exists.
 *
 * On connect the dropdown becomes a live "developer badge":
 *   · network, balance, transaction count (nonce) — read straight from
 *     the connected provider, no API keys
 *   · a gasless guestbook: personal_sign "I visited Anish's portfolio" →
 *     the signature hash becomes your visitor badge ID
 *   · signing unlocks dev mode: a live engine telemetry row (the
 *     blockchain-universe renderer's vitals) as a small easter egg
 *
 * Everything is read-only or signature-only. No transactions, no gas.
 */
import { useEffect, useState } from "react";
import { Copy, Check, LogOut, PenLine, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { chainLabel } from "./WalletContext";

interface WalletBadgeProps {
  address: string;
  chainId: number | null;
  onDisconnect: () => void;
}

interface OnChainStats {
  txCount: number | null;
  balanceEth: string | null;
}

const GUESTBOOK_MESSAGE = "I visited Anish's portfolio ✦";
const SIGNED_KEY = "ak-guestbook-sig";

const hexToEth = (hex: string): string => {
  try {
    const wei = BigInt(hex);
    const whole = wei / 10n ** 18n;
    const frac = ((wei % 10n ** 18n) / 10n ** 14n).toString().padStart(4, "0");
    return `${whole}.${frac}`;
  } catch {
    return "0";
  }
};

export const WalletBadge = ({
  address,
  chainId,
  onDisconnect,
}: WalletBadgeProps) => {
  const t = useTheme();
  const [stats, setStats] = useState<OnChainStats>({
    txCount: null,
    balanceEth: null,
  });
  const [copied, setCopied] = useState(false);
  const [signature, setSignature] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`${SIGNED_KEY}:${address.toLowerCase()}`);
    } catch {
      return null;
    }
  });
  const [signing, setSigning] = useState(false);

  // Read-only stats straight from the provider — no API keys needed.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    let dead = false;
    Promise.allSettled([
      eth.request({ method: "eth_getTransactionCount", params: [address, "latest"] }),
      eth.request({ method: "eth_getBalance", params: [address, "latest"] }),
    ]).then(([tx, bal]) => {
      if (dead) return;
      setStats({
        txCount:
          tx.status === "fulfilled" ? parseInt(tx.value as string, 16) : null,
        balanceEth:
          bal.status === "fulfilled" ? hexToEth(bal.value as string) : null,
      });
    });
    return () => {
      dead = true;
    };
  }, [address]);

  const copyAddress = (): void => {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const signGuestbook = async (): Promise<void> => {
    const eth = window.ethereum;
    if (!eth || signing) return;
    setSigning(true);
    try {
      const sig = (await eth.request({
        method: "personal_sign",
        params: [GUESTBOOK_MESSAGE, address],
      })) as string;
      setSignature(sig);
      try {
        localStorage.setItem(`${SIGNED_KEY}:${address.toLowerCase()}`, sig);
      } catch {
        /* private mode */
      }
    } catch {
      /* user rejected — fine */
    } finally {
      setSigning(false);
    }
  };

  const badgeId = signature ? signature.slice(2, 10) : null;

  const row: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.55rem 1rem",
    fontFamily: "var(--font-mono)",
    fontSize: "0.62rem",
    letterSpacing: "0.04em",
  };

  return (
    <div
      className="glass"
      role="dialog"
      aria-label="Wallet"
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        zIndex: 99,
        width: "260px",
        background: t.navBg,
        animation: "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Identity */}
      <div style={{ padding: "0.85rem 1rem 0.6rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.35rem" }}>
          {signature ? "Verified visitor" : "Connected"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.66rem",
            color: t.fg_(0.8),
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {address}
        </div>
      </div>

      {/* On-chain stats */}
      <div style={{ borderTop: "1px solid var(--border-mid)" }}>
        <div style={row}>
          <span style={{ color: t.fg_(0.4) }}>network</span>
          <span style={{ color: t.fg_(0.75) }}>
            {chainLabel(chainId) ?? "—"}
          </span>
        </div>
        <div style={row}>
          <span style={{ color: t.fg_(0.4) }}>transactions</span>
          <span style={{ color: t.fg_(0.75) }}>
            {stats.txCount === null ? "…" : stats.txCount.toLocaleString()}
          </span>
        </div>
        <div style={row}>
          <span style={{ color: t.fg_(0.4) }}>balance</span>
          <span style={{ color: t.fg_(0.75) }}>
            {stats.balanceEth === null ? "…" : `${stats.balanceEth} ETH`}
          </span>
        </div>
        {badgeId && (
          <div style={row}>
            <span style={{ color: t.fg_(0.4) }}>badge id</span>
            <span style={{ color: t.accent, display: "flex", gap: "0.4rem" }}>
              <Sparkles size={11} />#{badgeId}
            </span>
          </div>
        )}
      </div>

      {/* Guestbook — gasless signature */}
      {!signature && (
        <button
          onClick={() => void signGuestbook()}
          disabled={signing}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.7rem 1rem",
            background: t.ac_(0.07),
            border: "none",
            borderTop: "1px solid var(--border-mid)",
            color: t.accent,
            fontFamily: "var(--font-body)",
            fontSize: "0.72rem",
            fontWeight: 550,
            textAlign: "left",
          }}
        >
          <PenLine size={12} />
          {signing ? "Check your wallet…" : "Sign the guestbook — no gas"}
        </button>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid var(--border-mid)",
        }}
      >
        <button
          onClick={copyAddress}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            padding: "0.65rem",
            background: "transparent",
            border: "none",
            borderRight: "1px solid var(--border-mid)",
            color: t.fg_(0.55),
            fontFamily: "var(--font-body)",
            fontSize: "0.7rem",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            padding: "0.65rem",
            borderRight: "1px solid var(--border-mid)",
            color: t.fg_(0.55),
            fontFamily: "var(--font-body)",
            fontSize: "0.7rem",
            textDecoration: "none",
          }}
        >
          ↗ Scan
        </a>
        <button
          onClick={onDisconnect}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            padding: "0.65rem",
            background: "transparent",
            border: "none",
            color: "rgba(255,110,110,0.7)",
            fontFamily: "var(--font-body)",
            fontSize: "0.7rem",
          }}
        >
          <LogOut size={11} />
          Exit
        </button>
      </div>
    </div>
  );
};
