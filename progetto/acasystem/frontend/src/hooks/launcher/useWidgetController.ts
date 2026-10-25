import { useRef } from 'react';
import type { LauncherController } from './useLauncherController';

/**
 * The controller as the grids and the widget hosts read it: without the page in the centre and
 * the overview. Those change at every swipe and every opening of the overview, and nothing a
 * widget draws depends on them. Nor do the entries of the pager, which the overview changes
 * when the cover is off, and `goToPage`, which follows them (REP-20261012-003).
 */
export type WidgetController = Omit<
  LauncherController,
  'currentPage' | 'currentPageId' | 'overview' | 'entries' | 'goToPage'
>;

/**
 * `controller` without the fields of WidgetController's omission, and the same object for as
 * long as every other field is the same one: a change of page or of the overview then leaves the
 * context of the launcher, and every widget that reads it, as it was.
 */
export function useWidgetController(controller: LauncherController): WidgetController {
  const {
    currentPage: _page,
    currentPageId: _pageId,
    overview: _overview,
    entries: _entries,
    goToPage: _goToPage,
    ...rest
  } = controller;
  const kept = useRef(rest);
  const keys = Object.keys(rest) as (keyof WidgetController)[];
  if (
    keys.length !== Object.keys(kept.current).length ||
    keys.some((key) => !Object.is(rest[key], kept.current[key]))
  ) {
    kept.current = rest;
  }
  return kept.current;
}
