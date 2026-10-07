/**
 * Entries of the pager: the cover (index 0 when enabled), then the pages. Outside edit mode
 * hidden pages and widget pages without widgets for this class are skipped, as Android drops
 * empty home screens. «Principale», the base page, always stays: the launcher opens on it and
 * its free cells are where widgets are added.
 */
import type { DeviceClass, LauncherLayout, LauncherPage } from '@/@types/launcher';
import { pagePlacements } from './layout';
import { displayLabel } from './pageIdentity';

export type PagerEntry =
  | { type: 'cover'; key: 'cover'; label: string }
  | { type: 'page'; key: string; label: string; page: LauncherPage };

export const COVER_LABEL = 'Copertina';

const hasWidgets = (page: LauncherPage, deviceClass: DeviceClass) =>
  Object.keys(pagePlacements(page, deviceClass)).length > 0;

/**
 * Id of the base page («Principale»): the first widget page that is not hidden, else the first
 * widget page; null when the layout has none.
 */
export function basePageId(layout: LauncherLayout): string | null {
  const widgetPages = layout.pages.filter((page) => page.kind === 'widgets');
  return (widgetPages.find((page) => !page.hidden) ?? widgetPages[0])?.id ?? null;
}

export function pagerEntries(
  layout: LauncherLayout,
  deviceClass: DeviceClass,
  editMode: boolean
): PagerEntry[] {
  const entries: PagerEntry[] = [];
  if (layout.cover.enabled) entries.push({ type: 'cover', key: 'cover', label: COVER_LABEL });

  const baseId = basePageId(layout);
  const shown = layout.pages.filter((page) => editMode || !page.hidden);
  const useful = editMode
    ? shown
    : shown.filter(
        (page) => page.kind !== 'widgets' || page.id === baseId || hasWidgets(page, deviceClass)
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
