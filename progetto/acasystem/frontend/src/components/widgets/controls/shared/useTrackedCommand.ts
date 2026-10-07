import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ServiceData } from '@/@types/ha';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { callSafely } from './service';
import { useRequestedState, type RequestedState } from './useRequestedState';
import { useThrottledSender } from './useThrottledSender';

export interface ServiceCall {
  domain: string;
  service: string;
  data: ServiceData;
}

export interface TrackedCommand<T> extends RequestedState<T> {
  /** Requests `value` and calls the service once; the value stays requested until confirmed. */
  run: (value: T, domain: string, service: string, data: ServiceData) => void;
}

const same = <T>(a: T, b: T) => Object.is(a, b);

/** One Home Assistant command whose effect is visible in the entity (requested → confirmed). */
export function useTrackedCommand<T>(
  confirmed: T,
  matches: (requested: T, confirmed: T) => boolean = same,
  timeoutMs?: number
): TrackedCommand<T> {
  const runtime = useWidgetRuntime();
  const state = useRequestedState<T>({ confirmed, matches, timeoutMs });
  const { request, track, settle } = state;
  const run = useCallback(
    (value: T, domain: string, service: string, data: ServiceData) => {
      request(value);
      track(callSafely(runtime, domain, service, data));
      settle();
    },
    [request, runtime, settle, track]
  );
  return useMemo(() => ({ ...state, run }), [run, state]);
}

export interface ValueCommand extends RequestedState<number> {
  /** Requests the value at once; the service call follows the command's pacing. */
  set: (value: number) => void;
}

/** A numeric command driven by a slider: throttled sends plus the final one, then confirmation. */
export function useThrottledCommand(
  confirmed: number,
  matches: (requested: number, confirmed: number) => boolean,
  toCall: (value: number) => ServiceCall,
  timeoutMs?: number
): ValueCommand {
  const runtime = useWidgetRuntime();
  const state = useRequestedState<number>({ confirmed, matches, timeoutMs });
  const { request, track, settle } = state;
  const send = useCallback(
    (value: number) => {
      const call = toCall(value);
      track(callSafely(runtime, call.domain, call.service, call.data));
    },
    [runtime, toCall, track]
  );
  const sender = useThrottledSender(send);
  const set = useCallback(
    (value: number) => {
      request(value);
      sender.push(value);
      settle();
    },
    [request, sender, settle]
  );
  return useMemo(() => ({ ...state, set }), [set, state]);
}

/**
 * A numeric command sent only once the value stops changing (`delayMs` of quiet), for motors
 * that should not chase every step of a slider (cover position and tilt, legacy 200 ms).
 */
export function useDebouncedCommand(
  confirmed: number,
  matches: (requested: number, confirmed: number) => boolean,
  toCall: (value: number) => ServiceCall,
  { delayMs = 200, timeoutMs }: { delayMs?: number; timeoutMs?: number } = {}
): ValueCommand {
  const runtime = useWidgetRuntime();
  const state = useRequestedState<number>({ confirmed, matches, timeoutMs });
  const { request, track, settle } = state;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toCallRef = useRef(toCall);
  useEffect(() => {
    toCallRef.current = toCall;
  });
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );
  const set = useCallback(
    (value: number) => {
      request(value);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        const call = toCallRef.current(value);
        track(callSafely(runtime, call.domain, call.service, call.data));
        settle();
      }, delayMs);
    },
    [delayMs, request, runtime, settle, track]
  );
  return useMemo(() => ({ ...state, set }), [set, state]);
}
