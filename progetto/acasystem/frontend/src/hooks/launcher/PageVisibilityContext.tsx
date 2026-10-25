import { createContext, useContext, useSyncExternalStore } from 'react';

/**
 * Whether the launcher page holding this subtree is the one on screen. The Pager provides false
 * to the pages off screen and LauncherPage provides false while Sistema covers the launcher.
 * Outside a page (details sheet, previews, tests) the default is true. REP-20261006-001, PERF-2.
 */
export const PageVisibilityContext = createContext(true);

/**
 * Whether the page is the one on screen or the next to it. The Pager provides it, so a heavy page
 * can fetch its code before the swipe that brings it (modulepreload); false outside the Pager.
 */
export const PageNearContext = createContext(false);

let pagerSizeCount = 0;

/**
 * How many times a pager has changed size (ISSUE-109, review of R10). A page the browser skips is
 * not told when the pager changes size, and a jump can show it before its observers have
 * reported: a grid compares this with the count it measured at, and measures again when the page
 * comes near, before it is drawn, only if the two differ. The Pager is the one that bumps it.
 */
export const pagerSizeEpoch = () => pagerSizeCount;
export const markPagerResized = () => {
  pagerSizeCount += 1;
};

/** True when the page holding this subtree is on screen or next to it in the pager. */
export function usePageNear(): boolean {
  return useContext(PageNearContext);
}

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
