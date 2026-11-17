import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs a service call and reports a synchronous throw or a rejected promise to `onError`. */
export function sendSafely(send: () => unknown, onError: () => void) {
  try {
    Promise.resolve(send()).catch(onError);
  } catch {
    onError();
  }
}

export interface ConfirmedCommand<T> {
  /** The requested value while waiting for Home Assistant, the confirmed one otherwise. */
  value: T;
  /** What Home Assistant reports, whatever was requested: the state to show as the real one. */
  confirmed: T;
  pending: boolean;
  /** The last request failed (rejected service call). */
  error: boolean;
  /** Shows `target` as requested and, when given, sends the call. */
  request: (target: T, send?: () => unknown) => void;
  /** Attaches a (throttled) call to the current request: a failure marks the error. */
  track: (send: () => unknown) => void;
  /** `timeoutMessage` once the last request got no confirmation in time; null otherwise. */
  timedOut: string | null;
  /** Sends the last request again (after a timeout). */
  retry: () => void;
}

interface ConfirmedOptions<T> {
  equals?: (confirmed: T, requested: T) => boolean;
  /** Without a confirmation the request is dropped after this delay (no error: HA accepted it). */
  timeoutMs?: number;
  /**
   * When given, a request that times out is not dropped silently: `timedOut` carries this
   * message until the next request or the next change reported by Home Assistant, and `retry`
   * sends the request again.
   */
  timeoutMessage?: string;
  /** Ignore new requests while one is pending (power buttons, as usePowerToggle). */
  ignoreWhilePending?: boolean;
}

/**
 * «Requested vs confirmed» (design.md): a command shows the requested value as pending until the
 * entity state reported by Home Assistant matches it, the call fails or the timeout expires.
 */
export function useConfirmedCommand<T>(
  confirmed: T,
  {
    equals = Object.is,
    timeoutMs = 10000,
    ignoreWhilePending = false,
    timeoutMessage,
  }: ConfirmedOptions<T> = {}
): ConfirmedCommand<T> {
  const [requested, setRequested] = useState<{ target: T; id: number } | null>(null);
  const [error, setError] = useState(false);
  const [timedOut, setTimedOut] = useState<string | null>(null);
  const last = useRef<{ target: T; send?: () => unknown } | null>(null);
  const counter = useRef(0);
  const current = useRef<number | null>(null);

  const matched = requested !== null && equals(confirmed, requested.target);

  useEffect(() => {
    if (!matched) return;
    current.current = null;
    setRequested(null);
  }, [matched]);

  useEffect(() => {
    if (!requested) return undefined;
    const timer = setTimeout(() => {
      if (current.current !== requested.id) return;
      current.current = null;
      setRequested(null);
      if (timeoutMessage) setTimedOut(timeoutMessage);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [requested, timeoutMs, timeoutMessage]);

  // A later change reported by Home Assistant makes an old failure irrelevant.
  useEffect(() => {
    setError(false);
    setTimedOut(null);
  }, [confirmed]);

  const failFor = useCallback((id: number) => {
    if (current.current !== id) return;
    current.current = null;
    setRequested(null);
    setError(true);
  }, []);

  const track = useCallback(
    (send: () => unknown) => {
      const id = current.current ?? counter.current;
      sendSafely(send, () => failFor(id));
    },
    [failFor]
  );

  const request = useCallback(
    (target: T, send?: () => unknown) => {
      if (ignoreWhilePending && current.current !== null) return;
      counter.current += 1;
      const id = counter.current;
      current.current = id;
      last.current = send ? { target, send } : { target };
      setError(false);
      setTimedOut(null);
      setRequested({ target, id });
      if (send) sendSafely(send, () => failFor(id));
    },
    [failFor, ignoreWhilePending]
  );

  const retry = useCallback(() => {
    const again = last.current;
    if (again) request(again.target, again.send);
  }, [request]);

  const pending = requested !== null && !matched;
  return {
    value: pending ? requested.target : confirmed,
    confirmed,
    pending,
    error,
    request,
    track,
    timedOut,
    retry,
  };
}

export interface ServiceActions {
  /** Key of the action waiting for Home Assistant's answer. */
  busy: string | null;
  /** Key of the last action that failed. */
  failed: string | null;
  run: (key: string, send: () => unknown) => void;
}

/**
 * Commands without a state to confirm (next track, remote keys, chosen content): busy until the
 * service call is acknowledged, failed when it is rejected.
 */
export function useServiceActions(): ServiceActions {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const run = useCallback((key: string, send: () => unknown) => {
    setFailed(null);
    setBusy(key);
    const done = () => setBusy((current) => (current === key ? null : current));
    try {
      Promise.resolve(send()).then(done, () => {
        done();
        setFailed(key);
      });
    } catch {
      done();
      setFailed(key);
    }
  }, []);
  return { busy, failed, run };
}

/** Current time, refreshed every `intervalMs` while enabled. */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}

/**
 * Leading and trailing throttle for slider calls (the legacy M3Slider sent one call per frame).
 * A value still waiting when the component unmounts is sent, so the last position is not lost.
 */
export function useThrottled<T>(send: (value: T) => void, waitMs = 150): (value: T) => void {
  const sendRef = useRef(send);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waiting = useRef<{ value: T } | null>(null);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const pending = waiting.current;
      waiting.current = null;
      if (pending) sendRef.current(pending.value);
    },
    []
  );

  return useCallback(
    (value: T) => {
      const now = Date.now();
      const remaining = waitMs - (now - last.current);
      if (remaining <= 0 && !timer.current) {
        last.current = now;
        sendRef.current(value);
        return;
      }
      waiting.current = { value };
      if (timer.current) return;
      timer.current = setTimeout(
        () => {
          timer.current = null;
          last.current = Date.now();
          const pending = waiting.current;
          waiting.current = null;
          if (pending) sendRef.current(pending.value);
        },
        Math.max(remaining, 0)
      );
    },
    [waitMs]
  );
}
