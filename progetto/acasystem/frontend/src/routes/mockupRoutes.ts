/**
 * Entry of the demo mode (`#/mockup`, REP-20261028-005). The demo is a flag of the tab: the
 * address `#/mockup` (or the old `#/ui-kit`, `#/kit`, `#/ui`) switches it on, and from then on the
 * normal routes of the app are used (`#/`, `#/sistema`...) over the simulated data. It is read
 * before the app mounts, because the storage must be swapped before any provider reads it.
 */
export const DEMO_FLAG_KEY = 'aca_demo_mode';

/** The hash that opens the page of the materials (Kit 2) over the demo. */
export const MATERIALS_HASH = '#/mockup/materiali';

const DEMO_HASH = /^#\/(mockup|ui-kit|kit|ui)(\/|$)/;

export const isDemoHash = (hash: string): boolean => DEMO_HASH.test(hash);

/** `/mockup` typed without the hash (and the old kit paths) goes to the hash route. */
export function normalizeDemoPath(): void {
  if (['/mockup', '/ui-kit', '/kit', '/ui'].includes(window.location.pathname.replace(/\/$/, ''))) {
    window.history.replaceState(null, '', '/#/mockup');
  }
}

/** Whether this tab runs the demo; the demo address switches the flag on for the tab. */
export function resolveDemoMode(): boolean {
  const requested = isDemoHash(window.location.hash);
  try {
    if (requested) window.sessionStorage.setItem(DEMO_FLAG_KEY, '1');
    return requested || window.sessionStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return requested;
  }
}
