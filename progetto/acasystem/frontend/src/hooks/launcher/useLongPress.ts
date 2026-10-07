import { useCallback, useEffect, useMemo, useRef, type PointerEvent } from 'react';

export const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;
const CLICK_GUARD_MS = 800;

export interface LongPressInfo {
  target: EventTarget | null;
  pointerType: string;
  clientX: number;
  clientY: number;
}

export interface LongPressOptions {
  onLongPress: (info: LongPressInfo) => void;
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

/** Swallows the click that follows a long press, so a held button does not also act. */
function guardNextClick() {
  const win = globalThis.window;
  if (!win) return;
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    win.removeEventListener('click', stop, true);
  };
  win.addEventListener('click', stop, true);
  win.setTimeout(() => win.removeEventListener('click', stop, true), CLICK_GUARD_MS);
}

/**
 * Press-and-hold of about half a second without moving (a swipe cancels it). Fires once,
 * vibrates briefly where supported and swallows the click that would follow.
 */
export function useLongPress({
  onLongPress,
  delay = LONG_PRESS_MS,
  disabled = false,
}: LongPressOptions): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const callback = useRef(onLongPress);
  useEffect(() => {
    callback.current = onLongPress;
  }, [onLongPress]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      // Main button of the primary pointer (engines without these fields count as primary).
      if (disabled || (event.button ?? 0) !== 0 || event.isPrimary === false) return;
      clear();
      fired.current = false;
      start.current = { x: event.clientX, y: event.clientY };
      const info: LongPressInfo = {
        target: event.target,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        guardNextClick();
        try {
          globalThis.navigator?.vibrate?.(10);
        } catch {
          // Vibration is optional.
        }
        callback.current(info);
      }, delay);
    },
    [clear, delay, disabled]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const origin = start.current;
      if (!origin || !timer.current) return;
      const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      if (moved > MOVE_TOLERANCE_PX) clear();
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
