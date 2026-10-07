import { createContext, useContext, useSyncExternalStore } from 'react';

/**
 * Whether the launcher page holding this subtree is the one on screen. The Pager provides false
 * to the pages off screen and LauncherPage provides false while Sistema covers the launcher.
 * Outside a page (details sheet, previews, tests) the default is true. REP-20261006-001, PERF-2.
 */
export const PageVisibilityContext = createContext(true);

const subscribe = (onChange: () => void) => {
  if (typeof document === 'undefined') return () => undefined;
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
};

const documentVisible = () =>
  typeof document === 'undefined' || document.visibilityState !== 'hidden';

/**
 * True when the page is on screen and the browser tab is visible. Timers, polling and camera
 * snapshots pause while it is false and resume (with a fresh fetch) when it turns true again.
 */
export function usePageVisible(): boolean {
  const page = useContext(PageVisibilityContext);
  const tab = useSyncExternalStore(subscribe, documentVisible, () => true);
  return page && tab;
}
