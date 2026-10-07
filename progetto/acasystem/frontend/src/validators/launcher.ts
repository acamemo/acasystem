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
import { isObject } from './guards';

const DEVICE_CLASSES: readonly DeviceClass[] = [
  'phone',
  'phoneLandscape',
  'tabletPortrait',
  'tablet',
];
const PAGE_KINDS: readonly PageKind[] = ['widgets', 'lights', 'battery', 'rooms', 'media', 'sonos'];
/** Upper bound for coordinates and sizes: far beyond any grid, keeps garbage out. */
const MAX_CELLS = 64;

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
  if (
    typeof value.continuationOf === 'string' &&
    value.continuationOf &&
    value.continuationOf !== id
  ) {
    page.continuationOf = value.continuationOf;
  }
  if (isObject(placements)) {
    for (const deviceClass of DEVICE_CLASSES) {
      const sanitized = sanitizePlacements(placements[deviceClass]);
      if (sanitized) page.placements[deviceClass] = sanitized;
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
  return { version: 1, cover: { enabled: cover }, pages };
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
