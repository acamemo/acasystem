/**
 * Entries of the pager: the cover (index 0 when enabled), then the pages. Outside edit mode
 * hidden pages and widget pages without widgets for this class are skipped, as Android drops
 * empty home screens. «Principale», the base page, always stays: the launcher opens on it and
 * its free cells are where widgets are added.
 */
import type { DeviceClass, LauncherGrids, LauncherLayout, LauncherPage } from '@/@types/launcher';
import { basePageId, coverPageOf, pageClass, pagePlacements } from './layout';
import { displayLabel } from './pageIdentity';

/** The definition lives with canRemovePage, which protects the same page (layout.ts). */
export { basePageId };

export type PagerEntry =
  /**
   * `page`: the widgets of the cover (REP-20261007-030), when the grids are known. `hidden`:
   * the cover is off and shown only in the page overview, to be shown again from there.
   */
  | { type: 'cover'; key: 'cover'; label: string; page?: LauncherPage; hidden?: boolean }
  | { type: 'page'; key: string; label: string; page: LauncherPage };

export const COVER_LABEL = 'Copertina';

const hasWidgets = (page: LauncherPage, key: DeviceClass) =>
  Object.keys(pagePlacements(page, key)).length > 0;

/**
 * `overview`: the page overview is open, where the cover that is off still has its card,
 * marked hidden (REP-20261008-001); nowhere else, so neither the edges of a drag nor a drop
 * find a page the user switched off.
 */
export function pagerEntries(
  layout: LauncherLayout,
  deviceClass: DeviceClass,
  editMode: boolean,
  grids?: LauncherGrids,
  viewportWidth?: number,
  overview = false
): PagerEntry[] {
  const entries: PagerEntry[] = [];
  if (layout.cover.enabled || overview) {
    entries.push({
      type: 'cover',
      key: 'cover',
      label: COVER_LABEL,
      ...(grids ? { page: coverPageOf(layout, grids) } : {}),
      ...(layout.cover.enabled ? {} : { hidden: true }),
    });
  }

  const baseId = basePageId(layout);
  const shown = layout.pages.filter((page) => page.kind !== 'cover' && (editMode || !page.hidden));
  const useful = editMode
    ? shown
    : shown.filter(
        // An empty page made by the user stays (it was created on purpose, REP-20261007-028);
        // an empty continuation (made for another device class) does not.
        (page) =>
          page.kind !== 'widgets' ||
          page.id === baseId ||
          !page.continuationOf ||
          // With the grids each page has the key of its own grid (REP-20261008-001).
          hasWidgets(
            page,
            grids ? pageClass(layout, page, { deviceClass, grids, viewportWidth }) : deviceClass
          )
      );
  const pages = useful.length > 0 ? useful : shown.slice(0, 1);
  const fallback = pages.length > 0 ? pages : layout.pages.slice(0, 1);

  for (const page of fallback) {
    entries.push({ type: 'page', key: page.id, label: displayLabel(page.label), page });
  }
  return entries;
}

/** Index of the entry for a page id (or the cover), -1 when it is not shown. */
export function entryIndex(entries: readonly PagerEntry[], key: string): number {
  return entries.findIndex((entry) => entry.key === key);
}

/**
 * Entry the launcher starts on: the base page, else the first page shown, else the cover.
 */
export function homeEntryIndex(entries: readonly PagerEntry[], layout: LauncherLayout): number {
  const baseId = basePageId(layout);
  const base = baseId === null ? -1 : entryIndex(entries, baseId);
  if (base >= 0) return base;
  const firstPage = entries.findIndex((entry) => entry.type === 'page');
  return firstPage >= 0 ? firstPage : 0;
}
