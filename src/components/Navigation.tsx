/**
 * Navigation.tsx
 *
 * What changed
 * ────────────
 * ✗ Local useWallet() hook removed — state now lives in WalletContext
 * ✓ useWallet() imported from WalletContext (global, shared with OrderForm etc.)
 * ✓ chainLabel imported from WalletContext (single source of truth)
 * Everything else — UI, scroll-hide, copy, MetaMask toast — is unchanged.
 */

import { useEffect, useState } from "react";
import { Sun, Moon, Wallet, LogOut, Copy, Check } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useWallet, chainLabel } from "./WalletContext";

const shortAddr = (addr: string) => `${addr.slice(0, 6)}···${addr.slice(-4)}`;

interface NavProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export const Navigation = ({ onNavigate, activeSection }: NavProps) => {
  const t = useTheme();
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noMetaMaskVisible, setNoMetaMaskVisible] = useState(false);

  // ── Wallet state now comes from context ────────────────────────────────────
  const { address, chainId, connecting, error, connect, disconnect } =
    useWallet();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY < 60 || currentY < lastY);
      setLastY(currentY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastY]);

  useEffect(() => {
    if (error === "NO_METAMASK") {
      setNoMetaMaskVisible(true);
      const timer = setTimeout(() => setNoMetaMaskVisible(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const navItems = [
    { id: "about", label: "About" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "experience", label: "Experience" },
    { id: "contact", label: "Contact" },
  ];

  const chain = chainLabel(chainId);
  const isWrongNet = chainId !== null && chainId !== 1;

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={{ height: "1px", background: t.fg_(0.08) }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2rem",
            height: "52px",
            background: t.navBg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            transition: "background 0.35s ease",
          }}
        >
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: t.fg,
              background: "none",
              border: "none",
              letterSpacing: "0.05em",
              transition: "color 0.35s ease",
              cursor: "crosshair",
            }}
          >
            AK.
          </button>

          {/* Desktop nav links */}
          <div
            style={{ display: "flex", gap: "2.5rem" }}
            className="nav-desktop"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  background: "none",
                  border: "none",
                  color: activeSection === item.id ? t.accent : t.fg_(0.45),
                  borderBottom:
                    activeSection === item.id
                      ? `1px solid ${t.accent}`
                      : "1px solid transparent",
                  paddingBottom: "2px",
                  transition: "color 0.2s ease, border-color 0.2s ease",
                  cursor: "crosshair",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Wallet button */}
            <div style={{ position: "relative" }}>
              {address ? (
                <>
                  <button
                    onClick={() => setWalletMenuOpen((o) => !o)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontFamily: "Space Mono, monospace",
                      fontSize: "0.55rem",
                      letterSpacing: "0.08em",
                      padding: "0.3rem 0.65rem",
                      background: t.ac_(0.08),
                      color: t.accent,
                      border: `1px solid ${
                        isWrongNet ? "rgba(255,160,80,0.4)" : t.ac_(0.25)
                      }`,
                      cursor: "crosshair",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: isWrongNet
                          ? "rgba(255,160,80,0.9)"
                          : t.accent,
                      }}
                    />
                    {chain && (
                      <span
                        style={{
                          color: isWrongNet
                            ? "rgba(255,160,80,0.8)"
                            : t.fg_(0.35),
                          fontSize: "0.48rem",
                        }}
                      >
                        {chain}
                      </span>
                    )}
                    {shortAddr(address)}
                  </button>

                  {walletMenuOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        style={{
                          position: "fixed",
                          inset: 0,
                          zIndex: 98,
                        }}
                        onClick={() => setWalletMenuOpen(false)}
                      />
                      {/* Dropdown */}
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          right: 0,
                          zIndex: 99,
                          minWidth: "200px",
                          border: `1px solid ${t.ac_(0.2)}`,
                          background: t.navBg,
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        {/* Address */}
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            borderBottom: `1px solid ${t.fg_(0.07)}`,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "Space Mono, monospace",
                              fontSize: "0.5rem",
                              letterSpacing: "0.15em",
                              color: t.fg_(0.25),
                              textTransform: "uppercase",
                              marginBottom: "0.3rem",
                            }}
                          >
                            Connected
                          </div>
                          <div
                            style={{
                              fontFamily: "Space Mono, monospace",
                              fontSize: "0.65rem",
                              color: t.fg_(0.7),
                              letterSpacing: "0.03em",
                              wordBreak: "break-all",
                            }}
                          >
                            {address}
                          </div>
                        </div>

                        {/* Copy */}
                        <button
                          onClick={copyAddress}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.65rem 1rem",
                            background: "transparent",
                            border: "none",
                            borderBottom: `1px solid ${t.fg_(0.07)}`,
                            color: t.fg_(0.5),
                            fontFamily: "Space Mono, monospace",
                            fontSize: "0.6rem",
                            letterSpacing: "0.08em",
                            textAlign: "left",
                            cursor: "crosshair",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              t.fg;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              t.fg_(0.5);
                          }}
                        >
                          {copied ? <Check size={11} /> : <Copy size={11} />}
                          {copied ? "Copied!" : "Copy address"}
                        </button>

                        {/* Etherscan */}
                        <a
                          href={`https://etherscan.io/address/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.65rem 1rem",
                            borderBottom: `1px solid ${t.fg_(0.07)}`,
                            color: t.fg_(0.5),
                            fontFamily: "Space Mono, monospace",
                            fontSize: "0.6rem",
                            letterSpacing: "0.08em",
                            textDecoration: "none",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.color =
                              t.fg;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.color =
                              t.fg_(0.5);
                          }}
                        >
                          <span style={{ fontSize: "0.65rem" }}>↗</span>
                          Etherscan
                        </a>

                        {/* Disconnect */}
                        <button
                          onClick={() => {
                            disconnect();
                            setWalletMenuOpen(false);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.65rem 1rem",
                            background: "transparent",
                            border: "none",
                            color: "rgba(255,100,100,0.55)",
                            fontFamily: "Space Mono, monospace",
                            fontSize: "0.6rem",
                            letterSpacing: "0.08em",
                            textAlign: "left",
                            cursor: "crosshair",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              "rgba(255,100,100,0.9)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color =
                              "rgba(255,100,100,0.55)";
                          }}
                        >
                          <LogOut size={11} />
                          Disconnect
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={connect}
                  disabled={connecting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    fontFamily: "Space Mono, monospace",
                    fontSize: "0.55rem",
                    letterSpacing: "0.08em",
                    padding: "0.3rem 0.65rem",
                    background: connecting ? t.ac_(0.04) : t.ac_(0.08),
                    color: connecting ? t.fg_(0.3) : t.accent,
                    border: `1px solid ${t.ac_(0.2)}`,
                    cursor: connecting ? "wait" : "crosshair",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Wallet size={10} />
                  {connecting ? "Connecting…" : "Connect"}
                </button>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={t.toggle}
              className="theme-toggle"
              title={t.isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={
                t.isDark ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {t.isDark ? <Sun size={12} /> : <Moon size={12} />}
            </button>

            {/* Status dot */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "Space Mono, monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                color: t.fg_(0.3),
              }}
              className="nav-status"
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: t.accent,
                  display: "inline-block",
                  animation: "blink 2s ease-in-out infinite",
                }}
              />
              AVAILABLE
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: t.fg_(0.08) }} />

        <style>{`
          @media (max-width: 768px) {
            .nav-desktop { display: none !important; }
            .nav-status  { display: none !important; }
          }
        `}</style>
      </nav>

      {/* No MetaMask toast */}
      {noMetaMaskVisible && (
        <div
          style={{
            position: "fixed",
            top: "68px",
            right: "1.5rem",
            zIndex: 200,
            border: "1px solid rgba(255,160,80,0.3)",
            background: "rgba(255,120,0,0.08)",
            backdropFilter: "blur(12px)",
            padding: "0.75rem 1.1rem",
            fontFamily: "Space Mono, monospace",
            fontSize: "0.62rem",
            letterSpacing: "0.07em",
            color: "rgba(255,160,80,0.9)",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            animation: "fadeIn 0.3s ease",
            maxWidth: "280px",
          }}
        >
          <Wallet size={12} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: "0.15rem" }}>
              MetaMask not found
            </div>
            <div style={{ opacity: 0.65, fontSize: "0.55rem" }}>
              Install the MetaMask extension to connect.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
