import { createContext } from 'react';

/**
 * Lets a special page hold the pager still while it needs the swipe for itself (the Casa 3D page
 * in Esplora, ADR-0014). The launcher provides the function and feeds it into the `locked` prop
 * of the Pager, the same lock a dragged widget uses (`is-locked`, `isBlocked` of useOverviewPan);
 * outside the launcher (previews, tests) it does nothing.
 */
export const PageLockContext = createContext<(locked: boolean) => void>(() => undefined);
