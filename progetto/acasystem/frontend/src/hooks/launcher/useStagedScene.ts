import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { afterNextFrame } from '@/utils/launcher/afterFrame';

/**
 * The movement of a scene starts after the block of its state change (REP-20261023-006, D-M25).
 * A CSS delay does not do it: the transitions are born in the same restyle as the commit, and a
 * block of 100-200 ms (REP-20261022-002) eats their delays and their first frames. So the state is
 * committed first, with what moves still at its old look, and the class of movement comes two
 * frames later: the first frame after the commit has drawn the block's result, the second one starts
 * the movement from a clean timeline (T0 of the scene).
 *
 * The end of the wait renders only what hangs on the scene (0.9.28, measurement of 2026-10-23). It
 * used to be a `setState` of the whole launcher committed with `flushSync` in the frame: the
 * pages, the bars and the grids were rendered again just to change a few classes, a task of
 * 94-149 ms inside the scene. Now the host (`useStagedScene`) keeps the wait as a value that only
 * says which wait it is, and the end is a signal outside React: the components that hang on the
 * scene (`useStaged`, `useHeld`) subscribe to it and render alone. A subscription to an external
 * store is rendered synchronously, in the microtask that follows the frame callback and before
 * the restyle of the frame, so no `flushSync` is needed.
 */

/** The end of the waits, outside React: which wait has ended, and who is told. */
interface StageSource {
  ended: object | null;
  subscribe: (listener: () => void) => () => void;
  end: (wait: object) => void;
}

function createSource(): StageSource {
  const listeners = new Set<() => void>();
  const source: StageSource = {
    ended: null,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    end: (wait) => {
      if (source.ended === wait) return;
      source.ended = wait;
      for (const listener of [...listeners]) listener();
    },
  };
  return source;
}

/** What the host passes to what hangs on the scene: the wait it is in (null: none) and its end. */
export interface Stage {
  readonly wait: object | null;
  readonly source: StageSource;
}

const PENDING: object = {};
const noSource = createSource();
/** A stage that never waits, for what is used with or without a scene. */
export const NO_STAGE: Stage = { wait: null, source: noSource };

/**
 * The host of a staged scene: true (through `useStaged`) from the commit in which `value` changed
 * until the second frame after it. With `enabled` false (nothing is measured, reduced motion)
 * there is no movement to protect and no wait. The host does not render again when the wait ends.
 *
 * With `stageClosing` false only the change to true waits: the change back to false (the end of
 * the pages view, «Fine») starts in the commit of the tap, as in the 0.9.27 (REP-20261023-006,
 * choice of the user of 2026-10-24, «Risposta più rapida»). The wait of the closing was a second
 * restyle of about 1700 elements, 325-383 ms after the tap, and delayed the first frame of the
 * closing from 175 to 315 ms.
 *
 * With `stageOpening` false the change to true does not wait either: the movement starts in the
 * commit of the change, as in the 0.9.27 (REP-20261023-006, choice of the user of 2026-10-25,
 * "Un tempo solo"). The opening had three tasks before the scene (the render at the threshold,
 * the commit and the end of the wait, which restyled 1161 elements for `data-quiet`); with this
 * one only the render stays. The price is the one accepted for «Fine»: less smooth first frames.
 */
export function useStagedScene(
  value: boolean,
  enabled: boolean,
  stageClosing = true,
  stageOpening = true
): Stage {
  const [source] = useState(createSource);
  const [seen, setSeen] = useState(value);
  // A new object for each change: a second change inside the wait starts it again.
  const [wait, setWait] = useState<object | null>(null);
  const changed = seen !== value;
  const waits = enabled && (value ? stageOpening : stageClosing);
  if (changed) {
    setSeen(value);
    setWait(waits ? {} : null);
  }
  useEffect(() => {
    if (!wait) return undefined;
    return afterNextFrame(() => source.end(wait));
  }, [wait, source]);
  // The pass that sees the change is repeated by React with the new wait before anything below
  // renders; this one only has to be a wait, whichever.
  const token = changed ? (waits ? PENDING : null) : wait;
  return useMemo<Stage>(() => ({ wait: token, source }), [token, source]);
}

/**
 * True while the stage is in a wait that has not ended: what hangs on the scene keeps its look.
 * Renders alone when the wait ends.
 */
export function useStaged(stage: Stage): boolean {
  const ended = useSyncExternalStore(
    stage.source.subscribe,
    () => stage.wait !== null && stage.source.ended === stage.wait
  );
  return stage.wait !== null && !ended;
}

/** The same, read at the moment it is asked (an event handler), without subscribing. */
export function isStaged(stage: Stage): boolean {
  return stage.wait !== null && stage.source.ended !== stage.wait;
}

const shallowEqual = (a: unknown, b: unknown) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.is(left[key], right[key]))
  );
};

/**
 * `value` as it was when the wait began: while `hold` is true what hangs on a staged scene (a bar,
 * the indicator) keeps the look it had, and takes the new one in the frame the scene starts, with
 * the delay of its own place in the sequence (edit.css, pageIndicator.css). Objects are compared
 * by their fields.
 */
export function useHeld<T>(value: T, hold: boolean): T {
  const [kept, setKept] = useState(value);
  if (!hold && !shallowEqual(kept, value)) setKept(value);
  return hold ? kept : value;
}
