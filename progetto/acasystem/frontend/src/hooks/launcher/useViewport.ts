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

/** Device class of the current viewport (phone, tablet portrait, tablet). */
export function useDeviceClass(): DeviceClass {
  const { width, height } = useViewportSize();
  return deviceClassFor(width, height);
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
