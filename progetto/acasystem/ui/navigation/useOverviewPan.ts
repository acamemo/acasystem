/**
 * Moving the cards of the page overview with the pointer (REP-20261009-003). The cards are
 * moved by transform, not scrolled: the finger (or the mouse) writes the distance it has gone
 * to --aca-overview-pan of each card, once a frame, and the cards follow it without lag; let go, the card
 * nearest the centre (a quick flick counts) becomes the centre and the cards glide to their
 * places. A press that does not move stays a tap, and a card held still lifts instead
 * (usePageDrag): either of them cancels the pan.
 */
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { HOLD_TOLERANCE_PX } from './gestures';

export const PAN_VAR = '--aca-overview-pan';

export interface OverviewPanOptions {
  /** The pager: its children are the cards, and the pan is written on each of them. */
  element: { current: HTMLElement | null };
  enabled: boolean;
  /** Number of cards. */
  count: number;
  /** Distance between the centres of two cards, in px (0 while unknown: no pan). */
  getPitch: () => number;
  /** The card in the centre. */
  getIndex: () => number;
  /** A card is being dragged to a new place (usePageDrag): the pointer is theirs. */
  isBlocked: () => boolean;
  /** The card that is now in the centre, when it is not the same. */
  onSettle: (index: number) => void;
  /**
   * The pan in px, as it is written (once a frame), and 0 when it goes back to rest: the pager
   * keeps drawn the pages of the cards in view (ISSUE-109, R2).
   */
  onPan?: (pan: number) => void;
}

/** Past the first or the last card the pan gives way only by this share of the finger. */
const PULL = 0.3;
/** A flick carries the cards on by this much of its speed. */
const FLICK_MS = 120;
/** A flick: this fast (px per ms) and past this distance turns a card, however little it moved. */
const FLICK_SPEED = 0.4;
const FLICK_MIN_PX = 16;
const SAMPLE_MS = 100;

export function useOverviewPan(options: OverviewPanOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const end = useRef<(() => void) | null>(null);
  useEffect(() => () => end.current?.(), []);
  // The overview closes (Esc, «Fine») in the middle of a pan: back to rest, no card chosen.
  useEffect(() => {
    if (!options.enabled) end.current?.();
  }, [options.enabled]);

  return useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const { element: ref, enabled } = optionsRef.current;
    const element = ref.current;
    if (!enabled || !element) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    end.current?.();

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const index = optionsRef.current.getIndex();
    let panning = false;
    let origin = startX;
    let pan = 0;
    let frame = 0;
    let samples: { x: number; t: number }[] = [];

    // The pan is not inherited (launcher.css, REP-20261012-003): each card has its own, so a
    // write recalculates the style of the cards and not of everything below them.
    // The layer of the gaps (Pager.tsx) is a child too, and no card: nothing is written on it.
    const cards = () =>
      Array.from(element.children)
        .filter((card) => !card.classList.contains('aca-pager__surface'))
        .map((card) => (card as HTMLElement).style);
    const write = () => {
      frame = 0;
      for (const style of cards()) style.setProperty(PAN_VAR, `${pan}px`);
      optionsRef.current.onPan?.(pan);
    };
    const clear = () => {
      for (const style of cards()) style.removeProperty(PAN_VAR);
      optionsRef.current.onPan?.(0);
    };
    /** The range of the pan keeps the centre between the first and the last card. */
    const clamp = (value: number, pitch: number) => {
      const max = index * pitch;
      const min = (index - (optionsRef.current.count - 1)) * pitch;
      if (value > max) return max + (value - max) * PULL;
      if (value < min) return min + (value - min) * PULL;
      return value;
    };

    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      const { getPitch, isBlocked } = optionsRef.current;
      const pitch = getPitch();
      if (isBlocked() || pitch <= 0) {
        // Blocked in the middle of a pan: the cards go back to rest, nothing is left written.
        if (panning) leave();
        else stop();
        return;
      }
      if (!panning) {
        const dx = move.clientX - startX;
        const dy = move.clientY - startY;
        if (Math.hypot(dx, dy) <= HOLD_TOLERANCE_PX) return;
        // Up or down is not a pan: nothing moves that way.
        if (Math.abs(dy) > Math.abs(dx)) {
          stop();
          return;
        }
        panning = true;
        origin = move.clientX;
        element.setAttribute('data-panning', '');
        // A tip open on a control closes when the cards move (it hides on any scroll).
        element.dispatchEvent(new Event('scroll'));
      }
      pan = clamp(move.clientX - origin, pitch);
      const now = performance.now();
      samples = [...samples.filter((sample) => now - sample.t < SAMPLE_MS), { x: pan, t: now }];
      if (!frame) frame = requestAnimationFrame(write);
    };

    const release = (settle: boolean) => {
      const wasPanning = panning;
      const pitch = optionsRef.current.getPitch();
      let target = index;
      if (wasPanning && settle && pitch > 0) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        // A finger that stopped before it let go carries nothing.
        const moving = last && performance.now() - last.t < SAMPLE_MS;
        const speed =
          moving && first && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
        const toCard = (position: number) =>
          Math.min(optionsRef.current.count - 1, Math.max(0, Math.round(position)));
        target = toCard(index - (pan + speed * FLICK_MS) / pitch);
        // A quick flick turns at least one card, however short.
        if (target === index && Math.abs(speed) > FLICK_SPEED && Math.abs(pan) > FLICK_MIN_PX) {
          target = toCard(index + (speed < 0 ? 1 : -1));
        }
      }
      stop();
      if (!wasPanning) return;
      // The click of the release must not open the card the finger ends on.
      const swallow = (click: Event) => {
        click.stopPropagation();
        click.preventDefault();
      };
      window.addEventListener('click', swallow, true);
      setTimeout(() => window.removeEventListener('click', swallow, true), 50);
      // The end of the pan goes first, so the cards are already set to glide when the new centre
      // is laid out (it reads the layout): they leave from where the finger left them.
      element.removeAttribute('data-panning');
      clear();
      flushSync(() => {
        if (target !== index) optionsRef.current.onSettle(target);
      });
    };
    const onUp = (up: PointerEvent) => {
      if (up.pointerId === pointerId) release(true);
    };
    const onCancel = (cancel: PointerEvent) => {
      if (cancel.pointerId === pointerId) release(false);
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (end.current === leave) end.current = null;
    };
    // The hook ends with the component: back to rest, nothing left written.
    const leave = () => {
      stop();
      element.removeAttribute('data-panning');
      clear();
    };
    end.current = leave;

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }, []);
}
