/**
 * Keeps the legacy configuration in step with the launcher layout, so the code that still
 * reads `pagesConfig` / `pageSettings` (special pages, add-widget, profiles of old clients)
 * sees the same pages and cards. The launcher layout is the source of truth.
 */
import type { PagesConfig, PageSettings, PageSettingsMap } from '@/@types/dashboard';
import type { DeviceClass, LauncherLayout } from '@/@types/launcher';
import { pageWidgetIds } from './layout';
import { LEGACY_PAGE_TYPE } from './pageIdentity';

const sameList = (a: readonly string[] | undefined, b: readonly string[]) =>
  Boolean(a) && a?.length === b.length && b.every((item, index) => a?.[index] === item);

/** Pages and card ids of the layout (current class first in reading order); header kept. */
export function layoutToPagesConfig(
  layout: LauncherLayout,
  previous: PagesConfig,
  deviceClass: DeviceClass
): PagesConfig {
  const pages = layout.pages.map((page) => page.id);
  const next: PagesConfig = {
    header: Array.isArray(previous.header) ? previous.header : [],
    pages,
  };
  for (const page of layout.pages) next[page.id] = pageWidgetIds(page, deviceClass);

  const previousKeys = Object.keys(previous).filter((key) => key !== 'header');
  const nextKeys = Object.keys(next).filter((key) => key !== 'header');
  const unchanged =
    previous.header === next.header &&
    previousKeys.length === nextKeys.length &&
    nextKeys.every((key) => sameList(previous[key], next[key]));
  return unchanged ? previous : next;
}

/** Label, icon, visibility and special type of every page in `pageSettings`. */
export function layoutToPageSettings(
  layout: LauncherLayout,
  previous: PageSettingsMap
): PageSettingsMap {
  let changed = false;
  const next: PageSettingsMap = {};
  const ids = new Set(layout.pages.map((page) => page.id));

  for (const page of layout.pages) {
    const current: PageSettings = previous[page.id] ?? {};
    const updated: PageSettings = { ...current, label: page.label };
    if (page.icon) updated.icon = page.icon;
    else if (current.icon !== undefined && current.icon !== null) updated.icon = null;
    if (page.hidden) updated.hidden = true;
    else delete updated.hidden;
    if (page.kind !== 'widgets') {
      const legacyType = LEGACY_PAGE_TYPE[page.kind];
      // The legacy loader rewrites «sonos» as «media»: keep it if the id already says sonos.
      const keepMedia = page.kind === 'sonos' && current.type === 'media';
      if (!keepMedia) updated.type = legacyType;
    }
    const same =
      current.label === updated.label &&
      current.icon === updated.icon &&
      current.hidden === updated.hidden &&
      current.type === updated.type &&
      Object.keys(current).length === Object.keys(updated).length;
    next[page.id] = same ? current : updated;
    if (!same) changed = true;
  }
  for (const key of Object.keys(previous)) {
    if (!ids.has(key)) changed = true;
  }
  return changed ? next : previous;
}
