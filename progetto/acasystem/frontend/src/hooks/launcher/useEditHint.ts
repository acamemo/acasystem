import { useCallback, useEffect, useRef, useState } from 'react';

/** Remembers on this device that the hint was shown (it appears once, ADR-0016, C3). */
export const EDIT_HINT_KEY = 'aca_edit_hint_seen';
/** The launcher waits this long after it opens before it says how to edit. */
export const EDIT_HINT_DELAY_MS = 1500;
/** The hint leaves by itself after this long if nobody closes it. */
export const EDIT_HINT_MS = 12000;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** True when the hint was already shown on this device. */
export function editHintSeen(): boolean {
  try {
    return storage()?.getItem(EDIT_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberEditHint() {
  try {
    storage()?.setItem(EDIT_HINT_KEY, '1');
  } catch {
    // Storage blocked: the hint may come again at the next start, which does no harm.
  }
}

/**
 * The first-time hint on how to edit («Tieni premuto uno spazio vuoto…», ADR-0016, C3): shown once
 * per device, a moment after the launcher is in use (`enabled`), until it is closed, until edit mode
 * opens (`enabled` turns false) or for EDIT_HINT_MS. It is marked as seen when it appears, so a
 * hint that went away by itself does not come back.
 */
export function useEditHint(enabled: boolean): { shown: boolean; dismiss: () => void } {
  const [shown, setShown] = useState(false);
  const shownOnce = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setShown(false);
      return undefined;
    }
    if (shownOnce.current || editHintSeen()) return undefined;
    const start = setTimeout(() => {
      shownOnce.current = true;
      rememberEditHint();
      setShown(true);
    }, EDIT_HINT_DELAY_MS);
    return () => clearTimeout(start);
  }, [enabled]);

  useEffect(() => {
    if (!shown) return undefined;
    const end = setTimeout(() => setShown(false), EDIT_HINT_MS);
    return () => clearTimeout(end);
  }, [shown]);

  const dismiss = useCallback(() => setShown(false), []);
  return { shown, dismiss };
}
