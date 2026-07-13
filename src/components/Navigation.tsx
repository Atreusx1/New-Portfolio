/**
 * Navigation.tsx — floating glass pill.
 *
 * · Centered, blurred, rounded; shrinks slightly past 60px of scroll.
 * · The active-section indicator is a real element that springs between
 *   links (measured via refs) instead of an underline color swap.
 * · Wallet connect is preserved and now opens the WalletBadge panel —
 *   a reason to connect beyond seeing your own address.
 */
import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Wallet, Menu, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useWallet, chainLabel } from "./WalletContext";
import { WalletBadge } from "./WalletBadge";

const shortAddr = (addr: string) => `${addr.slice(0, 6)}···${addr.slice(-4)}`;

interface NavProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

const NAV_ITEMS = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
] as const;

export const Navigation = ({ onNavigate, activeSection }: NavProps) => {
  const t = useTheme();
  const [compact, setCompact] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noMetaMask, setNoMetaMask] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, on: false });

  const linkRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pillRef = useRef<HTMLElement>(null);

  const { address, chainId, connecting, error, connect, disconnect } =
    useWallet();

  useEffect(() => {
    setMounted(true);
    const onScroll = (): void => setCompact(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Slide the indicator to the active link.
  useEffect(() => {
    const measure = (): void => {
      const el = linkRefs.current.get(activeSection);
      const pill = pillRef.current;
      if (!el || !pill) {
        setIndicator((v) => ({ ...v, on: false }));
        return;
      }
      const er = el.getBoundingClientRect();
      const pr = pill.getBoundingClientRect();
      setIndicator({ left: er.left - pr.left, width: er.width, on: true });
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, [activeSection, compact]);

  useEffect(() => {
    if (error === "NO_METAMASK") {
      setNoMetaMask(true);
      const id = setTimeout(() => setNoMetaMask(false), 3500);
      return () => clearTimeout(id);
    }
  }, [error]);

  const chain = chainLabel(chainId);
  const wrongNet = chainId !== null && chainId !== 1;

  return (
    <>
      <nav
        ref={pillRef}
        className={`nav-pill glass ${compact ? "nav-compact" : ""}`}
        aria-label="Primary"
        style={{
          transform: `translateX(-50%) translateY(${mounted ? 0 : -72}px)`,
          background: t.navBg,
        }}
      >
        {/* Logo */}
        <button
          onClick={() => onNavigate("home")}
          aria-label="Back to top"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: t.fg,
            background: "none",
            border: "none",
            letterSpacing: "-0.02em",
            padding: "0.4rem 0.6rem 0.4rem 0.75rem",
          }}
        >
          AK<span style={{ color: t.accent }}>.</span>
        </button>

        {/* Sliding active indicator */}
        <span
          className="nav-indicator"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.on ? 1 : 0,
          }}
        />

        {/* Links */}
        <div className="nav-desktop" style={{ display: "flex" }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                if (el) linkRefs.current.set(item.id, el);
                else linkRefs.current.delete(item.id);
              }}
              onClick={() => onNavigate(item.id)}
              className={`nav-link ${activeSection === item.id ? "nav-active" : ""}`}
              aria-current={activeSection === item.id ? "true" : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right cluster */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            paddingLeft: "0.35rem",
          }}
        >
          {/* Wallet */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() =>
                address ? setWalletOpen((o) => !o) : void connect()
              }
              disabled={connecting}
              aria-expanded={walletOpen}
              aria-label={address ? "Wallet menu" : "Connect wallet"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.58rem",
                letterSpacing: "0.06em",
                padding: "0.42rem 0.8rem",
                background: t.ac_(0.09),
                color: connecting ? t.fg_(0.35) : t.accent,
                border: `1px solid ${wrongNet ? "rgba(255,160,80,0.4)" : t.ac_(0.22)}`,
                borderRadius: 999,
                transition: "all 0.2s ease",
              }}
            >
              {address ? (
                <>
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: wrongNet ? "rgba(255,160,80,0.9)" : t.accent,
                    }}
                  />
                  {chain && (
                    <span
                      style={{
                        color: wrongNet ? "rgba(255,160,80,0.8)" : t.fg_(0.35),
                        fontSize: "0.5rem",
                      }}
                    >
                      {chain}
                    </span>
                  )}
                  {shortAddr(address)}
                </>
              ) : (
                <>
                  <Wallet size={11} />
                  {connecting ? "Connecting…" : "Connect"}
                </>
              )}
            </button>

            {walletOpen && address && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 98 }}
                  onClick={() => setWalletOpen(false)}
                />
                <WalletBadge
                  address={address}
                  chainId={chainId}
                  onDisconnect={() => {
                    disconnect();
                    setWalletOpen(false);
                  }}
                />
              </>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={t.toggle}
            aria-label={t.isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 999,
              color: t.fg_(0.55),
              transition: "all 0.2s ease",
            }}
          >
            {t.isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          {/* Mobile menu */}
          <button
            className="nav-burger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            style={{
              width: 30,
              height: 30,
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 999,
              color: t.fg_(0.7),
            }}
          >
            {menuOpen ? <X size={13} /> : <Menu size={13} />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {menuOpen && (
        <div
          className="glass"
          style={{
            position: "fixed",
            top: 72,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99,
            width: "min(320px, calc(100vw - 2rem))",
            padding: "0.5rem",
            background: t.navBg,
            display: "flex",
            flexDirection: "column",
            animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMenuOpen(false);
              }}
              className="nav-link"
              style={{ textAlign: "left", padding: "0.75rem 1rem" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* No MetaMask toast */}
      {noMetaMask && (
        <div
          role="status"
          className="glass"
          style={{
            position: "fixed",
            top: "76px",
            right: "1.25rem",
            zIndex: 200,
            border: "1px solid rgba(255,160,80,0.3)",
            padding: "0.75rem 1.1rem",
            fontFamily: "var(--font-body)",
            fontSize: "0.75rem",
            color: "rgba(255,160,80,0.95)",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            animation: "fadeUp 0.3s ease",
            maxWidth: "280px",
          }}
        >
          <Wallet size={13} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: "0.1rem" }}>
              MetaMask not found
            </div>
            <div style={{ opacity: 0.7, fontSize: "0.68rem" }}>
              Install the MetaMask extension to connect.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-indicator { display: none; }
          .nav-burger { display: flex !important; }
        }
      `}</style>
    </>
  );
};
