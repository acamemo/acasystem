import { useCallback, useEffect, useRef, useState } from 'react';

/** HA did not confirm in time: the widget goes back to the confirmed value without an error. */
export const CONFIRM_TIMEOUT_MS = 10000;

export interface Requested<T> {
  /** Value to show: the requested one while waiting for HA, the confirmed one otherwise. */
  value: T;
  /** A command was sent and HA has not yet reported the requested value. */
  pending: boolean;
  /** The last command failed; the confirmed value is shown again. */
  error: boolean;
  /** Requested value while pending, undefined otherwise. */
  requested: T | undefined;
  /** Shows `value` as requested and runs `send`; a rejection turns into the error state. */
  request: (value: T, send: () => Promise<unknown>) => void;
  clearError: () => void;
}

interface RequestState<T> {
  value: T;
  status: 'pending' | 'error';
  token: number;
}

/**
 * «Requested vs confirmed» (design.md): the requested value is shown as pending until the
 * entity reports it, a failed call shows the error, a missing confirmation falls back silently.
 */
export function useRequested<T>(
  confirmed: T,
  matches: (confirmed: T, requested: T) => boolean = Object.is,
  timeoutMs: number = CONFIRM_TIMEOUT_MS
): Requested<T> {
  const [state, setState] = useState<RequestState<T> | null>(null);
  const tokenRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pendingValue = state?.status === 'pending' ? state.value : undefined;
  const isConfirmed = state?.status === 'pending' && matches(confirmed, state.value);

  useEffect(() => {
    if (isConfirmed) setState(null);
  }, [isConfirmed]);

  useEffect(() => {
    if (state?.status !== 'pending') return undefined;
    const token = state.token;
    const timer = setTimeout(() => {
      setState((current) => (current?.token === token ? null : current));
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [state, timeoutMs]);

  const request = useCallback((value: T, send: () => Promise<unknown>) => {
    tokenRef.current += 1;
    const token = tokenRef.current;
    setState({ value, status: 'pending', token });
    const fail = () => {
      if (!mountedRef.current) return;
      setState((current) =>
        current?.token === token ? { value, status: 'error', token } : current
      );
    };
    try {
      Promise.resolve(send()).catch(fail);
    } catch {
      fail();
    }
  }, []);

  const clearError = useCallback(() => {
    setState((current) => (current?.status === 'error' ? null : current));
  }, []);

  const pending = state?.status === 'pending' && !isConfirmed;
  return {
    value: pending && pendingValue !== undefined ? pendingValue : confirmed,
    pending,
    error: state?.status === 'error',
    requested: pending ? pendingValue : undefined,
    request,
    clearError,
  };
}

/** Temperatures and other decimals: equal within a hundredth. */
export const sameNumber = (a: number | null, b: number | null): boolean =>
  a !== null && b !== null && Math.abs(a - b) < 0.01;
