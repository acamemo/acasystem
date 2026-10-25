/**
 * Keeps the state of the 3D drawing context for the Casa 3D page (contextGuard.ts): what the view
 * reports goes in, the phase and the generation come out, and the wait for a lost context to come
 * back runs here.
 */
import { useCallback, useEffect, useReducer } from 'react';
import type { Casa3dContextEvent } from './contract';
import { guardReducer, initialGuard, RESTORE_WAIT_MS, type GuardState } from './contextGuard';

export interface Casa3dContextGuard {
  state: GuardState;
  /** Called with what the view reports. */
  report: (event: Casa3dContextEvent) => void;
  /** The user asks for the 3D view again. */
  retry: () => void;
  /** The user chose a level: the Light that followed a loss no longer applies. */
  choose: () => void;
  /** The view was released (its element removed): a loss still pending is over. */
  release: () => void;
}

/**
 * `active` is false while the page is away or being edited: a lost context is then not made again
 * (the typical loss is memory pressure while the user is elsewhere), the wait starts when the page
 * is back.
 */
export function useCasa3dContextGuard(
  waitMs: number = RESTORE_WAIT_MS,
  active = true
): Casa3dContextGuard {
  const [state, dispatch] = useReducer(guardReducer, initialGuard);

  useEffect(() => {
    if (state.phase !== 'lost' || !active) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'timeout', at: Date.now() }), waitMs);
    return () => clearTimeout(timer);
  }, [state.phase, state.losses, waitMs, active]);

  const report = useCallback((event: Casa3dContextEvent) => {
    if (event.state === 'lost') dispatch({ type: 'lost', at: Date.now() });
    else if (event.state === 'restored') dispatch({ type: 'restored' });
    else dispatch({ type: 'failed', reason: event.state === 'error' ? 'error' : 'failed' });
  }, []);
  const retry = useCallback(() => dispatch({ type: 'retry' }), []);
  const choose = useCallback(() => dispatch({ type: 'choose' }), []);
  const release = useCallback(() => dispatch({ type: 'released' }), []);

  return { state, report, retry, choose, release };
}
