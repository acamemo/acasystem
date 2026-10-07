import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceData } from '@/@types/ha';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import type { MaybeEntity } from './entity';

/** How long a request may wait for Home Assistant to report the expected state. */
export const CONFIRM_TIMEOUT_MS = 30_000;

export interface CommandRequest {
  /** Identifies the control that issued the request (e.g. `start`, `dock`). */
  key: string;
  domain: string;
  service: string;
  data?: ServiceData;
  /**
   * True when the entity shows the requested state. Without it the request is confirmed as
   * soon as Home Assistant acknowledges the call (buttons, scripts, select options).
   */
  confirm?: (entity: MaybeEntity) => boolean;
}

interface PendingCommand {
  key: string;
  token: number;
  acknowledged: boolean;
  confirm?: (entity: MaybeEntity) => boolean;
}

export interface CommandState {
  /** Sends the service call and tracks it until it is confirmed, fails or times out. */
  run: (request: CommandRequest) => void;
  /** Key of the request waiting for confirmation (design.md: requested vs confirmed). */
  pendingKey: string | null;
  /** Key of the last request rejected by Home Assistant. */
  errorKey: string | null;
  /** Key of the last request that was accepted but never confirmed by the device. */
  unconfirmedKey: string | null;
  isPending: (key: string) => boolean;
  clear: () => void;
}

/**
 * Requested → confirmed tracking for the commands of one entity. The widget shows the
 * request as pending until the entity reaches the expected state; a rejected call becomes
 * an error, a call that is never confirmed becomes a notice, never a success.
 */
export function useCommand(entity: MaybeEntity): CommandState {
  const { callService } = useWidgetRuntime();
  const [pending, setPending] = useState<PendingCommand | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [unconfirmedKey, setUnconfirmedKey] = useState<string | null>(null);
  const tokenRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    (request: CommandRequest) => {
      tokenRef.current += 1;
      const token = tokenRef.current;
      setErrorKey(null);
      setUnconfirmedKey(null);
      setPending({ key: request.key, token, acknowledged: false, confirm: request.confirm });
      let promise: Promise<unknown>;
      try {
        promise = Promise.resolve(callService(request.domain, request.service, request.data));
      } catch (error) {
        promise = Promise.reject(error);
      }
      promise.then(
        () => {
          if (!mountedRef.current) return;
          setPending((current) => {
            if (!current || current.token !== token) return current;
            return current.confirm ? { ...current, acknowledged: true } : null;
          });
        },
        () => {
          if (!mountedRef.current) return;
          setPending((current) => (current && current.token === token ? null : current));
          if (tokenRef.current === token) setErrorKey(request.key);
        }
      );
    },
    [callService]
  );

  // Confirmed: the entity reports the requested state.
  useEffect(() => {
    if (pending?.confirm && pending.confirm(entity)) setPending(null);
  }, [entity, pending]);

  // Never confirmed: stop waiting and say so, without claiming success.
  const pendingToken = pending?.token ?? null;
  const pendingKey = pending?.key ?? null;
  useEffect(() => {
    if (pendingToken === null || pendingKey === null) return undefined;
    const timer = setTimeout(() => {
      setPending((current) => (current && current.token === pendingToken ? null : current));
      setUnconfirmedKey(pendingKey);
    }, CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pendingToken, pendingKey]);

  const isPending = useCallback((key: string) => pending?.key === key, [pending]);

  const clear = useCallback(() => {
    setErrorKey(null);
    setUnconfirmedKey(null);
  }, []);

  return {
    run,
    pendingKey,
    errorKey,
    unconfirmedKey,
    isPending,
    clear,
  };
}

/** Confirmation helper: the entity state is one of the given states. */
export function stateIn(...states: string[]): (entity: MaybeEntity) => boolean {
  const expected = new Set(states.map((state) => state.toLowerCase()));
  return (entity) => expected.has(String(entity?.state ?? '').toLowerCase());
}
