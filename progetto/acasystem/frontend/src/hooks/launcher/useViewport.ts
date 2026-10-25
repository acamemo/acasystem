import { useEffect, useState } from 'react';
import type { DeviceClass } from '@/@types/launcher';
import { deviceClassFor } from '@/utils/launcher/deviceClass';

interface ViewportSize {
  width: number;
  height: number;
}

const readViewport = (): ViewportSize => ({
  width: globalThis.window?.innerWidth ?? 1280,
  height: globalThis.window?.innerHeight ?? 800,
});

/** Viewport size, updated on resize and orientation change. */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState(readViewport);
  useEffect(() => {
    const update = () => {
      const next = readViewport();
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };
    globalThis.window?.addEventListener('resize', update);
    globalThis.window?.addEventListener('orientationchange', update);
    return () => {
      globalThis.window?.removeEventListener('resize', update);
      globalThis.window?.removeEventListener('orientationchange', update);
    };
  }, []);
  return size;
}

/** True for a field that opens the on-screen keyboard. */
function isTextField(element: EventTarget | null | undefined): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable || element instanceof HTMLTextAreaElement) return true;
  return (
    element instanceof HTMLInputElement &&
    !['button', 'checkbox', 'color', 'file', 'radio', 'range', 'reset', 'submit'].includes(
      element.type
    )
  );
}

/** True while a text field has the focus (the on-screen keyboard may be up). */
function useTextFocus(): boolean {
  const [typing, setTyping] = useState(() => isTextField(globalThis.document?.activeElement));
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => setTyping(isTextField(event.target));
    // Leaving a field for another one keeps the keyboard up.
    const onFocusOut = (event: FocusEvent) => setTyping(isTextField(event.relatedTarget));
    globalThis.window?.addEventListener('focusin', onFocusIn);
    globalThis.window?.addEventListener('focusout', onFocusOut);
    return () => {
      globalThis.window?.removeEventListener('focusin', onFocusIn);
      globalThis.window?.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  return typing;
}

/**
 * Device class of the current viewport (phone, tablet portrait, tablet). While a text field has
 * the focus the class stays as it was (REP-20261008-001): the on-screen keyboard can shrink the
 * viewport, and a new class would at once store new placements for it.
 */
export function useDeviceClass(): DeviceClass {
  const { width, height } = useViewportSize();
  const measured = deviceClassFor(width, height);
  const typing = useTextFocus();
  const [kept, setKept] = useState(measured);
  if (!typing && kept !== measured) setKept(measured);
  return typing ? kept : measured;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** True when the person asked the system for reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => globalThis.window?.matchMedia?.(REDUCED_MOTION).matches ?? false
  );
  useEffect(() => {
    const query = globalThis.window?.matchMedia?.(REDUCED_MOTION);
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}
