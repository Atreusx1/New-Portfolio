/**
 * useExpandable.ts
 *
 * The shared mechanics behind every panel in the Projects section: what is
 * open, where it should grow from, and how it gets to leave.
 *
 * Two things it exists to stop being reimplemented:
 *
 *  1. **The expand origin.** A panel that scales from the centre of the section
 *     reads as "a panel appeared". A panel that scales from the centre of the
 *     control you touched reads as "that thing opened". The difference is one
 *     `transform-origin`, computed as a percentage of the stage, and it is the
 *     entire reason the redesign feels connected to the click.
 *  2. **The exit.** Unmounting on close is instant, so the panel vanishes while
 *     everything else in the app eases. This keeps the payload mounted through
 *     a closing phase so it can animate out and then leave.
 *
 *  3. **Dismissal.** A panel that only closes from its own close button is a
 *     dialog pretending to be a window. This closes on a click anywhere outside
 *     the stage, which is what every real window manager does and what people
 *     try first.
 *
 * Focus returns to whatever opened the panel, which matters because that
 * element is inside a container that was dimmed and made inert while the panel
 * was up.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/** Matches the exit animation in the stylesheet. */
const EXIT_MS = 260;

export interface Expandable<T> {
  item: T | null;
  closing: boolean;
  origin: { x: number; y: number };
  openWith: (item: T, el: HTMLElement) => void;
  /** Swap the payload without replaying the open animation. */
  replace: (item: T) => void;
  close: () => void;
}

export const useExpandable = <T>(
  stageRef: RefObject<HTMLElement | null>,
): Expandable<T> => {
  const [item, setItem] = useState<T | null>(null);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const opener = useRef<HTMLElement | null>(null);
  const exitTimer = useRef(0);

  const openWith = useCallback(
    (next: T, el: HTMLElement) => {
      window.clearTimeout(exitTimer.current);
      setClosing(false);

      const stage = stageRef.current;
      if (stage) {
        const s = stage.getBoundingClientRect();
        // The trigger may be a button inside a card, so measure the card when
        // there is one: the panel should grow from the shape you perceived
        // yourself as clicking, not from a 26px pill inside it.
        const box = (el.closest(".deck-card") ?? el).getBoundingClientRect();
        setOrigin({
          x: ((box.left + box.width / 2 - s.left) / s.width) * 100,
          // Clamped rather than clipped: a trigger sitting above the stage
          // gives a negative origin, which is correct and should stay
          // negative, just not so far out that the scale reads as a slide.
          y: Math.max(
            -25,
            ((box.top + box.height / 2 - s.top) / s.height) * 100,
          ),
        });
      }

      opener.current = el;
      setItem(next);
    },
    [stageRef],
  );

  const replace = useCallback((next: T) => setItem(next), []);

  const close = useCallback(() => {
    setClosing(true);
    opener.current?.focus({ preventScroll: true });
    window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      setItem(null);
      setClosing(false);
      opener.current = null;
    }, EXIT_MS);
  }, []);

  /**
   * Click-away dismissal.
   *
   * Bound to the document rather than to a scrim, because a scrim can only
   * cover what it is stretched over: the old one covered the stage, so clicking
   * the page around the section did nothing and the panel felt stuck.
   *
   * Two details that matter.
   *
   * `pointerdown` rather than `click`, so a drag that starts on the panel and
   * ends outside it does not count as a dismissal, which is how a text
   * selection running past the panel edge would otherwise close it.
   *
   * Bound on the next frame rather than immediately. The trigger for the DEX
   * panel sits outside the stage it opens, so a listener attached during the
   * same tick would see that interaction and close the panel before it had
   * finished opening.
   */
  useEffect(() => {
    if (item === null || closing) return;

    let raf = 0;
    const onDown = (e: PointerEvent): void => {
      const stage = stageRef.current;
      if (stage && !stage.contains(e.target as Node)) close();
    };

    raf = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", onDown);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [item, closing, stageRef, close]);

  return { item, closing, origin, openWith, replace, close };
};
