import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DeviceErrorInfo,
  EntryDto,
  FlowAbortDto,
  FlowCreatedDto,
  FlowExternalDto,
  FlowFormDto,
  FlowMenuDto,
  FlowProgressDto,
  FlowResponseDto,
  StatusDto,
} from '@/@types/devices';
import {
  addDiscovered,
  cancelFlow,
  getEntry,
  getFlow,
  getStatus,
  isAbortError,
  listFlows,
  startFlow,
  stepFlow,
  toDeviceError,
} from '@/api/devicesApi';
import type { DeviceFamily } from '@/utils/devices/classify';
import { deviceTexts, RECOMMENDED_HANDLERS } from './deviceTexts';

/**
 * The state of «Aggiungi un dispositivo» up to the entry being created (D1c). The server keeps
 * the flow; this hook asks for one step at a time, shows what the server returns and cleans up:
 * a flow that is left (Esci, the sheet closing) is cancelled, unless a call is still open, in
 * which case the server expires it after ten minutes.
 *
 * The steps the server describes are drawn: form, menu, progress (the flow is read every few
 * seconds until it moves) and external (a page of the maker opens, the flow is read until the
 * person is back). A type this version does not know cancels the flow with a plain message.
 * Nothing is stored in the browser; the address the person types stays in memory (`typedHost`)
 * for the power-on step.
 */

/** What the person is adding: the TV of the catalogue (D1), or the family of a discovered device. */
export type DeviceKind = DeviceFamily;

export type FlowPhase =
  | 'checking'
  | 'unavailable'
  | 'resume'
  | 'catalog'
  | 'form'
  | 'menu'
  | 'progress'
  | 'external'
  | 'blocked'
  | 'aborted'
  | 'created'
  | 'failed';

export interface FlowFailure {
  error: DeviceErrorInfo;
  /** Where the person was when the call failed: «Riprova» goes back there. */
  back: FlowPhase;
  /** The same call can be repeated (timeout, no network). */
  canRetry: boolean;
  /** The flow is gone: only a new start makes sense. */
  canRestart: boolean;
}

export interface DeviceFlowState {
  phase: FlowPhase;
  status: StatusDto | null;
  /** A call to the server is open. */
  busy: boolean;
  /** Text for `unavailable` and `blocked`. */
  message: string | null;
  form: FlowFormDto | null;
  /** The step of phases `menu`, `progress` and `external`. */
  step: FlowMenuDto | FlowProgressDto | FlowExternalDto | null;
  /** The last answer was refused but the flow is still open: shown on the form. */
  formError: DeviceErrorInfo | null;
  /** The flow found open: `conflict` when it was the start that found it. */
  openFlow: { flowId: string; conflict: boolean } | null;
  abort: FlowAbortDto | null;
  created: FlowCreatedDto | null;
  failure: FlowFailure | null;
}

const INITIAL: DeviceFlowState = {
  phase: 'checking',
  status: null,
  busy: false,
  message: null,
  form: null,
  step: null,
  formError: null,
  openFlow: null,
  abort: null,
  created: null,
  failure: null,
};

/** How often the flow is read while a progress or an external step waits. */
export const FLOW_POLL_MS = 2500;
/** Failed reads in a row after which the wait is given up. */
const POLL_FAILURES = 3;

/** Errors of an answer that leave the flow open and the form on screen. */
const STAYS_ON_FORM = new Set(['INVALID_INPUT', 'FLOW_BUSY', 'RATE_LIMITED']);
/** Errors after which the flow no longer exists, in the server or in Home Assistant. */
const FLOW_GONE = new Set(['FLOW_NOT_FOUND', 'FLOW_EXPIRED', 'UNSUPPORTED_STEP']);

export interface DeviceFlow {
  state: DeviceFlowState;
  /** The address typed in the first step, kept in memory for the power-on step. */
  typedHost: () => string | null;
  start: (handler: string) => void;
  answer: (input: Record<string, unknown>) => void;
  resume: () => void;
  discardOpen: () => void;
  retry: () => void;
  restart: () => void;
  /** Cancels the open flow, if any, then calls `onExit`. */
  exit: () => void;
  refreshEntry: () => void;
}

