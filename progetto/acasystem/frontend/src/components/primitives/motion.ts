/**
 * What the choreography asks of the browser (REP-20261023-006, block 2). Elements that leave
 * (a sheet, a toast, a notice, Sistema) stay on screen for the time of their exit only where the
 * browser animates: jsdom and engines without the Web Animations API get no wait, as before.
 */

/** Two frames at 60 Hz: what a time cap adds to a transition, as in `afterNextFrame`. */
export const TWO_FRAMES_MS = 34;

/** True where transitions run (the Web Animations API is there); false in jsdom. */
export function canAnimate(): boolean {
  return (
    typeof document !== 'undefined' && typeof document.documentElement?.getAnimations === 'function'
  );
}

/** True when the person asked the system for reduced motion. */
export function prefersReducedMotion(): boolean {
  return globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * What a transition that has started may take beyond its time before the cap gives up on its end
 * (`afterTransition`, `fromRun`): 6 frames at 60 Hz. On a slow tablet the frames of an exit are
 * long, and the end of the transition comes later than its time (measured: 200 ms ending at
 * 215-264 ms from the start).
 */
export const SLOW_FRAMES_MS = 100;

export interface AfterTransitionOptions {
  /**
   * The cap counts from the start of the transition too (REP-20261023-006, 0.9.28, sheet that
   * closes): the first `transitionrun` of one of the properties, for the element itself, starts it
   * again for the time of the transition plus two frames and SLOW_FRAMES_MS. The transition of a
   * panel does not begin in the commit that asks for it but a restyle later, and its frames may be
   * long: a cap counted only from the commit ended the wait before the end of the exit. Without a
   * `transitionrun` (nothing starts) the cap is the usual one, from the call.
   */
  fromRun?: boolean;
}

/**
 * Waits for `done` as the choreography ends a scene (P1): the first of the `transitionend` or
 * `transitioncancel` of the element for one of `properties` (the element itself, not a
 * pseudo-element or a child), or a cap of `ms` plus two frames. Returns a function that cancels
 * both. Nothing waits for an event that may not come: no transition, no change of value, a page
 * in the background.
 */
export function afterTransition(
  element: Element | null,
  properties: readonly string[],
  ms: number,
  done: () => void,
  options: AfterTransitionOptions = {}
): () => void {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancel();
    done();
  };
  const own = (event: Event) => {
    const transition = event as TransitionEvent;
    return (
      event.target === element &&
      !transition.pseudoElement &&
      properties.includes(transition.propertyName)
    );
  };
  const onEnd = (event: Event) => {
    if (own(event)) finish();
  };
  let timer = setTimeout(finish, ms + TWO_FRAMES_MS);
  let ran = false;
  const onRun = (event: Event) => {
    if (ran || finished || !own(event)) return;
    ran = true;
    clearTimeout(timer);
    timer = setTimeout(finish, ms + TWO_FRAMES_MS + SLOW_FRAMES_MS);
  };
  element?.addEventListener('transitionend', onEnd);
  element?.addEventListener('transitioncancel', onEnd);
  if (options.fromRun) element?.addEventListener('transitionrun', onRun);
  function cancel() {
    clearTimeout(timer);
    element?.removeEventListener('transitionend', onEnd);
    element?.removeEventListener('transitioncancel', onEnd);
    element?.removeEventListener('transitionrun', onRun);
  }
  return () => {
    finished = true;
    cancel();
  };
}

/**
 * The same for a CSS animation (Sistema coming in is one: a layer that waits at its scale of rest
 * and has one raster, 0.9.28, tracing of 2026-10-24): the first of the `animationend` or
 * `animationcancel` of the element for one of `names`, or a cap of `ms` plus two frames. Returns
 * a function that cancels both.
 */
export function afterAnimation(
  element: Element | null,
  names: readonly string[],
  ms: number,
  done: () => void
): () => void {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancel();
    done();
  };
  const onEnd = (event: Event) => {
    const animation = event as AnimationEvent;
    if (
      event.target === element &&
      !animation.pseudoElement &&
      names.includes(animation.animationName)
    )
      finish();
  };
  const timer = setTimeout(finish, ms + TWO_FRAMES_MS);
  element?.addEventListener('animationend', onEnd);
  element?.addEventListener('animationcancel', onEnd);
  function cancel() {
    clearTimeout(timer);
    element?.removeEventListener('animationend', onEnd);
    element?.removeEventListener('animationcancel', onEnd);
  }
  return () => {
    finished = true;
    cancel();
  };
}
