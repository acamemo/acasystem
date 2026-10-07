import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceData } from '@/@types/ha';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CONFIRM_TIMEOUT_MS } from './useCommand';

export interface ValueCall {
  domain: string;
  service: string;
  data: ServiceData;
}

export interface RequestedValue {
  /** Value to show: the requested one while pending, the confirmed one otherwise. */
  value: number | null;
  /** A value was requested and Home Assistant has not reported it yet. */
  pending: boolean;
  /** The last request was rejected. */
  error: boolean;
  /** The last request was accepted but the device never reported it. */
  unconfirmed: boolean;
  /** Request a value; consecutive changes (dragging, repeated steps) send only the last one. */
  request: (value: number) => void;
}

/**
 * Requested vs confirmed for a numeric setting (target temperature, brightness, charge
 * limit): the slider shows the requested value with the pending style until the entity
 * reports it, within `tolerance`.
 */
export function useRequestedValue({
  confirmed,
  toCall,
  tolerance = 0.01,
  delay = 250,
}: {
  confirmed: number | null;
  toCall: (value: number) => ValueCall | null;
  tolerance?: number;
  delay?: number;
}): RequestedValue {
  const { callService } = useWidgetRuntime();
  const [requested, setRequested] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(0);
  const toCallRef = useRef(toCall);

  useEffect(() => {
    toCallRef.current = toCall;
  }, [toCall]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      tokenRef.current += 1;
    },
    []
  );

  const request = useCallback(
    (value: number) => {
      setRequested(value);
      setSent(false);
      setError(false);
      setUnconfirmed(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const call = toCallRef.current(value);
        if (!call) {
          setRequested(null);
          return;
        }
        tokenRef.current += 1;
        const token = tokenRef.current;
        setSent(true);
        let promise: Promise<unknown>;
        try {
          promise = Promise.resolve(callService(call.domain, call.service, call.data));
        } catch (reason) {
          promise = Promise.reject(reason);
        }
        promise.catch(() => {
          if (tokenRef.current !== token) return;
          setRequested(null);
          setSent(false);
          setError(true);
        });
      }, delay);
    },
    [callService, delay]
  );

  // Confirmed when Home Assistant reports the requested value.
  useEffect(() => {
    if (requested === null || confirmed === null) return;
    if (Math.abs(confirmed - requested) <= tolerance) {
      setRequested(null);
      setSent(false);
    }
  }, [confirmed, requested, tolerance]);

  // Not confirmed in time: show the confirmed value again and say so.
  useEffect(() => {
    if (!sent || requested === null) return undefined;
    const timer = setTimeout(() => {
      setRequested(null);
      setSent(false);
      setUnconfirmed(true);
    }, CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [sent, requested]);

  return {
    value: requested ?? confirmed,
    pending: requested !== null,
    error,
    unconfirmed,
    request,
  };
}
