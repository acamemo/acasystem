import { useEffect, useId, useState } from 'react';

/** useId without the colons React adds, so the value works in CSS selectors and ARIA lists. */
export function useDomId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * Keeps the content of a sheet mounted while it slides away, then releases it.
 * The sheet itself stays mounted; only its body is dropped after the exit transition.
 */
export function usePresence(open: boolean, exitMs = 300): boolean {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [open, exitMs]);
  return open || mounted;
}
