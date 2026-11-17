import {
  useCallback,
  useEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useStepQueue } from './useStepQueue';

/** Delay before a held key starts to repeat, and the pace of the repeats after it. */
export const HOLD_DELAY_MS = 400;
export const HOLD_INTERVAL_MS = 150;

/** A click that follows a pointer press this closely was already sent by the press. */
const CLICK_AFTER_PRESS_MS = 500;

const isActivationKey = (key: string) => key === 'Enter' || key === ' ';

export interface HoldRepeatOptions {
  disabled?: boolean;
  delayMs?: number;
  intervalMs?: number;
}

/**
 * Props to spread on a key that repeats while it is held (D-pad arrows, channel up and down).
 *
 * The press sends at once; after `delayMs` it repeats every `intervalMs` until the pointer is
 * released or cancelled, the pointer capture is lost, the key loses focus, the key is released or
 * the component unmounts. The pointer is captured so a drag off the key keeps it held until the
 * release; Enter and Space behave the same way (the OS key repeat is ignored: the pace is ours).
 * Every send goes through the step queue, which holds at most one pending step, so commands
 * never pile up. A click that did not come from a press (assistive technology) sends once.
 */
export function useHoldRepeat(onFire: () => void, options: HoldRepeatOptions = {}) {
  const { disabled = false, delayMs = HOLD_DELAY_MS, intervalMs = HOLD_INTERVAL_MS } = options;
  const fire = useRef(onFire);
  fire.current = onFire;
  const { queue, clear, drain } = useStepQueue(() => fire.current(), intervalMs);
  const holding = useRef(false);
  const keyHeld = useRef(false);
  const lastPress = useRef(Number.NEGATIVE_INFINITY);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = useCallback(() => {
    const state = queue.current;
    if (state.target - state.sent < 1) state.target += 1;
    drain();
  }, [queue, drain]);

  const stop = useCallback(() => {
    holding.current = false;
    keyHeld.current = false;
    if (delayTimer.current !== null) clearTimeout(delayTimer.current);
    if (repeatTimer.current !== null) clearInterval(repeatTimer.current);
    delayTimer.current = null;
    repeatTimer.current = null;
    clear();
  }, [clear]);

  const start = useCallback(() => {
    if (holding.current) return;
    holding.current = true;
    clear();
    push();
    delayTimer.current = setTimeout(() => {
      delayTimer.current = null;
      repeatTimer.current = setInterval(push, intervalMs);
    }, delayMs);
  }, [clear, push, delayMs, intervalMs]);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  const release = () => {
    lastPress.current = Date.now();
    stop();
  };

  return {
    'data-no-long-press': disabled ? undefined : true,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      // The press belongs to the key: no page swipe or long press of the launcher from here.
      event.stopPropagation();
      lastPress.current = Date.now();
      const target = event.currentTarget;
      if (typeof target.setPointerCapture === 'function') {
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          // Synthetic events (tests) have no active pointer to capture.
        }
      }
      start();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onBlur: (_event: FocusEvent<HTMLElement>) => stop(),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (disabled || !isActivationKey(event.key)) return;
      event.preventDefault();
      if (event.repeat || holding.current) return;
      keyHeld.current = true;
      start();
    },
    onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
      if (!isActivationKey(event.key)) return;
      event.preventDefault();
      if (keyHeld.current) stop();
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      if (disabled || holding.current) return;
      if (Date.now() - lastPress.current < CLICK_AFTER_PRESS_MS) return;
      fire.current();
    },
  };
}