export function useDeviceFlow(
  kind: DeviceKind,
  onExit: () => void,
  /** A flow Home Assistant opened by itself: taken over instead of starting from the catalogue. */
  discoveredFlowId: string | null = null
): DeviceFlow {
  const [state, setState] = useState<DeviceFlowState>(INITIAL);
  const flowIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const hostRef = useRef<string | null>(null);
  const lastAttemptRef = useRef<(() => void) | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const patch = useCallback((changes: Partial<DeviceFlowState>) => {
    if (mountedRef.current) setState((previous) => ({ ...previous, ...changes }));
  }, []);

  /** Best effort: a flow that is already gone (404) or an unreachable server is not an error. */
  const cancelQuietly = useCallback(
    (flowId: string) => cancelFlow(flowId).catch(() => undefined),
    []
  );

  const settle = useCallback(
    (response: FlowResponseDto) => {
      const none = { busy: false, formError: null, failure: null, openFlow: null };
      switch (response.type) {
        case 'form':
          flowIdRef.current = response.flowId;
          patch({ ...none, phase: 'form', form: response, step: null });
          return;
        case 'menu':
        case 'progress':
        case 'external':
          flowIdRef.current = response.flowId;
          patch({ ...none, phase: response.type, step: response, form: null });
          return;
        case 'abort':
          flowIdRef.current = null;
          patch({ ...none, phase: 'aborted', abort: response, form: null, step: null });
          return;
        case 'create_entry':
          flowIdRef.current = null;
          patch({ ...none, phase: 'created', created: response, form: null, step: null });
          return;
        default: {
          // A type this version does not know: not guessed.
          const unknown = response as { flowId?: unknown };
          const flowId = typeof unknown.flowId === 'string' ? unknown.flowId : flowIdRef.current;
          flowIdRef.current = null;
          if (flowId) void cancelQuietly(flowId);
          patch({
            ...none,
            phase: 'blocked',
            message: deviceTexts.unsupportedStep,
            form: null,
            step: null,
          });
        }
      }
    },
    [cancelQuietly, patch]
  );

  const fail = useCallback(
    (error: DeviceErrorInfo, context: 'start' | 'step' | 'read') => {
      const code = error.code ?? '';
      if (code === 'FLOW_ALREADY_OPEN' && error.flowId) {
        patch({
          busy: false,
          phase: 'resume',
          openFlow: { flowId: error.flowId, conflict: true },
          failure: null,
        });
        return;
      }
      if (FLOW_GONE.has(code)) flowIdRef.current = null;
      if (context === 'step' && STAYS_ON_FORM.has(code)) {
        patch({ busy: false, formError: error });
        return;
      }
      if (!mountedRef.current) return;
      setState((previous) => ({
        ...previous,
        busy: false,
        phase: 'failed',
        failure: {
          error,
          back:
            previous.phase === 'failed' ? (previous.failure?.back ?? 'catalog') : previous.phase,
          canRetry: !FLOW_GONE.has(code) && (error.status === 0 || code === 'HA_TIMEOUT'),
          canRestart: code === 'FLOW_NOT_FOUND' || code === 'FLOW_EXPIRED',
        },
      }));
    },
    [patch]
  );

  /** Runs a call that returns a step; `again` is what «Riprova» repeats. */
  const run = useCallback(
    (
      context: 'start' | 'step' | 'read',
      call: (signal: AbortSignal) => Promise<FlowResponseDto>,
      again: () => void
    ) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      lastAttemptRef.current = again;
      const controller = new AbortController();
      abortRef.current = controller;
      patch({ busy: true, formError: null });
      call(controller.signal)
        .then((response) => {
          if (mountedRef.current) settle(response);
        })
        .catch((error: unknown) => {
          if (!mountedRef.current || isAbortError(error)) return;
          fail(toDeviceError(error), context);
        })
        .finally(() => {
          inFlightRef.current = false;
          if (abortRef.current === controller) abortRef.current = null;
        });
    },
    [fail, patch, settle]
  );

  // Opening: is the service there, and is a flow of this kind already open?
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    const handlers = RECOMMENDED_HANDLERS[kind] ?? [];
    void (async () => {
      try {
        const status = await getStatus();
        if (cancelled) return;
        if (!status.features.flows) {
          const message =
            status.service.message ??
            (status.homeAssistant.reachable
              ? deviceTexts.featureUnavailable
              : deviceTexts.haUnreachable);
          setState((previous) => ({ ...previous, status, phase: 'unavailable', message }));
          return;
        }
        // A discovered device goes straight to its flow: no catalogue, no resume.
        if (discoveredFlowId) {
          setState((previous) => ({ ...previous, status }));
          return;
        }
        let open: { flowId: string } | null = null;
        try {
          const flows = await listFlows();
          open = flows.find((flow) => handlers.includes(flow.handler)) ?? null;
        } catch {
          // The list is a convenience: without it the person starts from the catalogue.
        }
        if (cancelled) return;
        setState((previous) => ({
          ...previous,
          status,
          phase: open ? 'resume' : 'catalog',
          openFlow: open ? { flowId: open.flowId, conflict: false } : null,
        }));
      } catch (error) {
        if (cancelled) return;
        setState((previous) => ({
          ...previous,
          phase: 'unavailable',
          message: toDeviceError(error).message,
        }));
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      const flowId = flowIdRef.current;
      // A call still open is left to the server, which expires the flow; cancelling now would
      // only race with it.
      if (flowId && !inFlightRef.current) void cancelFlow(flowId).catch(() => undefined);
      abortRef.current?.abort();
    };
  }, [kind, discoveredFlowId]);

  const start = useCallback(
    (handler: string) =>
      run(
        'start',
        () => startFlow(handler),
        () => start(handler)
      ),
    [run]
  );

  const answer = useCallback(
    (input: Record<string, unknown>) => {
      const flowId = flowIdRef.current;
      if (!flowId) return;
      if (typeof input.host === 'string') hostRef.current = input.host.trim();
      run(
        'step',
        (signal) => stepFlow(flowId, input, signal),
        () => answer(input)
      );
    },
    [run]
  );

  const resume = useCallback(() => {
    const open = state.openFlow;
    if (!open) return;
    run('read', () => getFlow(open.flowId), resume);
  }, [run, state.openFlow]);

  const restart = useCallback(() => {
    // A discovered device has no catalogue to go back to: starting again means leaving.
    if (discoveredFlowId) {
      onExitRef.current();
      return;
    }
    lastAttemptRef.current = null;
    setState((previous) => ({
      ...previous,
      phase: 'catalog',
      busy: false,
      form: null,
      step: null,
      formError: null,
      failure: null,
      abort: null,
      message: null,
      openFlow: null,
    }));
  }, [discoveredFlowId]);

  const discardOpen = useCallback(() => {
    const open = state.openFlow;
    if (!open || inFlightRef.current) return;
    inFlightRef.current = true;
    patch({ busy: true });
    cancelFlow(open.flowId)
      .catch(() => undefined)
      .finally(() => {
        inFlightRef.current = false;
        if (flowIdRef.current === open.flowId) flowIdRef.current = null;
        if (mountedRef.current) restart();
      });
  }, [patch, restart, state.openFlow]);

  const retry = useCallback(() => {
    const again = lastAttemptRef.current;
    if (!again) return;
    setState((previous) =>
      previous.failure ? { ...previous, phase: previous.failure.back, failure: null } : previous
    );
    again();
  }, []);

  const exit = useCallback(() => {
    if (inFlightRef.current) return;
    const flowId = flowIdRef.current;
    flowIdRef.current = null;
    if (!flowId) {
      onExitRef.current();
      return;
    }
    inFlightRef.current = true;
    void cancelQuietly(flowId).finally(() => {
      inFlightRef.current = false;
      onExitRef.current();
    });
  }, [cancelQuietly]);

  const refreshEntry = useCallback(() => {
    const created = state.created;
    if (!created || inFlightRef.current) return;
    inFlightRef.current = true;
    patch({ busy: true });
    getEntry(created.entryId)
      .then((entry: EntryDto) => {
        if (!mountedRef.current) return;
        setState((previous) =>
          previous.created
            ? {
                ...previous,
                busy: false,
                created: { ...previous.created, entry, pending: !entry.loaded },
              }
            : previous
        );
      })
      .catch(() => patch({ busy: false }))
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [patch, state.created]);

  // The service answered: take the discovered flow over (one call; «Riprova» repeats it).
  const takeOver = useCallback(() => {
    if (!discoveredFlowId) return;
    run('start', (signal) => addDiscovered(discoveredFlowId, signal), takeOver);
  }, [discoveredFlowId, run]);
  const takenRef = useRef(false);
  useEffect(() => {
    if (!discoveredFlowId || !state.status || takenRef.current) return;
    takenRef.current = true;
    takeOver();
  }, [discoveredFlowId, state.status, takeOver]);

  // A progress or an external step: the flow is read every few seconds until HA moves on (the
  // task ended, or the person finished on the page of the maker). The same step again changes
  // nothing on screen; a few failed reads in a row end the wait.
  const waitingStepId = state.phase === 'progress' || state.phase === 'external' ? state.step?.stepId : null;
  useEffect(() => {
    if (!waitingStepId) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const schedule = () => {
      if (!cancelled) timer = setTimeout(() => void tick(), FLOW_POLL_MS);
    };
    const tick = async () => {
      const flowId = flowIdRef.current;
      if (cancelled || !flowId) return;
      // An answer or a cancellation is in flight: wait for the next round.
      if (inFlightRef.current) {
        schedule();
        return;
      }
      try {
        const response = await getFlow(flowId);
        if (cancelled || !mountedRef.current) return;
        failures = 0;
        const unchanged =
          (response.type === 'progress' || response.type === 'external') &&
          response.stepId === waitingStepId;
        if (!unchanged) {
          settle(response);
          return;
        }
      } catch (error) {
        if (cancelled || !mountedRef.current || isAbortError(error)) return;
        failures += 1;
        const info = toDeviceError(error);
        if (failures >= POLL_FAILURES || FLOW_GONE.has(info.code ?? '')) {
          fail(info, 'read');
          return;
        }
      }
      schedule();
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fail, settle, waitingStepId]);

  const typedHost = useCallback(() => hostRef.current, []);

  return useMemo(
    () => ({
      state,
      typedHost,
      start,
      answer,
      resume,
      discardOpen,
      retry,
      restart,
      exit,
      refreshEntry,
    }),
    [state, typedHost, start, answer, resume, discardOpen, retry, restart, exit, refreshEntry]
  );
}
