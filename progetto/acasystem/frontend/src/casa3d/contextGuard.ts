/**
 * What the Casa 3D page does when the 3D drawing context is lost (ADR-0014, section 5, T5). The
 * browser may take the WebGL context away (memory pressure, a driver reset) and give it back some
 * time later. The view reports it; this reducer decides what the page shows:
 *
 * - lost: the still picture and a message at once; the view waits for the context to come back.
 * - back in time: the view goes on, with the camera where it was.
 * - not back after RESTORE_WAIT_MS: the view is made again, in Light (a new element, so a new context).
 * - lost again within REPEAT_WINDOW_MS of such a new view, or lost MAX_LOSSES times in that window
 *   (a context that keeps flapping), or a view that cannot be made: the still picture stays, with
 *   «Riprova» and the room list (phase `static`), until the user asks again.
 *
 * ADR-0014 says «seconda perdita entro 10 minuti: anteprima statica». A context that the browser
 * gave back within seconds is not a failure worth giving up on, so the rule counts the second loss
 * after a new view was needed, and the flapping, not every loss.
 *
 * Pure on purpose: the clock is passed in by the caller.
 */

/** How long the page waits for the browser to give the context back before it makes the view again. */
export const RESTORE_WAIT_MS = 5_000;
/** A loss closer than this to the last new view, or to the others counted, is not tried again by itself. */
export const REPEAT_WINDOW_MS = 10 * 60_000;
/** This many losses in the window, even if each one came back, end the tries. */
export const MAX_LOSSES = 5;

export type GuardPhase = 'ok' | 'lost' | 'static';

export interface GuardState {
  phase: GuardPhase;
  /** Changes whenever the view must be made again (a new element, a new context). */
  generation: number;
  /** Times of the recent losses. */
  losses: readonly number[];
  /** When the view was last made again because the context did not come back. */
  recreatedAt: number | null;
  /** After a loss the view is made again in Light, whatever the saved level; a new choice clears it. */
  forceLight: boolean;
  /** Why the page shows the still picture (phase `static`): lost again, none could be made, or another start error. */
  reason: 'lost' | 'failed' | 'error' | null;
}

export type GuardAction =
  | { type: 'lost'; at: number }
  | { type: 'restored' }
  | { type: 'timeout'; at: number }
  | { type: 'failed'; reason?: 'failed' | 'error' }
  | { type: 'retry' }
  | { type: 'choose' }
  | { type: 'released' };

export const initialGuard: GuardState = {
  phase: 'ok',
  generation: 0,
  losses: [],
  recreatedAt: null,
  forceLight: false,
  reason: null,
};

export function guardReducer(state: GuardState, action: GuardAction): GuardState {
  switch (action.type) {
    case 'lost': {
      const losses = [
        ...state.losses.filter((time) => action.at - time < REPEAT_WINDOW_MS),
        action.at,
      ];
      const lostAgain =
        state.recreatedAt !== null && action.at - state.recreatedAt < REPEAT_WINDOW_MS;
      return lostAgain || losses.length >= MAX_LOSSES
        ? { ...state, losses, phase: 'static', reason: 'lost' }
        : { ...state, losses, phase: 'lost' };
    }
    case 'restored':
      return state.phase === 'ok' ? state : { ...state, phase: 'ok', reason: null };
    case 'timeout':
      // still lost after the wait: make the view again, lighter
      return state.phase === 'lost'
        ? {
            ...state,
            phase: 'ok',
            generation: state.generation + 1,
            recreatedAt: action.at,
            forceLight: true,
          }
        : state;
    case 'failed':
      return { ...state, phase: 'static', reason: action.reason ?? 'failed' };
    case 'retry':
      return {
        ...state,
        phase: 'ok',
        generation: state.generation + 1,
        losses: [],
        recreatedAt: null,
        forceLight: true,
        reason: null,
      };
    case 'choose':
      return state.forceLight ? { ...state, forceLight: false } : state;
    case 'released':
      // the lost view was released while the page was away: the next one is a fresh element with a
      // working context, so there is nothing left to wait for (and it is not a new view to count)
      return state.phase === 'lost' ? { ...state, phase: 'ok' } : state;
  }
}
