/**
 * Guards for the launcher layout read from storage, profiles and synchronised settings.
 * Invalid rectangles and pages are dropped; a layout without a valid page list is rejected,
 * so the launcher migrates again from the legacy configuration.
 */
import type {
  CellRect,
  DeviceClass,
  LauncherLayout,
  LauncherPage,
  PageKind,
} from '@/@types/launcher';
import {
  COLUMNS_RANGE,
  BASE_DEVICE_CLASSES,
  COVER_COLUMNS,
  DEVICE_CLASSES,
  isPlacementKey,
} from '@/utils/launcher/deviceClass';
import { withoutEmptyStacks } from '@/utils/launcher/layout';
import { isObject } from './guards';

const PAGE_KINDS: readonly PageKind[] = [
  'widgets',
  'lights',
  'battery',
  'rooms',
  'media',
  'sonos',
  'cover',
  'casa3d',
];
/** Upper bound for coordinates and sizes: far beyond any grid, keeps garbage out. */
const MAX_CELLS = 64;

/** A class at a density (the keys of the screens, without the `base@WxH` grids). */
export function isDeviceClass(value: unknown): value is DeviceClass {
  return typeof value === 'string' && (DEVICE_CLASSES as readonly string[]).includes(value);
}

export function isPageKind(value: unknown): value is PageKind {
  return typeof value === 'string' && (PAGE_KINDS as readonly string[]).includes(value);
}

const isCell = (value: unknown, min: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= MAX_CELLS;

export function isCellRect(value: unknown): value is CellRect {
  return (
    isObject(value) &&
    isCell(value.x, 0) &&
    isCell(value.y, 0) &&
    isCell(value.w, 1) &&
    isCell(value.h, 1)
  );
}

function sanitizePlacements(value: unknown): Record<string, CellRect> | null {
  if (!isObject(value)) return null;
  const result: Record<string, CellRect> = {};
  for (const [id, rect] of Object.entries(value)) {
    if (id && isCellRect(rect)) result[id] = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  }
  return result;
}

export function sanitizeLauncherPage(value: unknown): LauncherPage | null {
  if (!isObject(value)) return null;
  const { id, label, icon, kind, hidden, placements } = value;
  if (typeof id !== 'string' || !id.trim()) return null;
  if (typeof label !== 'string') return null;
  if (!isPageKind(kind)) return null;
  const page: LauncherPage = { id, label, kind, placements: {} };
  if (typeof icon === 'string' && icon) page.icon = icon;
  if (hidden === true) page.hidden = true;
  if (kind === 'widgets' && isObject(value.categoryGrids)) {
    const categoryGrids: NonNullable<LauncherPage['categoryGrids']> = {};
    for (const base of BASE_DEVICE_CLASSES) {
      const grid = value.categoryGrids[base];
      if (isObject(grid) && isCell(grid.w, 1) && isCell(grid.h, 1))
        categoryGrids[base] = { w: grid.w as number, h: grid.h as number };
    }
    if (Object.keys(categoryGrids).length) page.categoryGrids = categoryGrids;
  }
  if (
    typeof value.continuationOf === 'string' &&
    value.continuationOf &&
    value.continuationOf !== id
  ) {
    page.continuationOf = value.continuationOf;
  }
  // Columns of the page (REP-20261008-001): on the first page of a family or on the cover.
  const columns = value.columns;
  const minColumns = kind === 'cover' ? COVER_COLUMNS : COLUMNS_RANGE.min;
  if (
    (kind === 'widgets' || kind === 'cover') &&
    !page.continuationOf &&
    typeof columns === 'number' &&
    Number.isInteger(columns) &&
    columns >= minColumns &&
    columns <= COLUMNS_RANGE.max
  ) {
    page.columns = columns;
  }
  if (isObject(placements)) {
    // The classes at every density and the `base@WxH` grids of the pages with columns.
    for (const [key, rects] of Object.entries(placements)) {
      if (!isPlacementKey(key)) continue;
      const sanitized = sanitizePlacements(rects);
      if (sanitized) page.placements[key] = sanitized;
    }
  }
  return page;
}

export function isLauncherPage(value: unknown): value is LauncherPage {
  return sanitizeLauncherPage(value) !== null;
}

/** Valid layout (version 1, page list), with the bad parts removed; null otherwise. */
export function sanitizeLauncherLayout(value: unknown): LauncherLayout | null {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.pages)) return null;
  const seen = new Set<string>();
  const pages: LauncherPage[] = [];
  for (const candidate of value.pages) {
    const page = sanitizeLauncherPage(candidate);
    if (!page || seen.has(page.id)) continue;
    seen.add(page.id);
    pages.push(page);
  }
  if (pages.length === 0) return null;
  const cover = isObject(value.cover) && value.cover.enabled === false ? false : true;
  const layout: LauncherLayout = { version: 1, cover: { enabled: cover }, pages };
  if (value.categoryDefaultsVersion === 1) layout.categoryDefaultsVersion = 1;
  if (value.casa3dVersion === 1) layout.casa3dVersion = 1;
  if (value.locked === true) layout.locked = true;
  if (
    typeof value.homePageId === 'string' &&
    pages.some((page) => page.id === value.homePageId && page.kind === 'widgets')
  ) {
    layout.homePageId = value.homePageId;
  }
  if (value.density === 'compact' || value.density === 'wide') layout.density = value.density;
  if (isObject(value.stacks)) {
    const stacks: NonNullable<LauncherLayout['stacks']> = {};
    for (const [id, stack] of Object.entries(value.stacks)) {
      if (!id.startsWith('stack_') || !isObject(stack) || !Array.isArray(stack.ids)) continue;
      const ids = stack.ids.filter(
        (item, index, list): item is string =>
          typeof item === 'string' && item.length > 0 && list.indexOf(item) === index
      );
      if (ids.length === 0) continue;
      stacks[id] = stack.rotate === true ? { ids, rotate: true } : { ids };
    }
    if (Object.keys(stacks).length > 0) layout.stacks = stacks;
  }
  // An empty stack, or a place kept by a stack that is gone, frees its cells (idempotent).
  return withoutEmptyStacks(layout);
}

/** JSON with sorted keys, so two objects compare regardless of key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value)) {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Strict check: the value is already a clean layout (nothing would be dropped). */
export function isLauncherLayout(value: unknown): value is LauncherLayout {
  const sanitized = sanitizeLauncherLayout(value);
  return sanitized !== null && canonical(sanitized) === canonical(value);
}
