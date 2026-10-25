import { useCallback, useEffect, useMemo, useRef, type PointerEvent } from 'react';
import { HOLD_TOLERANCE_PX, LONG_PRESS_MS, vibrate } from './gestures';

export { LONG_PRESS_MS };
/** How long the guard outlives the release of the finger: the click follows it at once. */
const CLICK_AFTER_RELEASE_MS = 600;

export interface LongPressInfo {
  target: EventTarget | null;
  pointerType: string;
  pointerId: number;
  clientX: number;
  clientY: number;
}

export interface LongPressOptions {
  onLongPress: (info: LongPressInfo) => void;
  /** The hold starts (its info) and ends, fired or not (null): the progressive cue. */
  onPressChange?: (info: LongPressInfo | null) => void;
  delay?: number;
  disabled?: boolean;
}

export interface LongPressHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: { preventDefault: () => void }) => void;
}

/**
 * Swallows the click of the release of the press that just became a long press, so a held button
 * does not also act. Only that click: it ends at the first click, at the next press of any pointer
 * (a new gesture, whose click is its own) or CLICK_AFTER_RELEASE_MS after the finger that held
 * is lifted (pointerup or pointercancel of the same pointer). There is no limit from the moment
 * the press fires: the finger may stay down for seconds, and its release is still that click.
 * The click of the same pointer is the release wherever it lands: the long press may have redrawn
 * the page under the finger (the page overview shrinks it and puts the next page's card there,
 * 2026-10-22). A click of another pointer is not the release and goes through (G2,
 * REP-20261021-003). A click without a pointer (keyboard, script) is judged by its target: it must
 * contain the one pressed, or the pressed one must have left the page.
 */
function guardNextClick(press: LongPressInfo) {
  const win = globalThis.window;
  if (!win) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const done = () => {
    if (timer) win.clearTimeout(timer);
    win.removeEventListener('click', stop, true);
    win.removeEventListener('pointerdown', done, true);
    win.removeEventListener('pointerup', lifted, true);
    win.removeEventListener('pointercancel', lifted, true);
  };
  // The finger that held is lifted: from now on only a short window is left for its click.
  const lifted = (event: Event) => {
    if ((event as { pointerId?: unknown }).pointerId !== press.pointerId) return;
    win.removeEventListener('pointerup', lifted, true);
    win.removeEventListener('pointercancel', lifted, true);
    timer = win.setTimeout(done, CLICK_AFTER_RELEASE_MS);
  };
  const isRelease = (event: Event) => {
    // A click is a PointerEvent in browsers: the pointer of the release. Other clicks (keyboard,
    // script, engines without it) carry no pointer to compare.
    const pointerId = (event as { pointerId?: unknown }).pointerId;
    if (typeof pointerId === 'number' && pointerId > 0) return pointerId === press.pointerId;
    const pressed = press.target;
    return !(
      pressed instanceof Node &&
      pressed.isConnected &&
      event.target instanceof Node &&
      !event.target.contains(pressed)
    );
  };
  function stop(event: Event) {
    done();
    if (!isRelease(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }
  win.addEventListener('click', stop, true);
  win.addEventListener('pointerdown', done, true);
  win.addEventListener('pointerup', lifted, true);
  win.addEventListener('pointercancel', lifted, true);
}

/**
 * Press-and-hold of a second without moving (a swipe cancels it, REP-20261008-001). Fires
 * once, vibrates briefly where supported and swallows the click that would follow;
 * onPressChange follows the hold for the progressive cue.
 */
export function useLongPress({
  onLongPress,
  onPressChange,
  delay = LONG_PRESS_MS,
  disabled = false,
}: LongPressOptions): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  /** Where the finger is now: the long press reports it, not where the press began. */
  const point = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const callback = useRef(onLongPress);
  const pressChange = useRef(onPressChange);
  useEffect(() => {
    callback.current = onLongPress;
    pressChange.current = onPressChange;
  }, [onLongPress, onPressChange]);

  const clear = useCallback(() => {
    const holding = timer.current !== null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
    if (holding) pressChange.current?.(null);
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      // Main button of the primary pointer (engines without these fields count as primary).
      if (disabled || (event.button ?? 0) !== 0 || event.isPrimary === false) return;
      clear();
      fired.current = false;
      start.current = { x: event.clientX, y: event.clientY };
      point.current = start.current;
      const info: LongPressInfo = {
        target: event.target,
        pointerType: event.pointerType,
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        // Within the tolerance the finger may have drifted: a drag goes on from where it is.
        const now: LongPressInfo = {
          ...info,
          clientX: point.current?.x ?? info.clientX,
          clientY: point.current?.y ?? info.clientY,
        };
        guardNextClick(now);
        vibrate(10);
        pressChange.current?.(null);
        callback.current(now);
      }, delay);
      pressChange.current?.(info);
    },
    [clear, delay, disabled]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const origin = start.current;
      if (!origin || !timer.current) return;
      point.current = { x: event.clientX, y: event.clientY };
      const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      if (moved > HOLD_TOLERANCE_PX) clear();
    },
    [clear]
  );

  const onContextMenu = useCallback((event: { preventDefault: () => void }) => {
    // Touch browsers open their menu on a long press: the launcher uses the gesture.
    if (fired.current || timer.current) event.preventDefault();
  }, []);

  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerCancel: clear,
      onContextMenu,
    }),
    [onPointerDown, onPointerMove, clear, onContextMenu]
  );
}
