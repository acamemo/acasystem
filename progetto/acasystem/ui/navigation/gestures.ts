/**
 * Timings of the launcher gestures (REP-20261008-001), one place for all of them: the long
 * press that opens the page editor (on the empty part of a page; a widget in use takes none, except
 * on its body in a page with no empty part, ADR-0016), and the movement it tolerates. In edit mode a tap selects a widget and a second
 * tap on the selected one opens its settings, with no time limit between them (ADR-0016, G5).
 */

/** Press and hold before a widget lifts (edit mode) or the page editor opens (U1). */
export const LONG_PRESS_MS = 500;
/** Movement allowed while holding: beyond it the press is a swipe (the page scrolls). */
export const HOLD_TOLERANCE_PX = 14;

/** A short vibration where supported (Android); ignored elsewhere. */
export function vibrate(ms: number) {
  try {
    globalThis.navigator?.vibrate?.(ms);
  } catch {
    // Vibration is optional.
  }
}

/**
 * Keeps the browser from scrolling under a finger that has just long-pressed a widget, so the
 * same finger can drag it (REP-20261021-003, «Pressione lunga e trascinamento nello stesso
 * tocco»). Called at the moment the long press fires, never before: until then the page scrolls
 * and the commands keep the touch. A touch that goes on from a still press is still cancelable
 * at its first move, so a non-passive touchmove that cancels it keeps the touch (no scroll, no
 * pointercancel). It is registered here and now, not by a React effect, and also on the element
 * pressed: touch events follow that element even when edit mode redraws it away, and then they
 * never reach the window. It ends with the touch (touchend, touchcancel, pointerup,
 * pointercancel) or at the next press, so it never outlives the gesture.
 */
export function holdTouchOnPage(press: {
  target: EventTarget | null;
  pointerId: number;
  pointerType: string;
}): void {
  const win = globalThis.window;
  // A mouse has no touch events to cancel.
  if (!win || press.pointerType === 'mouse') return;
  const targets: EventTarget[] = [win];
  if (press.target instanceof Node && press.target.isConnected) targets.push(press.target);

  const block = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  const release = () => {
    for (const target of targets) {
      target.removeEventListener('touchmove', block);
      target.removeEventListener('touchend', onTouchEnd);
      target.removeEventListener('touchcancel', onTouchEnd);
    }
    win.removeEventListener('pointerup', onPointerEnd, true);
    win.removeEventListener('pointercancel', onPointerEnd, true);
    win.removeEventListener('pointerdown', onNewPress, true);
  };
  // A second finger lifting does not end the touch of the first.
  function onTouchEnd(event: Event) {
    if (((event as TouchEvent).touches?.length ?? 0) === 0) release();
  }
  function onPointerEnd(event: Event) {
    if ((event as PointerEvent).pointerId === press.pointerId) release();
  }
  function onNewPress(event: Event) {
    if ((event as PointerEvent).pointerId !== press.pointerId) release();
  }
  for (const target of targets) {
    target.addEventListener('touchmove', block, { passive: false });
    target.addEventListener('touchend', onTouchEnd);
    target.addEventListener('touchcancel', onTouchEnd);
  }
  win.addEventListener('pointerup', onPointerEnd, true);
  win.addEventListener('pointercancel', onPointerEnd, true);
  win.addEventListener('pointerdown', onNewPress, true);
}
