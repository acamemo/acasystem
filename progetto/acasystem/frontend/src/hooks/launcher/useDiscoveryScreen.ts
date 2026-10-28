import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Remembers on this device that «Dispositivi trovati» was shown at the first opening of the app.
 * It is a flag of this browser, like the edit hint (`useEditHint`): the screen is not part of the
 * layout and has nothing to synchronise between devices; each tablet shows it once.
 */
export const DISCOVERY_SEEN_KEY = 'aca_discovery_seen';

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** True when the screen was already shown (and skipped or continued) on this device. */
export function discoverySeen(): boolean {
  try {
    return storage()?.getItem(DISCOVERY_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDiscoverySeen() {
  try {
    storage()?.setItem(DISCOVERY_SEEN_KEY, '1');
  } catch {
    // Storage blocked: the screen may come again at the next start, which does no harm.
  }
}

export interface DiscoveryScreenState {
  open: boolean;
  /** The screen opened by itself at the first opening (not from the types of «Aggiungi un widget»). */
  first: boolean;
  /** Opens it again, from the entry among the widget types. */
  show: () => void;
  /** Closes it, by «Salta», «Continua», the close button or Escape; it will not come by itself again. */
  close: () => void;
}

/**
 * When «Dispositivi trovati» shows (REP-20261028-003): once, at the first opening of the app on this
 * device, as soon as the launcher is ready (`ready`), for everyone, without the installer. Closing
 * it for any reason marks it as seen; the entry «Dispositivi trovati» of the widget types brings it
 * back whenever the person wants.
 */
export function useDiscoveryScreen(ready: boolean): DiscoveryScreenState {
  const [state, setState] = useState({ open: false, first: false });
  const shownOnce = useRef(false);

  useEffect(() => {
    if (!ready || shownOnce.current || discoverySeen()) return;
    shownOnce.current = true;
    setState({ open: true, first: true });
  }, [ready]);

  const show = useCallback(() => setState({ open: true, first: false }), []);
  const close = useCallback(() => {
    rememberDiscoverySeen();
    setState((previous) => ({ ...previous, open: false }));
  }, []);

  return { ...state, show, close };
}
