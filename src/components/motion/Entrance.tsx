/**
 * Entrance.tsx — when is it safe for an entrance animation to start?
 *
 * ── The bug this exists to fix ──
 * Boot renders as a fixed overlay while the whole app stays mounted beneath it
 * at `opacity: 0`. Every entrance animation in that subtree therefore starts
 * counting from *page load*, not from when the overlay clears. Boot runs for
 * roughly 3.28s (5 lines x 340ms + 17 typed chars x 26ms + a 520ms hold + a
 * 620ms exit fade), while Hero's staged reveal finishes at 1.25s — so the
 * entire choreography played out behind an opaque screen and the visitor only
 * ever saw the settled result.
 *
 * ── Why a gate rather than unmounting ──
 * Not mounting Hero until Boot finishes would fix the timing and break
 * something better: Hero opens a Binance WebSocket and fetches four 96-candle
 * kline series on mount. Letting that happen *during* boot is the whole point
 * of having a boot screen — by the time the ticker rail is revealed it already
 * has real prices in it rather than four em-dashes. So the data plumbing keeps
 * mounting immediately and only the choreography waits.
 *
 * The context defaults to `true`, so anything rendered outside a provider —
 * the original Hero.tsx kept as a fallback, a test, a future page — behaves
 * exactly as it does today.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const EntranceCtx = createContext<boolean>(true);

export const EntranceProvider = ({
  ready,
  children,
}: {
  ready: boolean;
  children: ReactNode;
}) => <EntranceCtx.Provider value={ready}>{children}</EntranceCtx.Provider>;

/** True once entrance animations are allowed to run. */
export const useEntrance = (): boolean => useContext(EntranceCtx);

/**
 * A staged reveal that starts when the gate opens, not when the component
 * mounts. `steps` are millisecond offsets from that moment; the return value is
 * how many of them have elapsed, so `stage >= 3` gates the third element.
 *
 * Timers are cleared and the stage resets if the gate ever closes again, which
 * keeps the hook honest even though nothing currently reopens it.
 */
export const useStagedEntrance = (steps: readonly number[]): number => {
  const ready = useEntrance();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!ready) {
      setStage(0);
      return;
    }
    const ids = steps.map((ms, i) =>
      window.setTimeout(() => setStage(i + 1), ms),
    );
    return () => ids.forEach(window.clearTimeout);
    // steps is a module-level constant at every call site; spreading it into the
    // dependency array would re-arm every timer on each render instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return stage;
};
