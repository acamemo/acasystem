import { useCallback, useEffect, useMemo, useRef } from 'react';

/** Interval between commands sent during a gesture (design.md: about 150–200 ms). */
export const GESTURE_SEND_INTERVAL_MS = 180;

export interface ThrottledSender<T> {
  /** Sends at once if the interval has passed, otherwise keeps the latest value for later. */
  push: (value: T) => void;
  /** Final send: the given (or latest kept) value, unless it equals the last one sent. */
  flush: (value?: T) => void;
  /** Drops a kept value without sending it. */
  cancel: () => void;
}

/**
 * Throttles a stream of values (a brightness drag, a speed slider): the first value goes out
 * at once, then at most one every `intervalMs` with the latest value, plus the final value.
 */
export function useThrottledSender<T>(
  send: (value: T) => void,
  intervalMs: number = GESTURE_SEND_INTERVAL_MS,
  same: (a: T, b: T) => boolean = Object.is
): ThrottledSender<T> {
  const sendRef = useRef(send);
  const sameRef = useRef(same);
  const lastAt = useRef<number | null>(null);
  const lastSent = useRef<{ value: T } | null>(null);
  const kept = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sendRef.current = send;
    sameRef.current = same;
  });

  const dispatch = useCallback((value: T) => {
    lastAt.current = Date.now();
    lastSent.current = { value };
    kept.current = null;
    sendRef.current(value);
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const push = useCallback(
    (value: T) => {
      if (timer.current !== null) {
        kept.current = { value };
        return;
      }
      const elapsed = lastAt.current === null ? Infinity : Date.now() - lastAt.current;
      if (elapsed >= intervalMs) {
        dispatch(value);
        return;
      }
      kept.current = { value };
      timer.current = setTimeout(() => {
        timer.current = null;
        const next = kept.current;
        if (next) dispatch(next.value);
      }, intervalMs - elapsed);
    },
    [dispatch, intervalMs]
  );

  const flush = useCallback(
    (value?: T) => {
      clearTimer();
      const final = value !== undefined ? { value } : kept.current;
      kept.current = null;
      if (final && !(lastSent.current && sameRef.current(lastSent.current.value, final.value))) {
        dispatch(final.value);
      }
      // The burst is over: the next final value is compared only with what that burst sends.
      lastSent.current = null;
    },
    [clearTimer, dispatch]
  );

  const cancel = useCallback(() => {
    clearTimer();
    kept.current = null;
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return useMemo(() => ({ push, flush, cancel }), [push, flush, cancel]);
}
