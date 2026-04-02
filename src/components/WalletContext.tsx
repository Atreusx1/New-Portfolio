/**
 * WalletContext.tsx
 *
 * Lifts the EIP-1193 wallet state out of Navigation so any component
 * (OrderForm, DEXOrderBook, etc.) can read address / chainId and get
 * a ready-to-use ethers.js BrowserProvider for signing transactions.
 *
 * Usage
 * ─────
 * 1. Wrap your app root:
 *      <WalletProvider>
 *        <App />
 *      </WalletProvider>
 *
 * 2. Consume anywhere:
 *      const { address, chainId, provider, connect, disconnect } = useWallet();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal ethers v6 BrowserProvider interface — avoids a hard dep if you swap libs */
export interface EthersProvider {
  getSigner: () => Promise<{ getAddress: () => Promise<string> }>;
  getBalance: (address: string) => Promise<bigint>;
  getNetwork: () => Promise<{ chainId: bigint }>;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: "NO_METAMASK" | "REJECTED" | "UNKNOWN" | null;
  /** ethers BrowserProvider — null until wallet is connected */
  provider: EthersProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// ─── EIP-1193 window augmentation ─────────────────────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: unknown[]) => void,
      ) => void;
      isMetaMask?: boolean;
    };
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletState>({
  address: null,
  chainId: null,
  connecting: false,
  error: null,
  provider: null,
  connect: async () => {},
  disconnect: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<WalletState["error"]>(null);
  const [provider, setProvider] = useState<EthersProvider | null>(null);

  /**
   * Build an ethers v6 BrowserProvider lazily so the bundle doesn't
   * break if ethers isn't installed yet. If you haven't added ethers,
   * `provider` will stay null and you can still read address / chainId.
   */
  const buildProvider = useCallback(async () => {
    if (!window.ethereum) return null;
    try {
      // Dynamic import — only loads when a wallet is connected.
      const { BrowserProvider } = await import("ethers");
      return new BrowserProvider(window.ethereum) as unknown as EthersProvider;
    } catch {
      // ethers not installed — provider stays null, raw EIP-1193 still works.
      return null;
    }
  }, []);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("walletAddress");
    if (!stored || !window.ethereum) return;

    setAddress(stored);
    window.ethereum
      .request({ method: "eth_chainId" })
      .then((id) => setChainId(parseInt(id as string, 16)))
      .catch(() => {});

    buildProvider().then(setProvider);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── EIP-1193 event listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      if (list.length === 0) {
        setAddress(null);
        setChainId(null);
        setProvider(null);
        sessionStorage.removeItem("walletAddress");
      } else {
        setAddress(list[0]);
        sessionStorage.setItem("walletAddress", list[0]);
        buildProvider().then(setProvider);
      }
    };

    const onChain = (id: unknown) => {
      setChainId(parseInt(id as string, 16));
      // Rebuild provider on chain switch so signer targets new chain.
      buildProvider().then(setProvider);
    };

    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccounts);
      window.ethereum?.removeListener("chainChanged", onChain);
    };
  }, [buildProvider]);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("NO_METAMASK");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const id = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;

      setAddress(accounts[0]);
      setChainId(parseInt(id, 16));
      sessionStorage.setItem("walletAddress", accounts[0]);

      const p = await buildProvider();
      setProvider(p);
    } catch (e: unknown) {
      const err = e as { code?: number };
      setError(err.code === 4001 ? "REJECTED" : "UNKNOWN");
    } finally {
      setConnecting(false);
    }
  }, [buildProvider]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setProvider(null);
    sessionStorage.removeItem("walletAddress");
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        connecting,
        error,
        provider,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useWallet = () => useContext(WalletContext);

// ─── Chain label helper (shared) ──────────────────────────────────────────────

export const chainLabel = (id: number | null): string | null => {
  if (id === null) return null;
  const chains: Record<number, string> = {
    1: "ETH",
    5: "GÖRLI",
    11155111: "SEPOLIA",
    137: "POLYGON",
    80001: "MUMBAI",
    42161: "ARB",
    421614: "ARB-S",
    10: "OP",
    8453: "BASE",
    56: "BSC",
    43114: "AVAX",
  };
  return chains[id] ?? `0x${id.toString(16)}`;
};
