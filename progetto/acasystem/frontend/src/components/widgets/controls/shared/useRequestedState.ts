import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COMMAND_LABELS } from './labels';

/** Time Home Assistant has to confirm a command before the widget reports it. */
export const CONFIRM_TIMEOUT_MS = 10_000;
/** How long an error or a missing confirmation stays visible. */
export const FAILURE_MESSAGE_MS = 6_000;

export type RequestStatus = 'idle' | 'pending' | 'error' | 'timeout';

export interface RequestedState<T> {
  /** Value to show: the requested one while pending, the confirmed one otherwise. */
  value: T;
  status: RequestStatus;
  pending: boolean;
  /** The last command failed or was never confirmed: the confirmed value is shown again. */
  failed: boolean;
  /** Text for the failure, or null. */
  message: string | null;
  /** Starts or updates a request: the display switches to the requested value at once. */
  request: (value: T) => void;
  /** Watches a service call: a rejection turns the request into an error. */
  track: (call: Promise<unknown>) => void;
  /** The last command of the request has been sent: waits for confirmation (with timeout). */
  settle: () => void;
  /** Keeps the request open while a gesture is still running. */
  hold: (holding: boolean) => void;
  /** Drops the request and any message. */
  clear: () => void;
}

interface Options<T> {
  /** Value confirmed by Home Assistant; memoize it, it is an effect dependency. */
  confirmed: T;
  /** True when the confirmed value satisfies the request; keep it stable. */
  matches: (requested: T, confirmed: T) => boolean;
  timeoutMs?: number;
  messageMs?: number;
}

interface State<T> {
  requested: { value: T } | null;
  status: RequestStatus;
}

/**
 * «Requested vs confirmed» (design.md): the widget shows the requested value with a pending
 * state until Home Assistant reports it; an error or a missing confirmation shows the
 * confirmed value again with a message, so a failure never looks like a success.
 */
export function useRequestedState<T>({
  confirmed,
  matches,
  timeoutMs = CONFIRM_TIMEOUT_MS,
  messageMs = FAILURE_MESSAGE_MS,
}: Options<T>): RequestedState<T> {
  const [state, setState] = useState<State<T>>({ requested: null, status: 'idle' });
  const holding = useRef(false);
  const generation = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ state, confirmed, matches });

  useEffect(() => {
    latest.current = { state, confirmed, matches };
  });

  const stopTimers = useCallback(() => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    if (messageTimer.current !== null) clearTimeout(messageTimer.current);
    timeout.current = null;
    messageTimer.current = null;
  }, []);

  useEffect(() => stopTimers, [stopTimers]);

  const finishWith = useCallback(
    (status: 'error' | 'timeout') => {
      stopTimers();
      setState({ requested: null, status });
      messageTimer.current = setTimeout(() => {
        messageTimer.current = null;
        setState((current) =>
          current.status === status ? { requested: null, status: 'idle' } : current
        );
      }, messageMs);
    },
    [messageMs, stopTimers]
  );

  const request = useCallback(
    (value: T) => {
      generation.current += 1;
      stopTimers();
      setState({ requested: { value }, status: 'pending' });
    },
    [stopTimers]
  );

  const track = useCallback(
    (call: Promise<unknown>) => {
      const current = generation.current;
      call.catch(() => {
        if (current === generation.current) finishWith('error');
      });
    },
    [finishWith]
  );

  /** Confirms at once when Home Assistant already reports the requested value. */
  const recheck = useCallback(() => {
    setState((current) => {
      if (current.status !== 'pending' || !current.requested || holding.current) return current;
      const { confirmed: now, matches: same } = latest.current;
      if (!same(current.requested.value, now)) return current;
      if (timeout.current !== null) clearTimeout(timeout.current);
      timeout.current = null;
      return { requested: null, status: 'idle' };
    });
  }, []);

  const settle = useCallback(() => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    const current = generation.current;
    timeout.current = setTimeout(() => {
      timeout.current = null;
      if (current === generation.current && latest.current.state.status === 'pending') {
        finishWith('timeout');
      }
    }, timeoutMs);
    recheck();
  }, [finishWith, recheck, timeoutMs]);

  const hold = useCallback(
    (value: boolean) => {
      holding.current = value;
      if (!value) recheck();
    },
    [recheck]
  );

  const clear = useCallback(() => {
    generation.current += 1;
    stopTimers();
    setState({ requested: null, status: 'idle' });
  }, [stopTimers]);

  // Confirmation: Home Assistant now reports what was requested.
  useEffect(() => {
    if (state.status !== 'pending' || !state.requested || holding.current) return;
    if (!matches(state.requested.value, confirmed)) return;
    stopTimers();
    setState({ requested: null, status: 'idle' });
  }, [confirmed, matches, state, stopTimers]);

  const pending = state.status === 'pending';
  const value = pending && state.requested ? state.requested.value : confirmed;
  const failed = state.status === 'error' || state.status === 'timeout';
  const message =
    state.status === 'error'
      ? COMMAND_LABELS.error
      : state.status === 'timeout'
        ? COMMAND_LABELS.timeout
        : null;

  return useMemo(
    () => ({
      value,
      status: state.status,
      pending,
      failed,
      message,
      request,
      track,
      settle,
      hold,
      clear,
    }),
    [value, state.status, pending, failed, message, request, track, settle, hold, clear]
  );
}
