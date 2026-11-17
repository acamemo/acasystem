/**
 * Dragging a page card in the page overview to change the order of the pages
 * (REP-20261007-028). The card lifts after a press of a second held still on it
 * (REP-20261008-001, U1, E7), for every kind of pointer; moving first is the usual scroll of the
 * cards. Lifted, it follows the pointer, the other cards step aside one card at a time, and
 * holding the pointer near an edge scrolls the overview by one card. The drop hands over the old
 * and the new position.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { HOLD_TOLERANCE_PX, LONG_PRESS_MS, vibrate } from './gestures';

export interface PageDragState {
  /** Position of the card picked up. */
  from: number;
  /** Position it would take if dropped now. */
  to: number;
  /** Pixels the card follows the pointer by (scrolling included). */
  offset: number;
}

export interface PageDragOptions {
  /** Number of cards. */
  count: number;
  /** First position a page may take (1 with the cover, which stays first). */
  minIndex: number;
  /** Distance between the centres of two cards, in px. */
  getPitch: () => number;
  /**
   * Where the overview is, in px (the card in the centre times the pitch: the cards are moved
   * by transform, there is no scroll) and a way to move it by whole cards, for the edges.
   */
  getScroll: () => number;
  scrollBy: (pixels: number) => void;
  getBounds: () => { left: number; right: number } | null;
  onDrop: (from: number, to: number) => void;
  /** False for a card that never moves (the cover): the hold calls onRefuse instead. */
  canMove?: (index: number) => boolean;
  /** The card lifted under the pointer. */
  onLift?: (index: number) => void;
  /** A card that does not move was held for the whole time. */
  onRefuse?: (index: number) => void;
  /** No press starts (a name being edited). */
  disabled?: boolean;
}

const EDGE_PX = 48;
const EDGE_STEP_MS = 450;

interface Pending {
  index: number;
  pointerId: number;
  x: number;
  y: number;
  scroll: number;
}

export function usePageDrag(options: PageDragOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [state, setState] = useState<PageDragState | null>(null);
  /** Card being held before it lifts: the progressive cue. */
  const [pressing, setPressing] = useState<number | null>(null);
  const stateRef = useRef<PageDragState | null>(null);
  const pending = useRef<Pending | null>(null);
  const lastX = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedAt = useRef(0);
  /** The hold went to its end (lifted or refused): the click of the release is absorbed. */
  const held = useRef(false);
  const [tracking, setTracking] = useState(false);

  const update = useCallback((next: PageDragState | null) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stopEdge = () => {
    if (edgeTimer.current) clearInterval(edgeTimer.current);
    edgeTimer.current = null;
  };
  const stopHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const stop = useCallback(() => {
    stopEdge();
    stopHold();
    pending.current = null;
    held.current = false;
    setTracking(false);
    setPressing(null);
    update(null);
  }, [update]);

  /** Where the card is now, from the pointer and the scroll since it was picked up. */
  const measure = useCallback((x: number): PageDragState | null => {
    const start = pending.current;
    if (!start) return null;
    const { count, minIndex, getPitch, getScroll } = optionsRef.current;
    const offset = x - start.x + (getScroll() - start.scroll);
    const pitch = getPitch() || 1;
    const to = Math.min(count - 1, Math.max(minIndex, start.index + Math.round(offset / pitch)));
    return { from: start.index, to, offset };
  }, []);

  /** A press on a card: it lifts once held still for LONG_PRESS_MS. */
  const begin = useCallback(
    (index: number, pointerId: number, clientX: number, clientY = 0) => {
      if (optionsRef.current.disabled) return;
      stop();
      pending.current = {
        index,
        pointerId,
        x: clientX,
        y: clientY,
        scroll: optionsRef.current.getScroll(),
      };
      lastX.current = clientX;
      setTracking(true);
      // A card that does not move (the cover) does not rise: the hold only says why.
      setPressing(optionsRef.current.canMove?.(index) === false ? null : index);
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        const start = pending.current;
        if (!start) return;
        setPressing(null);
        held.current = true;
        if (optionsRef.current.canMove?.(start.index) === false) {
          optionsRef.current.onRefuse?.(start.index);
          return;
        }
        vibrate(10);
        // From where the finger is now: the card rises in place, then follows it.
        pending.current = { ...start, x: lastX.current };
        update({ from: start.index, to: start.index, offset: 0 });
        optionsRef.current.onLift?.(start.index);
      }, LONG_PRESS_MS);
    },
    [stop, update]
  );

  useEffect(() => {
    if (!tracking) return undefined;

    const edge = (x: number) => {
      const bounds = optionsRef.current.getBounds();
      const direction = !bounds
        ? 0
        : x < bounds.left + EDGE_PX
          ? -1
          : x > bounds.right - EDGE_PX
            ? 1
            : 0;
      if (direction === 0) {
        stopEdge();
        return;
      }
      if (edgeTimer.current) return;
      edgeTimer.current = setInterval(() => {
        optionsRef.current.scrollBy(direction * optionsRef.current.getPitch());
        if (stateRef.current) update(measure(lastX.current));
      }, EDGE_STEP_MS);
    };

    const onMove = (event: PointerEvent) => {
      const start = pending.current;
      if (!start || event.pointerId !== start.pointerId) return;
      lastX.current = event.clientX;
      if (!stateRef.current) {
        if (held.current) return;
        // Still holding: moving away is a scroll of the cards, not a drag.
        const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (moved > HOLD_TOLERANCE_PX) stop();
        return;
      }
      event.preventDefault();
      update(measure(event.clientX));
      edge(event.clientX);
    };
    const onUp = (event: PointerEvent) => {
      const start = pending.current;
      if (!start || event.pointerId !== start.pointerId) return;
      const current = stateRef.current;
      // The click of the release must not open the page, lifted or refused.
      if (held.current) endedAt.current = Date.now();
      if (current) {
        const final = measure(event.clientX) ?? current;
        if (final.to !== final.from) optionsRef.current.onDrop(final.from, final.to);
      }
      stop();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !stateRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      stop();
    };
    // Lifted: the touch must not start a scroll, or Chrome on Android cancels the pointer.
    const onTouchMove = (event: TouchEvent) => {
      if (stateRef.current && event.cancelable) event.preventDefault();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [tracking, measure, stop, update]);

  useEffect(() => stop, [stop]);

  /** True right after a drop or a hold: the click that follows the release must not open the page. */
  const justDropped = useCallback(() => Date.now() - endedAt.current < 400, []);

  return { state, pressing, begin, cancel: stop, justDropped };
}
