/**
 * Where the Casa 3D is in the history of the app (ADR-0014, R1). The house is a screen over the
 * launcher at `#/casa` (the editor of the plan will be `#/casa/piantina`), the way Sistema is at
 * `#/sistema`. What is open on top of it (the side bar, a sheet, a question) is part of the same
 * history: each one is an entry of its own, so the back button closes it first and the house
 * only after, and nothing is left behind when the house closes.
 *
 * The router is the declarative HashRouter and cannot hold the back button, so the state lives in
 * the entries themselves (`location.state.casa`): how many entries the house has put on the
 * history (`depth`), which overlay is open and whether the previous entry is the house itself.
 * Leaving takes all of them off at once (`navigate(-depth)`); a house opened by its address, with
 * nothing of ours below, is replaced by the launcher instead (`root`: the entry below the first
 * one we put is the house itself, opened by someone else, so after going back to it the launcher
 * takes its place).
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isRecord } from '@/validators/guards';

export const CASA_ROUTE = '/casa';
export const CASA_PLAN_ROUTE = '/casa/piantina';
const LAUNCHER_ROUTE = '/';

/** Everything that can be open on top of the house, one at a time. */
export type CasaOverlay = 'menu' | 'piani' | 'stanze' | 'qualita' | 'ricomincia';
const OVERLAYS: ReadonlySet<unknown> = new Set<CasaOverlay>([
  'menu',
  'piani',
  'stanze',
  'qualita',
  'ricomincia',
]);

export type CasaMode = 'esplora' | 'piantina';

interface CasaHistoryState {
  /** Entries the house has put on the history, up to the one on screen. */
  depth: number;
  overlay?: CasaOverlay;
  /** The previous entry is the house in Esplora (the plan was opened from it). */
  fromHouse?: boolean;
  /** The first entry of the house was not put by us (its address was opened): it is not left to the launcher by going back. */
  root?: boolean;
}

/** How long a leaving may take before «Esci» works again (the history never answered). */
const EXIT_TIMEOUT_MS = 1500;

/** True for the addresses of the house; a trailing slash does not matter. */
export function isCasaPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || LAUNCHER_ROUTE;
  return path === CASA_ROUTE || path === CASA_PLAN_ROUTE;
}

/** The state of the house in a history entry; an entry that was not made by it reads as depth 0. */
export function readCasaState(state: unknown): CasaHistoryState {
  const raw = isRecord(state) ? state.casa : undefined;
  if (!isRecord(raw)) return { depth: 0 };
  const depth =
    typeof raw.depth === 'number' && Number.isInteger(raw.depth) && raw.depth > 0 ? raw.depth : 0;
  const overlay = OVERLAYS.has(raw.overlay) ? (raw.overlay as CasaOverlay) : undefined;
  return {
    depth,
    ...(overlay ? { overlay } : {}),
    ...(raw.fromHouse === true ? { fromHouse: true } : {}),
    ...(raw.root === true ? { root: true } : {}),
  };
}

/** The state to give `navigate` when the house is opened from the launcher or from Sistema. */
export const casaOpenState = (): { casa: CasaHistoryState } => ({ casa: { depth: 1 } });

export interface CasaNav {
  mode: CasaMode;
  overlay: CasaOverlay | null;
  /** Opens an overlay (or replaces the one that is open: they never pile up). */
  showOverlay: (overlay: CasaOverlay) => void;
  /** Closes the overlay that is open: the back button does the same. */
  closeOverlay: () => void;
  /** Esplora, from the plan or from an overlay. */
  goExplore: () => void;
  /** The plan (R2 will draw on it). */
  goPlan: () => void;
  /** Leaves the house for the screen below it. */
  exit: () => void;
}

export function useCasaNav(): CasaNav {
  const location = useLocation();
  const navigate = useNavigate();
  const { depth, overlay, fromHouse, root } = readCasaState(location.state);
  const path = location.pathname;
  const mode: CasaMode = path.replace(/\/+$/, '') === CASA_PLAN_ROUTE ? 'piantina' : 'esplora';

  // Entries above an entry that is not ours (depth 0) lead back to the house, not to the launcher.
  const rooted = root === true || depth === 0;
  // A leaving in progress (the history has not answered yet): a second «Esci» does nothing.
  const leaving = useRef<'back' | 'then-launcher' | null>(null);
  const leavingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(leavingTimer.current), []);
  // Back on the entry that is the house itself, opened by its address: the launcher takes its place.
  useEffect(() => {
    if (leaving.current === 'then-launcher' && depth === 0) {
      clearTimeout(leavingTimer.current);
      leaving.current = null;
      navigate(LAUNCHER_ROUTE, { replace: true });
    }
  }, [depth, path, navigate]);

  const showOverlay = useCallback(
    (next: CasaOverlay) => {
      const state = {
        casa: {
          depth: overlay ? depth : depth + 1,
          overlay: next,
          fromHouse,
          ...(rooted ? { root: true } : {}),
        },
      };
      navigate(path, { state, replace: overlay !== undefined });
    },
    [navigate, path, depth, overlay, fromHouse, rooted]
  );

  const closeOverlay = useCallback(() => {
    if (overlay !== undefined) navigate(-1);
  }, [navigate, overlay]);

  const goExplore = useCallback(() => {
    if (mode === 'esplora') {
      if (overlay !== undefined) navigate(-1);
      return;
    }
    // From the plan: take off the entries that were put on top of the house, if the house is right below.
    const above = (overlay === undefined ? 0 : 1) + (fromHouse ? 1 : 0);
    if (fromHouse && above > 0) {
      navigate(-above);
      return;
    }
    // Nothing of ours is added or taken away: the entries below are the same.
    navigate(CASA_ROUTE, {
      replace: true,
      state: { casa: { depth, ...(rooted ? { root: true } : {}) } },
    });
  }, [navigate, mode, overlay, fromHouse, depth, rooted]);

  const goPlan = useCallback(() => {
    if (mode === 'piantina') {
      if (overlay !== undefined) navigate(-1);
      return;
    }
    // From an overlay the entry is replaced, so the plan sits right above the house.
    const state = {
      casa: {
        depth: overlay ? depth : depth + 1,
        fromHouse: true,
        ...(rooted ? { root: true } : {}),
      },
    };
    navigate(CASA_PLAN_ROUTE, { state, replace: overlay !== undefined });
  }, [navigate, mode, overlay, depth, rooted]);

  const exit = useCallback(() => {
    if (leaving.current) return;
    if (depth === 0) {
      // Nothing of ours below: the house is replaced by the launcher.
      navigate(LAUNCHER_ROUTE, { replace: true });
      return;
    }
    leaving.current = root === true ? 'then-launcher' : 'back';
    clearTimeout(leavingTimer.current);
    leavingTimer.current = setTimeout(() => {
      leaving.current = null;
    }, EXIT_TIMEOUT_MS);
    navigate(-depth);
  }, [navigate, depth, root]);

  return useMemo(
    () => ({
      mode,
      overlay: overlay ?? null,
      showOverlay,
      closeOverlay,
      goExplore,
      goPlan,
      exit,
    }),
    [mode, overlay, showOverlay, closeOverlay, goExplore, goPlan, exit]
  );
}
