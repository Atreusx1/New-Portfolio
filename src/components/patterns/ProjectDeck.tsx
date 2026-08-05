/**
 * ProjectDeck.tsx
 *
 * ── The problem ──
 * Eleven projects in a two-column grid is six rows, and on a phone it is eleven.
 * Switching to "all" or "blockchain" turned the section into a scroll the rest
 * of the site does not ask for anywhere else. The previous layout got the
 * amount of scroll right; the list outgrew it.
 *
 * ── Why a paged rail rather than the alternatives ──
 * "Show 4, then a Show more button" only defers the problem, and the button
 * pushes everything below it down the page each time it is pressed.
 * Pagination that reloads a grid loses your place. A vertical carousel fights
 * the page's own scroll, which is the one interaction that must stay
 * predictable given the whole background is driven by scroll position.
 *
 * A horizontal rail is the one axis this page is not already using. It gives
 * the section a fixed height regardless of how many projects the filter
 * matched, which is the actual requirement: adding a twelfth project should not
 * make the page longer.
 *
 * ── How the two-row page works ──
 * The track is a grid with `grid-auto-flow: column` and two fixed rows, so
 * cards fill down then across: 1 and 2 in the first column, 3 and 4 in the
 * second. A "page" is two columns, so the snap points are on every fourth card
 * (`:nth-child(4n + 1)` in the stylesheet). On a narrow viewport the same track
 * drops to one row and one column per view, and every card becomes a snap
 * point, which is ordinary swiping.
 *
 * Page count and position are read from the DOM rather than computed from the
 * item count, so the component does not need to know which breakpoint is
 * active or duplicate the media query in JavaScript.
 */
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
  type ReactNode,
} from "react";
import { forwardRef } from "react";
import { prefersReducedMotion } from "./../motion/Reveal";

export interface ProjectDeckProps {
  children: ReactNode;
  /** Changing this scrolls back to the first page. */
  resetKey: string;
  label: string;
  /**
   * True while a detail view is open over the deck. The rail dims, blurs and
   * stops taking input, which is what makes the panel above it read as *this
   * card, opened* rather than as an unrelated thing that appeared.
   */
  dimmed?: boolean;
  /**
   * Reported on every page change, so a caller can render its own controls
   * without re-deriving page count and position from the scroll container a
   * second time.
   */
  onPageChange?: (state: { page: number; pages: number }) => void;
}

/** Imperative handle for controls that live outside this component. */
export interface ProjectDeckHandle {
  goTo: (page: number) => void;
  next: () => void;
  prev: () => void;
}

/**
 * Wrapped in forwardRef so the top-right cluster in Projects.tsx can drive
 * paging without the deck rendering its own controls. `pages` and `page` are
 * still measured here, since they come from the scroll container's own
 * geometry and this is the component holding the ref to it.
 */
export const ProjectDeck = forwardRef(function ProjectDeck(
  { children, resetKey, label, dimmed = false, onPageChange }: ProjectDeckProps,
  ref: ForwardedRef<ProjectDeckHandle>,
) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const nextPages = Math.max(1, Math.round(el.scrollWidth / el.clientWidth));
    const nextPage = Math.round(el.scrollLeft / el.clientWidth);
    setPages(nextPages);
    setPage(nextPage);
    onPageChange?.({ page: nextPage, pages: nextPages });
    // onPageChange is expected to be a stable callback (useCallback at the call
    // site); including it would re-run measure, and therefore the scroll and
    // resize listeners below, on every render of the parent instead of only
    // when the geometry actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Coalesced into a frame: a snap scroll fires this dozens of times and only
    // the settled value is ever rendered.
    let raf = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [measure]);

  // A filter change is a different list, so it starts at the beginning.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    setPage(0);
    measure();
  }, [resetKey, measure]);

  const go = useCallback(
    (to: number): void => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollTo({
        left: Math.max(0, Math.min(pages - 1, to)) * el.clientWidth,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [pages],
  );
  const dragRef = useRef({
    down: false,
    dragging: false,
    startX: 0,
    startScroll: 0,
  });

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const el = trackRef.current;
      if (!el) return;
      dragRef.current = {
        down: true,
        dragging: false,
        startX: e.clientX,
        startScroll: el.scrollLeft,
      };
    },
    [],
  );

  const onTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      const el = trackRef.current;
      if (!d.down || !el) return;
      const delta = e.clientX - d.startX;
      if (!d.dragging && Math.abs(delta) > 5) {
        d.dragging = true;
        el.setPointerCapture(e.pointerId);
        el.style.scrollSnapType = "none"; // free-scroll for the whole gesture
        document.body.dataset.deckDragging = "true";
      }
      if (d.dragging) el.scrollLeft = d.startScroll - delta;
    },
    [],
  );

  const onTrackPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      const el = trackRef.current;
      d.down = false;
      delete document.body.dataset.deckDragging;
      if (!d.dragging || !el) return;
      d.dragging = false;
      el.releasePointerCapture(e.pointerId);
      el.style.scrollSnapType = ""; // restored for keyboard/wheel use, but nothing moves now

      const swallow = (ce: MouseEvent) => {
        ce.stopPropagation();
        ce.preventDefault();
      };
      el.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => el.removeEventListener("click", swallow, true), 0);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      goTo: go,
      next: () => go(page + 1),
      prev: () => go(page - 1),
    }),
    [go, page],
  );

  const atStart = page <= 0;
  const atEnd = page >= pages - 1;
  /**
   * Which side of the rail should fade out. Masking both edges unconditionally
   * would clip the first card's left border at rest, which reads as a rendering
   * fault rather than as an affordance. The fade should only ever appear on a
   * side there is actually more content on.
   */
  const edge = pages < 2 ? "none" : atStart ? "end" : atEnd ? "start" : "both";

  return (
    <div
      className="deck"
      data-dimmed={dimmed ? "true" : "false"}
      data-edge={edge}
    >
      <div
        className="deck-track"
        ref={trackRef}
        role="group"
        aria-label={label}
        aria-hidden={dimmed || undefined}
        tabIndex={dimmed ? -1 : 0}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
        onPointerCancel={onTrackPointerUp}
      >
        {children}
      </div>
    </div>
  );
});
