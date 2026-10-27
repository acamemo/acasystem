import { useCallback, useEffect, useRef } from 'react';

/** Steps asked by the travel and steps already sent: the queue drains at a fixed pace. */
export interface StepQueue {
  target: number;
  sent: number;
}

export const signedSteps = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/**
 * Queue of the step knobs (volume without a level, channel): the gesture sets `queue.target`, the
 * queue sends one `onStep(±1)` per `intervalMs`, the first at once, and a new gesture or an
 * unmount drops what is still queued.
 */
export function useStepQueue(onStep: (direction: 1 | -1) => void, intervalMs: number) {
  const queue = useRef<StepQueue>({ target: 0, sent: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    queue.current = { target: 0, sent: 0 };
  }, []);

  const drain = useCallback(() => {
    if (timer.current !== null) return;
    const state = queue.current;
    if (state.sent === state.target) return;
    const direction = state.target > state.sent ? 1 : -1;
    state.sent += direction;
    stepRef.current(direction);
    if (state.sent === state.target) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      drain();
    }, intervalMs);
  }, [intervalMs]);

  useEffect(() => clear, [clear]);

  return { queue, clear, drain };
}
