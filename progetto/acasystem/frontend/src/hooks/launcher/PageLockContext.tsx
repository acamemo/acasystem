import { createContext, useContext, useEffect } from 'react';

/**
 * Lets a special page hold the pager still while it needs the swipe for itself (the Casa 3D page
 * in Esplora, ADR-0014). The launcher provides the function and feeds it into the `locked` prop
 * of the Pager, the same lock a dragged widget uses (`is-locked`, `isBlocked` of useOverviewPan);
 * outside the launcher (previews, tests) it does nothing.
 */
export const PageLockContext = createContext<(locked: boolean) => void>(() => undefined);

/** Holds the pager still for as long as `locked` is true and the component is mounted. */
export function usePageLock(locked: boolean) {
  const hold = useContext(PageLockContext);
  useEffect(() => {
    if (!locked) return undefined;
    hold(true);
    return () => hold(false);
  }, [locked, hold]);
}
