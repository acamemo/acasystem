/**
 * Immutable operations on the launcher layout (ADR-0007). They never mutate their input and
 * return the same object when nothing changes, so React state updates stay cheap.
 *
 * Model: pages are shared by every device class; placements are per class, like separate
 * Android home screens. A class missing on a page is packed from another class (tablet first)
 * the first time it is shown; widgets that do not fit, even at their minimum size, go to a
 * continuation page that is explicitly empty for the other classes.
 */
import type {
  CellRect,
  CellSize,
  DeviceClass,
  LauncherGrids,
  LauncherLayout,
  LauncherPage,
  PageKind,
  PagePatch,
  WidgetSizes,
  WidgetStack,
} from '@/@types/launcher';
import {
  BASE_DEVICE_CLASSES,
  COLUMNS_RANGE,
  COVER_COLUMNS,
  DEVICE_CLASSES,
  GRID_GAPS,
  REFERENCE_AREAS,
  baseClassOf,
  cellMetrics,
  columnsKey,
  gridFor,
  landscapeFits,
  placementKey,
} from './deviceClass';
import {
  afterLastPlaced,
  boxOfCells,
  cellInGrid,
  cellsForBox,
  clampSize,
  findFreeRect,
  findFreeRectAtCell,
  findFreeRectShrinking,
  idsByPosition,
  isFree,
  packItems,
  rectFits,
  samePlacements,
  tryMoveWithReflow,
  type PackItem,
  type Placements,
} from './grid';
import { PAGE_KIND_LABEL, continuationLabel, createPageId } from './pageIdentity';

export interface LayoutContext {
  deviceClass: DeviceClass;
  grids: LauncherGrids;
  /** Size limits of a widget on a page; undefined when no definition matches. */
  sizesOf?: (widgetId: string, pageId: string) => WidgetSizes | undefined;
  /**
   * Width of the viewport in CSS px: a landscape phone narrower than the tablet's columns allow
   * (landscapeFits) keeps its class grid. Undefined: wide enough.
   */
  viewportWidth?: number;
}

/** Size used when neither the caller nor a definition gives one: a 2×2 widget. */
export const FALLBACK_WIDGET_SIZE: CellSize = { w: 2, h: 2 };

/*
 * The cover as a page of widgets (REP-20261007-030): its clock, calendar and weather are
 * widgets like the others, so they move to the pages and back. Until the user changes it the
 * cover page is virtual (defaultCoverPage, never stored); the first change on it stores it.
 */
export const COVER_PAGE_ID = 'cover';
/** Widgets of a new cover, in order: clock, calendar, weather of the home. */
export const COVER_WIDGET_IDS = ['cover_clock', 'cover_calendar', 'cover_weather'] as const;

/**
 * Places of the three cover widgets on a grid: a centred row of 2×2 cards when there is room,
 * two rows on narrow tall grids (phones), else one row sharing the columns. On two columns the
 * clock takes the first row and the date and the weather the second; on one column they stack.
 */
export function coverRects(grid: CellSize): CellRect[] {
  if (grid.w === 1) {
    return [0, 1, 2].filter((y) => y < grid.h).map((y) => ({ x: 0, y, w: 1, h: 1 }));
  }
  if (grid.w === 2) {
    const rects: CellRect[] = [{ x: 0, y: 0, w: 2, h: 1 }];
    if (grid.h >= 2) rects.push({ x: 0, y: 1, w: 1, h: 1 }, { x: 1, y: 1, w: 1, h: 1 });
    return rects;
  }
  const h = Math.min(2, grid.h);
  const y = Math.max(0, Math.floor((grid.h - h) / 2));
  if (grid.w >= 6) {
    const x = Math.floor((grid.w - 6) / 2);
    return [0, 2, 4].map((dx) => ({ x: x + dx, y, w: 2, h }));
  }
  if (grid.h >= 4) {
    const w = Math.max(1, Math.floor(grid.w / 2));
    return [
      { x: 0, y: 0, w, h: 2 },
      { x: w, y: 0, w: Math.min(w, grid.w - w), h: 2 },
      { x: 0, y: 2, w: Math.min(grid.w, w * 2), h: 2 },
    ];
  }
  // Short and narrow: the columns shared out, the wider cards first.
  const widths = [0, 1, 2].map((index) =>
    Math.max(1, Math.floor(grid.w / 3) + (index < grid.w % 3 ? 1 : 0))
  );
  let x = 0;
  return widths.map((w) => {
    const rect = { x, y, w, h };
    x += w;
    return rect;
  });
}

/**
 * The cover as it is before any change: clock, calendar and weather in every class, and on the
 * grid of its three columns on every screen class (REP-20261008-001). The columns are stored
 * with it, so the grid does not change with the number of its widgets; a cover saved by an
 * earlier build gets them once when it has no more than three widgets, else it keeps the grid of
 * the class (ensureDeviceClass, C.5).
 */
export function defaultCoverPage(grids: LauncherGrids): LauncherPage {
  const placements: LauncherPage['placements'] = {};
  const keys = new Set<DeviceClass>(DEVICE_CLASSES);
  for (const base of BASE_DEVICE_CLASSES) keys.add(columnsKey(base, COVER_COLUMNS, grids));
  for (const item of keys) {
    const rects = coverRects(gridFor(grids, item));
    const placed: Placements = {};
    COVER_WIDGET_IDS.forEach((id, index) => {
      if (rects[index]) placed[id] = rects[index];
    });
    placements[item] = placed;
  }
  return {
    id: COVER_PAGE_ID,
    label: 'Copertina',
    kind: 'cover',
    columns: COVER_COLUMNS,
    placements,
  };
}

/** The cover page of the layout, or the default one when it was never changed. */
export function coverPageOf(layout: LauncherLayout, grids: LauncherGrids): LauncherPage {
  return layout.pages.find((page) => page.kind === 'cover') ?? defaultCoverPage(grids);
}

/** The layout with its cover page stored (before the first change made on the cover). */
export function withCoverPage(layout: LauncherLayout, grids: LauncherGrids): LauncherLayout {
  if (layout.pages.some((page) => page.kind === 'cover')) return layout;
  return { ...layout, pages: [...layout.pages, defaultCoverPage(grids)] };
}

export function createEmptyLayout(): LauncherLayout {
  return { version: 1, cover: { enabled: true }, pages: [] };
}

export function findPage(layout: LauncherLayout, pageId: string): LauncherPage | undefined {
  return layout.pages.find((page) => page.id === pageId);
}

export function pagePlacements(page: LauncherPage, deviceClass: DeviceClass): Placements {
  return page.placements[deviceClass] ?? {};
}

/** Keys of placements stored on a page: the classes in DEVICE_CLASSES order, then the grids. */
export function placementKeysOf(page: LauncherPage): DeviceClass[] {
  const stored = (Object.keys(page.placements) as DeviceClass[]).filter(
    (key) => page.placements[key] !== undefined
  );
  return [
    ...DEVICE_CLASSES.filter((key) => stored.includes(key)),
    ...stored.filter((key) => !DEVICE_CLASSES.includes(key)),
  ];
}

/** Every widget of the page in any device class, current class first in reading order. */
export function pageWidgetIds(page: LauncherPage, deviceClass?: DeviceClass): string[] {
  const keys = placementKeysOf(page);
  const order = deviceClass ? [deviceClass, ...keys.filter((item) => item !== deviceClass)] : keys;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of order) {
    const placements = page.placements[item];
    if (!placements) continue;
    for (const id of idsByPosition(placements)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** First page of the family of `page` (itself when it is not a continuation). */
export function familyRoot(layout: LauncherLayout, page: LauncherPage): LauncherPage {
  return (page.continuationOf && findPage(layout, page.continuationOf)) || page;
}

/** True for the pages of the family of `page` (itself and its continuations). */
const sameFamily = (page: LauncherPage) => (item: LauncherPage) =>
  (item.continuationOf ?? item.id) === (page.continuationOf ?? page.id);

/** The widgets `ids` of the cover packed on `grid` at their minimum, in that order. */
function coverAtMinimum(
  cover: LauncherPage,
  ids: readonly string[],
  grid: CellSize,
  ctx: LayoutContext
) {
  const items = ids.map((id) => {
    const min = clampSize(sizesFor(ctx, id, cover.id)?.min ?? { w: 1, h: 1 }, grid);
    return { id, size: min, min };
  });
  return packItems(items, grid);
}

/** True when every widget of the cover fits the grid of `key`, at least at its minimum. */
function coverFits(cover: LauncherPage, key: DeviceClass, ctx: LayoutContext): boolean {
  const ids = pageWidgetIds(cover);
  const stored = cover.placements[key];
  if (stored && ids.every((id) => stored[id])) return true;
  return coverAtMinimum(cover, ids, gridFor(ctx.grids, key), ctx).overflow.length === 0;
}

/**
 * False when `columns` cannot hold every widget of the cover on this screen, even at their
 * minimum: the choice is refused (C.2) instead of being stored and then ignored.
 */
export function coverTakesColumns(
  layout: LauncherLayout,
  columns: number,
  ctx: LayoutContext
): boolean {
  const key = columnsKey(baseClassOf(ctx.deviceClass), columns, ctx.grids);
  return coverFits(coverPageOf(layout, ctx.grids), key, ctx);
}

/**
 * Key of the placements a page uses on this screen (REP-20261008-001), shared by its family:
 * - a page with its own columns: the grid of those columns on this screen class;
 * - the cover: its columns (three on a new cover) when its widgets fit, else the class key;
 * - a page without a choice on a landscape phone at normal density wide enough for them (the
 *   Lenovo in Chrome): the columns of the tablet, so the short side does not cut them (E10);
 * - any other page: the class at the density, as before (E9).
 */
export function pageClass(
  layout: LauncherLayout,
  page: LauncherPage,
  ctx: LayoutContext
): DeviceClass {
  const root = familyRoot(layout, page);
  const base = baseClassOf(ctx.deviceClass);
  if (root.kind === 'cover') {
    if (root.columns === undefined) return ctx.deviceClass;
    const key = columnsKey(base, root.columns, ctx.grids);
    return coverFits(root, key, ctx) ? key : ctx.deviceClass;
  }
  if (root.kind !== 'widgets') return ctx.deviceClass;
  if (root.columns !== undefined) return columnsKey(base, root.columns, ctx.grids);
  const categoryGrid = root.categoryGrids?.[base];
  if (categoryGrid && ctx.deviceClass === base) return placementKey(base, categoryGrid, ctx.grids);
  const columns = ctx.grids.tablet.w;
  const wide = ctx.viewportWidth === undefined || landscapeFits(ctx.viewportWidth, columns);
  if (ctx.deviceClass === 'phoneLandscape' && wide) return columnsKey(base, columns, ctx.grids);
  return ctx.deviceClass;
}

/** Columns of a patch kept within the range of the page kind; undefined for the default. */
export function normalizeColumns(kind: PageKind, value: number | null): number | undefined {
  if (value === null || !Number.isFinite(value)) return undefined;
  const min = kind === 'cover' ? COVER_COLUMNS : COLUMNS_RANGE.min;
  return Math.min(COLUMNS_RANGE.max, Math.max(min, Math.round(value)));
}

function replacePage(
  layout: LauncherLayout,
  pageId: string,
  update: (page: LauncherPage) => LauncherPage
): LauncherLayout {
  let changed = false;
  const pages = layout.pages.map((page) => {
    if (page.id !== pageId) return page;
    const next = update(page);
    if (next !== page) changed = true;
    return next;
  });
  return changed ? { ...layout, pages } : layout;
}

function withPlacements(
  page: LauncherPage,
  deviceClass: DeviceClass,
  placements: Placements
): LauncherPage {
  if (page.placements[deviceClass] && samePlacements(page.placements[deviceClass], placements)) {
    return page;
  }
  return { ...page, placements: { ...page.placements, [deviceClass]: placements } };
}

function sizesFor(ctx: LayoutContext, widgetId: string, pageId: string) {
  return ctx.sizesOf?.(widgetId, pageId);
}

/** Minimum size of the widgets of a page, for the reflow that makes room (REP-20261007-027). */
function minOf(ctx: LayoutContext, pageId: string) {
  return (widgetId: string) => sizesFor(ctx, widgetId, pageId)?.min;
}

/** Placements of `page` for `deviceClass`, packed from the first class that has them. */
export function materializePage(
  page: LauncherPage,
  deviceClass: DeviceClass,
  ctx: LayoutContext
): { placements: Placements; overflow: PackItem[] } {
  const reference = placementKeysOf(page).find((item) => item !== deviceClass);
  if (!reference) return { placements: {}, overflow: [] };
  const source = page.placements[reference] ?? {};
  const grid = gridFor(ctx.grids, deviceClass);
  const items = idsByPosition(source).map((id) => {
    const sizes = sizesFor(ctx, id, page.id);
    return {
      id,
      size: clampSize({ w: source[id].w, h: source[id].h }, grid, sizes),
      min: sizes?.min,
    };
  });
  return packItems(items, grid);
}

/**
 * Every class and every key of the family except `deviceClass` explicitly empty: used by
 * continuation pages.
 */
function emptyOtherClasses(
  deviceClass: DeviceClass,
  placements: Placements,
  family: readonly LauncherPage[] = []
) {
  const result: LauncherPage['placements'] = {};
  const keys = new Set<DeviceClass>([...DEVICE_CLASSES, ...family.flatMap(placementKeysOf)]);
  for (const item of keys) result[item] = item === deviceClass ? placements : {};
  return result;
}

/**
 * Key that a page of the layout gets (null: left alone), and the key whose placements seed a
 * key the family does not have yet (null: no seed, the widgets are packed as before). `live`:
 * some screen shows the key (liveKeys). Only there what does not fit makes continuations (on
 * the cover: all its widgets at their minimum); on a key no screen shows any more it waits until
 * the key is shown again, so no page appears that no screen fills (E10).
 */
interface EnsurePlan {
  keyOf: (page: LauncherPage) => DeviceClass | null;
  seedOf: (familyId: string) => DeviceClass | null;
  live: boolean;
}

/**
 * Keys the family of `page` shows: on this screen, and on every screen class at each density
 * (landscape screens taken as wide). The others are left behind by a choice: the 6×2 of a page
 * now shown on 8×2, the grids of columns no longer chosen.
 */
function liveKeys(layout: LauncherLayout, page: LauncherPage, ctx: LayoutContext) {
  const keys = new Set<DeviceClass>([pageClass(layout, page, ctx)]);
  for (const deviceClass of DEVICE_CLASSES) {
    keys.add(pageClass(layout, page, { ...ctx, deviceClass, viewportWidth: undefined }));
  }
  return keys;
}

/**
 * Makes sure every widget page has placements for the class. Overflowing widgets go to the next
 * pages of their family, after their last widget, and only what none of them holds goes to new
 * continuation pages after the last one (E11). Returns the same layout when nothing changes.
 *
 * Each page uses the key of its family on this screen (pageClass, REP-20261008-001). A key
 * the page does not have yet starts from the arrangement shown before (E11): `sources` gives
 * it per family (the controller passes the key shown before a change of columns), else the
 * class key of this screen. Rectangles that still fit and are free stay where they are; the
 * rest goes after the last widget, then into the holes, and only then to a continuation. A
 * cover with no more than three widgets starts from its three places (coverRects). The cover
 * never gets a continuation.
 */
export function ensureDeviceClass(
  layout: LauncherLayout,
  ctx: LayoutContext,
  sources: Readonly<Record<string, DeviceClass>> = {}
): LauncherLayout {
  const normalized = withCoverColumns(layout);
  return ensureKeys(normalized, ctx, {
    keyOf: (page) => pageClass(normalized, page, ctx),
    seedOf: (familyId) => sources[familyId] ?? ctx.deviceClass,
    live: true,
  });
}

/**
 * A cover saved by an earlier build has no columns: with no more than three widgets it gets
 * the three of a new cover (U7, C.5), once, so later changes of its widgets keep its grid.
 */
function withCoverColumns(layout: LauncherLayout): LauncherLayout {
  const index = layout.pages.findIndex(
    (page) =>
      page.kind === 'cover' &&
      page.columns === undefined &&
      pageWidgetIds(page).length <= COVER_WIDGET_IDS.length
  );
  if (index < 0) return layout;
  const pages = [...layout.pages];
  pages[index] = { ...pages[index], columns: COVER_COLUMNS };
  return { ...layout, pages };
}

/**
 * Repairs one key of one family (membership shared after a change on another key); `live`
 * when a screen shows that key (liveKeys).
 */
function ensureFamilyKey(
  layout: LauncherLayout,
  ctx: LayoutContext,
  familyId: string,
  key: DeviceClass,
  live: boolean
): LauncherLayout {
  return ensureKeys(layout, ctx, {
    keyOf: (page) => ((page.continuationOf ?? page.id) === familyId ? key : null),
    seedOf: () => null,
    live,
  });
}

/** Seed of a key the cover does not have: its widgets on the three places, in reading order. */
function coverSeed(page: LauncherPage, grid: CellSize, source: DeviceClass | null): Placements {
  const rects = coverRects(grid);
  const seed: Placements = {};
  pageWidgetIds(page, source ?? undefined).forEach((id, index) => {
    if (rects[index]) seed[id] = rects[index];
  });
  return seed;
}

function ensureKeys(layout: LauncherLayout, ctx: LayoutContext, plan: EnsurePlan): LauncherLayout {
  let changed = false;
  const pages: LauncherPage[] = [];
  const ids = new Set(layout.pages.map((page) => page.id));
  const labels = layout.pages.map((page) => page.label);
  /** Every page as it is now: already processed ones and new continuations included. */
  const latest = new Map(layout.pages.map((page) => [page.id, page]));
  /** Last page of each family: only there what no page holds makes continuations. */
  const lastOfFamily = new Map(
    layout.pages
      .filter((page) => page.kind === 'widgets' || page.kind === 'cover')
      .map((page) => [page.continuationOf ?? page.id, page])
  );
  /** What a page of the family could not hold, waiting for its next pages (E11). */
  const carried = new Map<string, PackItem[]>();

  for (const page of layout.pages) {
    const deviceClass = page.kind === 'widgets' || page.kind === 'cover' ? plan.keyOf(page) : null;
    if (!deviceClass) {
      pages.push(page);
      continue;
    }
    const grid = gridFor(ctx.grids, deviceClass);
    const familyId = page.continuationOf ?? page.id;
    const inFamily = (item: LauncherPage) => (item.continuationOf ?? item.id) === familyId;
    const others = [...latest.values()].filter((item) => item.id !== page.id);
    // The widgets of the other pages of the family under this key, or under the key it is
    // seeded from when they do not have it yet (E11): they stay there, not here as well.
    const seedKey = plan.seedOf(familyId);
    const keptBy = (item: LauncherPage) =>
      item.placements[deviceClass] ?? (seedKey ? item.placements[seedKey] : undefined);
    const elsewhere = new Set(
      others.filter(inFamily).flatMap((item) => Object.keys(keptBy(item) ?? {}))
    );
    // Arranged per class before membership was shared (old continuation pages without a
    // family marker, moves saved by the earlier build): another page has the widget in this
    // class and its whole family lacks it in a class where this page has it. Keep it there
    // instead of duplicating. The check spans the family because a continuation is explicitly
    // empty in the other classes: that alone is not a per-class move.
    const arrangedElsewhere = (id: string) => {
      const here = placementKeysOf(page).filter((item) => page.placements[item]?.[id]);
      return others.some((other) => {
        const otherKey = plan.keyOf(other) ?? deviceClass;
        if (inFamily(other) || !other.placements[otherKey]?.[id]) return false;
        const otherFamilyId = other.continuationOf ?? other.id;
        const otherFamily = others.filter(
          (candidate) => (candidate.continuationOf ?? candidate.id) === otherFamilyId
        );
        return here.some(
          (item) =>
            other.placements[item] !== undefined &&
            !otherFamily.some((candidate) => candidate.placements[item]?.[id])
        );
      });
    };
    // A key the page does not have yet starts from the arrangement shown before (E11).
    let current = page.placements[deviceClass];
    const source = current ? null : seedKey;
    const seeded = !current && source !== null;
    if (!current && page.kind === 'cover') {
      if (pageWidgetIds(page).length <= COVER_WIDGET_IDS.length) {
        current = coverSeed(page, grid, source);
      } else if (source !== null) {
        current = page.placements[source];
      }
    } else if (seeded && source !== deviceClass) {
      current = page.placements[source];
    }
    const placements: Placements = {};
    const overflow: PackItem[] = [];
    for (const id of idsByPosition(current ?? {})) {
      if (seeded && elsewhere.has(id)) continue; // already on another page of the family
      const original = current![id];
      const sizes = sizesFor(ctx, id, page.id);
      const limited = { ...original, ...clampSize(original, grid, sizes) };
      if (rectFits(limited, grid) && isFree(placements, limited)) placements[id] = limited;
      else overflow.push({ id, size: clampSize(original, grid, sizes), min: sizes?.min });
    }
    const missing = pageWidgetIds(page).filter((id) => !current?.[id] && !elsewhere.has(id));
    for (const id of missing) {
      if (arrangedElsewhere(id)) continue;
      const stored = placementKeysOf(page)
        .map((item) => page.placements[item]?.[id])
        .find(Boolean);
      if (!stored) continue;
      const sizes = sizesFor(ctx, id, page.id);
      overflow.push({ id, size: clampSize(stored, grid, sizes), min: sizes?.min });
    }
    // Seeded: what the new grid cannot keep in place goes after the widgets that stayed.
    const from = seeded && current ? afterLastPlaced(placements, grid) : undefined;
    let packedPage = packItems(overflow, grid, placements, { from });
    if (page.kind === 'cover' && plan.live && packedPage.overflow.length > 0) {
      // The cover has no continuation: rather than leave a widget out of the key it shows, all
      // its widgets go back at their minimum in reading order, as coverFits measured them.
      const kept = new Set([
        ...Object.keys(packedPage.placements),
        ...packedPage.overflow.map((item) => item.id),
      ]);
      const ids = pageWidgetIds(page).filter((id) => kept.has(id));
      const repacked = coverAtMinimum(page, ids, grid, ctx);
      if (repacked.overflow.length === 0) packedPage = repacked;
    }
    // What an earlier page of the family could not hold goes after the widgets of this one.
    const waiting = carried.get(familyId) ?? [];
    carried.delete(familyId);
    if (waiting.length > 0) {
      const after = afterLastPlaced(packedPage.placements, grid);
      const more = packItems(waiting, grid, packedPage.placements, { from: after });
      packedPage = {
        placements: more.placements,
        overflow: [...more.overflow, ...packedPage.overflow],
      };
    }
    const nextPage = withPlacements(page, deviceClass, packedPage.placements);
    if (nextPage !== page) changed = true;
    pages.push(nextPage);
    latest.set(nextPage.id, nextPage);
    let rest = page.kind === 'cover' || !plan.live ? [] : packedPage.overflow;
    if (rest.length > 0 && lastOfFamily.get(familyId) !== page) {
      carried.set(familyId, rest);
      rest = [];
    }
    while (rest.length > 0) {
      const label = continuationLabel(page.label, labels);
      const id = createPageId(label, 'widgets', ids);
      ids.add(id);
      labels.push(label);
      const packed = packItems(rest, grid);
      if (packed.overflow.length === rest.length) break; // nothing fits even alone: give up
      const continuation: LauncherPage = {
        id,
        label,
        icon: page.icon,
        kind: 'widgets',
        continuationOf: familyId,
        placements: emptyOtherClasses(
          deviceClass,
          packed.placements,
          [...latest.values()].filter(inFamily)
        ),
      };
      pages.push(continuation);
      latest.set(id, continuation);
      changed = true;
      rest = packed.overflow;
    }
  }
  return changed ? { ...layout, pages } : layout;
}

export interface PlaceResult {
  layout: LauncherLayout;
  /** Page that received the widget: the requested one, or a new page when it was full. */
  pageId: string;
  placed: boolean;
}

/**
 * Places a widget on the page for the current class, shrinking down to the minimum of its
 * definition (at the requested size when no definition is known):
 * - with `at` (the free cell the user touched): the chosen size on that cell, else the chosen
 *   size at the free place closest to it, so widgets added together stay near the cell; only
 *   when the chosen size fits nowhere it shrinks, again on the cell first, then nearest;
 * - without it: the first free rectangle in reading order.
 * The other classes already shown get the widget in their first free rectangle when there is
 * room. When the page is full a new page is added right after it.
 */
export function placeWidgetInLayout(
  layout: LauncherLayout,
  ctx: LayoutContext,
  pageId: string,
  widgetId: string,
  size?: CellSize,
  at?: Pick<CellRect, 'x' | 'y'>
): PlaceResult {
  const page = findPage(layout, pageId);
  if (!page || (page.kind !== 'widgets' && page.kind !== 'cover')) {
    return { layout, pageId, placed: false };
  }
  const { grids } = ctx;
  const deviceClass = pageClass(layout, page, ctx);
  const sizes = sizesFor(ctx, widgetId, pageId);
  const wanted = size ?? sizes?.default ?? FALLBACK_WIDGET_SIZE;
  const current = pagePlacements(page, deviceClass);
  if (current[widgetId]) return { layout, pageId, placed: true };

  const grid = gridFor(grids, deviceClass);
  const fitted = clampSize(wanted, grid, sizes);
  const min = sizes?.min ?? fitted;
  const anchor = at && cellInGrid(at, grid) ? at : undefined;
  // With a cell the chosen size comes first: on the cell, then the free place nearest to it;
  // only when it fits nowhere does the widget shrink (again on the cell first, then nearest).
  const rect = anchor
    ? (findFreeRectAtCell(current, grid, fitted, fitted, anchor) ??
      findFreeRect(current, grid, fitted, anchor, 'cell') ??
      findFreeRectAtCell(current, grid, fitted, min, anchor) ??
      findFreeRectShrinking(current, grid, fitted, min, anchor, 'cell'))
    : findFreeRectShrinking(current, grid, fitted, min);
  if (rect) {
    const next = replacePage(layout, pageId, (target) => {
      const placements: LauncherPage['placements'] = {
        ...target.placements,
        [deviceClass]: { ...current, [widgetId]: rect },
      };
      for (const item of placementKeysOf(target)) {
        const other = target.placements[item];
        if (item === deviceClass || !other || other[widgetId]) continue;
        const otherGrid = gridFor(grids, item);
        const otherSize = clampSize(wanted, otherGrid, sizes);
        const otherRect = findFreeRectShrinking(
          other,
          otherGrid,
          otherSize,
          sizes?.min ?? otherSize
        );
        if (otherRect) placements[item] = { ...other, [widgetId]: otherRect };
      }
      return { ...target, placements };
    });
    let repaired = next;
    const familyId = page.continuationOf ?? page.id;
    const live = liveKeys(layout, page, ctx);
    for (const item of placementKeysOf(page)) {
      repaired = ensureFamilyKey(repaired, ctx, familyId, item, live.has(item));
    }
    return { layout: repaired, pageId, placed: true };
  }

  // A full cover gets no continuation: the widget goes to the first page of widgets.
  if (page.kind === 'cover') {
    const first = layout.pages.find((item) => item.kind === 'widgets' && !item.hidden);
    return first
      ? placeWidgetInLayout(layout, ctx, first.id, widgetId, size)
      : { layout, pageId, placed: false };
  }

  const added = addPageToLayout(
    layout,
    {
      label: continuationLabel(
        page.label,
        layout.pages.map((item) => item.label)
      ),
      icon: page.icon,
      kind: 'widgets',
    },
    pageId
  );
  const withWidget = replacePage(added.layout, added.pageId, (target) =>
    withPlacements({ ...target, continuationOf: page.continuationOf ?? page.id }, deviceClass, {
      [widgetId]: { x: 0, y: 0, w: fitted.w, h: fitted.h },
    })
  );
  return { layout: withWidget, pageId: added.pageId, placed: true };
}

/** True when the widget finds a free rectangle on the page, shrinking to its minimum if needed. */
function fitsOnPage(
  layout: LauncherLayout,
  ctx: LayoutContext,
  page: LauncherPage,
  widgetId: string,
  size?: CellSize
): boolean {
  const deviceClass = pageClass(layout, page, ctx);
  const grid = gridFor(ctx.grids, deviceClass);
  const sizes = sizesFor(ctx, widgetId, page.id);
  const fitted = clampSize(size ?? sizes?.default ?? FALLBACK_WIDGET_SIZE, grid, sizes);
  return (
    findFreeRectShrinking(pagePlacements(page, deviceClass), grid, fitted, sizes?.min ?? fitted) !==
    null
  );
}

/**
 * Places a widget from the pages view («Aggiungi widget» of its bar, 2026-10-23): on the page
 * `pageId`, at its first free place; when that page is full, on the first page after it that has
 * room (a page of widgets that is not hidden, in the order of the pager); when none has room, on a
 * new page at the end. A widget already on the page stays. `pageId` of the result is the page that
 * received it; `placed` is false when `pageId` is not a page of widgets or the cover.
 */
export function placeWidgetAheadInLayout(
  layout: LauncherLayout,
  ctx: LayoutContext,
  pageId: string,
  widgetId: string,
  size?: CellSize
): PlaceResult {
  const page = findPage(layout, pageId);
  if (!page || (page.kind !== 'widgets' && page.kind !== 'cover')) {
    return { layout, pageId, placed: false };
  }
  if (pagePlacements(page, pageClass(layout, page, ctx))[widgetId]) {
    return { layout, pageId, placed: true };
  }
  // The pager shows the cover first, then the other pages in the order of the layout.
  const others = layout.pages.filter((item) => item.kind !== 'cover');
  const after = page.kind === 'cover' ? others : others.slice(others.indexOf(page) + 1);
  const target = [page, ...after.filter((item) => item.kind === 'widgets' && !item.hidden)].find(
    (item) => fitsOnPage(layout, ctx, item, widgetId, size)
  );
  if (target) return placeWidgetInLayout(layout, ctx, target.id, widgetId, size);

  const added = addPageToLayout(layout, { label: PAGE_KIND_LABEL.widgets, kind: 'widgets' });
  return placeWidgetInLayout(added.layout, ctx, added.pageId, widgetId, size);
}

function clampRect(rect: CellRect, grid: CellSize, sizes?: WidgetSizes): CellRect {
  const size = clampSize(rect, grid, sizes);
  return { x: Math.round(rect.x), y: Math.round(rect.y), w: size.w, h: size.h };
}

/** Moves (and possibly resizes) a widget on its page for the current class; null if refused. */
export function moveWidgetInLayout(
  layout: LauncherLayout,
  ctx: LayoutContext,
  pageId: string,
  widgetId: string,
  to: CellRect
): LauncherLayout | null {
  const page = findPage(layout, pageId);
  if (!page) return null;
  const key = pageClass(layout, page, ctx);
  const current = pagePlacements(page, key);
  if (!current[widgetId]) return null;
  const grid = gridFor(ctx.grids, key);
  const target = clampRect(to, grid, sizesFor(ctx, widgetId, pageId));
  const next = tryMoveWithReflow(current, grid, widgetId, target, minOf(ctx, pageId));
  if (!next) return null;
  return replacePage(layout, pageId, (item) => withPlacements(item, key, next));
}

/** Changes the size of a widget, keeping its top-left cell; null if refused. */
export function resizeWidgetInLayout(
  layout: LauncherLayout,
  ctx: LayoutContext,
  pageId: string,
  widgetId: string,
  size: CellSize
): LauncherLayout | null {
  const page = findPage(layout, pageId);
  const rect = page ? pagePlacements(page, pageClass(layout, page, ctx))[widgetId] : undefined;
  if (!rect) return null;
  return moveWidgetInLayout(layout, ctx, pageId, widgetId, {
    x: rect.x,
    y: rect.y,
    w: size.w,
    h: size.h,
  });
}

/**
 * Size in the cells of another key that looks about as large as `size` in the cells of `from`
 * (REP-20261012-001), measured on the reference area of the screen class: the cover's three
 * large columns and a page's small cells differ a lot on the same screen.
 */
export function sizeAcrossKeys(
  size: CellSize,
  grids: LauncherGrids,
  from: DeviceClass,
  to: DeviceClass
): CellSize {
  if (from === to) return size;
  const pitchOf = (key: DeviceClass) => {
    const base = baseClassOf(key);
    const area = REFERENCE_AREAS[base];
    return cellMetrics(area.width, area.height, gridFor(grids, key), GRID_GAPS[base]);
  };
  return cellsForBox(boxOfCells(size, pitchOf(from)), pitchOf(to));
}

/**
 * Moves page membership in every key the destination has. Without `to` the current key gets
 * about the size the widget shows: `size` when the screen measured it, else sizeAcrossKeys on
 * the reference area; the other keys keep their dimensions. A key
 * whose destination is full gets a continuation instead of a stale copy on the source page; a
 * key no screen shows any more gets the widget when it is shown again.
 */
export function moveWidgetToPageInLayout(
  layout: LauncherLayout,
  ctx: LayoutContext,
  fromPageId: string,
  toPageId: string,
  widgetId: string,
  to?: CellRect,
  size?: CellSize
): LauncherLayout | null {
  if (fromPageId === toPageId) {
    return to ? moveWidgetInLayout(layout, ctx, fromPageId, widgetId, to) : layout;
  }
  const source = findPage(layout, fromPageId);
  const target = findPage(layout, toPageId);
  if (!source || !target || (target.kind !== 'widgets' && target.kind !== 'cover')) return null;
  // Each page with the key of its own grid (REP-20261008-001).
  const sourceKey = pageClass(layout, source, ctx);
  const deviceClass = pageClass(layout, target, ctx);
  const sourcePlacements = pagePlacements(source, sourceKey);
  const rect = sourcePlacements[widgetId];
  if (!rect) return null;
  const targetPlacements = pagePlacements(target, deviceClass);
  if (targetPlacements[widgetId]) return null;
  const grid = gridFor(ctx.grids, deviceClass);
  const sizes = sizesFor(ctx, widgetId, toPageId);
  let nextTarget: Placements | null;
  if (to) {
    nextTarget = tryMoveWithReflow(
      targetPlacements,
      grid,
      widgetId,
      clampRect(to, grid, sizes),
      minOf(ctx, toPageId)
    );
  } else {
    // About the size it shows, in the cells of the destination (REP-20261012-001).
    const free = findFreeRectShrinking(
      targetPlacements,
      grid,
      clampSize(size ?? sizeAcrossKeys(rect, ctx.grids, sourceKey, deviceClass), grid, sizes),
      sizes?.min
    );
    nextTarget = free ? { ...targetPlacements, [widgetId]: free } : null;
  }
  if (!nextTarget) return null;
  const sourceFamily = source.continuationOf ?? source.id;
  const familyPages = layout.pages.filter(
    (page) => (page.continuationOf ?? page.id) === sourceFamily
  );
  let moved: LauncherLayout = {
    ...layout,
    pages: layout.pages.map((page) => {
      if ((page.continuationOf ?? page.id) === sourceFamily) {
        const placements = { ...page.placements };
        for (const item of placementKeysOf(page)) {
          const rects = placements[item];
          if (!rects?.[widgetId]) continue;
          const { [widgetId]: _moved, ...remaining } = rects;
          placements[item] = remaining;
        }
        if (page.id === toPageId) placements[deviceClass] = nextTarget;
        return { ...page, placements };
      }
      if (page.id === toPageId) return withPlacements(page, deviceClass, nextTarget);
      return page;
    }),
  };
  const targetFamily = target.continuationOf ?? target.id;
  const targetKeys = new Set(
    layout.pages
      .filter((page) => (page.continuationOf ?? page.id) === targetFamily)
      .flatMap(placementKeysOf)
  );
  const keys = new Set(familyPages.flatMap(placementKeysOf));
  const live = liveKeys(layout, target, ctx);
  for (const item of keys) {
    // Only the keys the destination already has: the grids of another family (the three
    // columns of the cover, the columns of another page) mean nothing there.
    if (item === deviceClass || !targetKeys.has(item)) continue;
    const original = layout.pages.find(
      (page) =>
        (page.continuationOf ?? page.id) === sourceFamily && page.placements[item]?.[widgetId]
    )?.placements[item]?.[widgetId];
    if (!original) continue;
    // Share membership, then let normal overflow packing repair the class.
    moved = replacePage(moved, toPageId, (page) => {
      const other = page.placements[item] ?? {};
      const sizes = sizesFor(ctx, widgetId, toPageId);
      const free = findFreeRectShrinking(
        other,
        gridFor(ctx.grids, item),
        clampSize(original, gridFor(ctx.grids, item), sizes),
        sizes?.min
      );
      return free ? withPlacements(page, item, { ...other, [widgetId]: free }) : page;
    });
    moved = ensureFamilyKey(moved, ctx, targetFamily, item, live.has(item));
  }
  return moved;
}

/** Removes a widget from a page, in every device class. */
export function removeWidgetFromLayout(
  layout: LauncherLayout,
  pageId: string,
  widgetId: string
): LauncherLayout {
  const source = findPage(layout, pageId);
  if (!source) return layout;
  const familyId = source.continuationOf ?? source.id;
  let changedLayout = layout;
  for (const item of layout.pages.filter((page) => (page.continuationOf ?? page.id) === familyId)) {
    changedLayout = replacePage(changedLayout, item.id, (page) => {
      let changed = false;
      const placements: LauncherPage['placements'] = {};
      for (const item of placementKeysOf(page)) {
        const current = page.placements[item];
        if (!current) continue;
        if (current[widgetId]) {
          const { [widgetId]: _removed, ...rest } = current;
          placements[item] = rest;
          changed = true;
        } else {
          placements[item] = current;
        }
      }
      return changed ? { ...page, placements } : page;
    });
  }
  return changedLayout;
}

export interface NewPage {
  label: string;
  icon?: string;
  kind?: PageKind;
}

/** Adds a page after `afterPageId` (or at the end); returns its new id. */
export function addPageToLayout(
  layout: LauncherLayout,
  page: NewPage,
  afterPageId?: string
): { layout: LauncherLayout; pageId: string } {
  const kind = page.kind ?? 'widgets';
  const label = page.label.trim() || 'Nuova pagina';
  const pageId = createPageId(
    label,
    kind,
    layout.pages.map((item) => item.id)
  );
  const created: LauncherPage = {
    id: pageId,
    label,
    ...(page.icon ? { icon: page.icon } : {}),
    kind,
    placements: {},
  };
  const index = afterPageId ? layout.pages.findIndex((item) => item.id === afterPageId) : -1;
  const pages = [...layout.pages];
  if (index >= 0) pages.splice(index + 1, 0, created);
  else pages.push(created);
  return { layout: { ...layout, pages }, pageId };
}

/**
 * The 3D house page (ADR-0014, D12), installed once: at the end of the pages of a layout that
 * never had it, whatever the pages are. The mark `casa3dVersion` is set at once, so a page the
 * user removes does not come back; a layout that already has a page of the kind (a profile
 * saved elsewhere) only gets the mark, never a second page. The other pages are not touched.
 */
export function installCasa3dPage(layout: LauncherLayout): LauncherLayout {
  if (layout.casa3dVersion === 1) return layout;
  if (layout.pages.some((page) => page.kind === 'casa3d')) {
    return { ...layout, casa3dVersion: 1 };
  }
  const { layout: added } = addPageToLayout(layout, {
    label: PAGE_KIND_LABEL.casa3d,
    kind: 'casa3d',
  });
  return { ...added, casa3dVersion: 1 };
}

/**
 * Label, icon and visibility of a page; `columns` goes to the first page of its family (or the
 * cover), kept in range, and null removes it (REP-20261008-001).
 */
export function updatePageInLayout(
  layout: LauncherLayout,
  pageId: string,
  patch: PagePatch
): LauncherLayout {
  const updated = replacePage(layout, pageId, (page) => {
    const next: LauncherPage = { ...page };
    if (patch.label !== undefined) {
      const label = patch.label.trim();
      if (label) next.label = label;
    }
    if (patch.icon !== undefined) {
      if (patch.icon) next.icon = patch.icon;
      else delete next.icon;
    }
    if (patch.hidden !== undefined) {
      if (patch.hidden) next.hidden = true;
      else delete next.hidden;
    }
    const same =
      next.label === page.label && next.icon === page.icon && next.hidden === page.hidden;
    return same ? page : next;
  });
  if (patch.columns === undefined) return updated;
  const page = findPage(updated, pageId);
  if (!page) return updated;
  return replacePage(updated, page.continuationOf ?? page.id, (root) => {
    if (root.kind !== 'widgets' && root.kind !== 'cover') return root;
    const columns = normalizeColumns(root.kind, patch.columns ?? null);
    if (columns === root.columns) return root;
    const next: LauncherPage = { ...root };
    if (columns === undefined) delete next.columns;
    else next.columns = columns;
    return next;
  });
}

/**
 * Removes the continuations of the family of `pageId` that no screen fills any more after a
 * change of columns: empty under every key shown (liveKeys), and each widget they keep under a
 * key left behind is on another page of the family, so nothing is lost. Without this every
 * choice of fewer columns would leave pages that no later choice takes away.
 */
export function dropEmptyContinuations(
  layout: LauncherLayout,
  ctx: LayoutContext,
  pageId: string
): LauncherLayout {
  const page = findPage(layout, pageId);
  if (!page) return layout;
  const family = layout.pages.filter(sameFamily(page));
  const live = liveKeys(layout, page, ctx);
  const removed = new Set<string>();
  for (const item of family) {
    if (!item.continuationOf) continue;
    const shown = [...live].some((key) => Object.keys(item.placements[key] ?? {}).length > 0);
    if (shown) continue;
    const held = new Set(
      family
        .filter((other) => other.id !== item.id && !removed.has(other.id))
        .flatMap((other) => pageWidgetIds(other))
    );
    if (pageWidgetIds(item).every((id) => held.has(id))) removed.add(item.id);
  }
  if (removed.size === 0) return layout;
  return { ...layout, pages: layout.pages.filter((item) => !removed.has(item.id)) };
}

/**
 * Id of the base page («Principale»): the page chosen with the house icon while it is shown,
 * else the first widget page that is not hidden, else the first widget page; null when the
 * layout has none.
 */
export function basePageId(layout: LauncherLayout): string | null {
  const widgetPages = layout.pages.filter((page) => page.kind === 'widgets');
  // The page chosen with the house icon of the overview (REP-20261007-033), while it is shown.
  const chosen = widgetPages.find((page) => page.id === layout.homePageId && !page.hidden);
  if (chosen) return chosen.id;
  return (widgetPages.find((page) => !page.hidden) ?? widgetPages[0])?.id ?? null;
}

/**
 * The main page and the last remaining page cannot be removed. The main page is the one the
 * launcher opens on and the editor marks (basePageId), also when the chosen one is hidden.
 */
export function canRemovePage(layout: LauncherLayout, pageId: string): boolean {
  return (
    pageId !== basePageId(layout) && layout.pages.length > 1 && Boolean(findPage(layout, pageId))
  );
}

export function removePageFromLayout(layout: LauncherLayout, pageId: string): LauncherLayout {
  if (!canRemovePage(layout, pageId)) return layout;
  // The continuations of a removed page keep their own family, rooted on the first one: a
  // later page that reuses the id must not share their widgets. The new root keeps the columns.
  const columns = findPage(layout, pageId)?.columns;
  let root: string | undefined;
  const pages = layout.pages
    .filter((page) => page.id !== pageId)
    .map((page) => {
      if (page.continuationOf !== pageId) return page;
      if (root === undefined) {
        root = page.id;
        const { continuationOf: _removed, ...rest } = page;
        return columns === undefined ? rest : { ...rest, columns };
      }
      return { ...page, continuationOf: root };
    });
  // A hidden chosen main page can be removed: its id must not make a later page with the same
  // name the main page.
  if (layout.homePageId === pageId) {
    const { homePageId: _removed, ...rest } = layout;
    return { ...rest, pages };
  }
  return { ...layout, pages };
}

/** New order of the pages; unknown ids are ignored and missing pages keep their place at the end. */
export function reorderPagesInLayout(
  layout: LauncherLayout,
  pageIds: readonly string[]
): LauncherLayout {
  const byId = new Map(layout.pages.map((page) => [page.id, page]));
  const ordered: LauncherPage[] = [];
  for (const id of pageIds) {
    const page = byId.get(id);
    if (!page) continue;
    ordered.push(page);
    byId.delete(id);
  }
  const pages = [...ordered, ...layout.pages.filter((page) => byId.has(page.id))];
  const same = pages.every((page, index) => page === layout.pages[index]);
  return same ? layout : { ...layout, pages };
}

/**
 * Order of the page ids after moving `movedId` to position `to` of `shownIds` (the pages in
 * the order shown, REP-20261007-028). A page and its continuations stay together: moving one
 * of them moves the whole family, which lands where the moved page was dropped. Pages that are
 * not shown keep their place relative to their family.
 */
export function movePageOrder(
  pages: readonly LauncherPage[],
  shownIds: readonly string[],
  movedId: string,
  to: number
): string[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const rootOf = (id: string) => byId.get(id)?.continuationOf ?? id;
  const members = new Map<string, string[]>();
  for (const page of pages) {
    const root = rootOf(page.id);
    members.set(root, [...(members.get(root) ?? []), page.id]);
  }
  const movedRoot = rootOf(movedId);
  const shown = shownIds.filter((id) => id === movedId || rootOf(id) !== movedRoot);
  const from = shown.indexOf(movedId);
  if (from < 0) return pages.map((page) => page.id);
  const others = shown.filter((id) => id !== movedId);
  // `to` counts the moved page itself; without it the others shift by one after its old place.
  const target = Math.max(0, Math.min(others.length, to));
  const order = [...others.slice(0, target), movedId, ...others.slice(target)];
  // Every family once, in the order its first page appears; then the families not shown.
  const roots: string[] = [];
  for (const id of order) {
    const root = rootOf(id);
    if (!roots.includes(root)) roots.push(root);
  }
  for (const page of pages) {
    const root = rootOf(page.id);
    if (!roots.includes(root)) roots.push(root);
  }
  return roots.flatMap((root) => members.get(root) ?? [root]);
}

export function setCoverInLayout(layout: LauncherLayout, enabled: boolean): LauncherLayout {
  return layout.cover.enabled === enabled ? layout : { ...layout, cover: { enabled } };
}

/*
 * Widget stacks (REP-20261007-037). A stack is a placement of its own (`stack_…`) whose
 * widgets live in `layout.stacks`; they are not on the grid while stacked.
 */
export const isStackId = (id: string) => id.startsWith('stack_');

/**
 * Takes the empty stacks out: a stack with no widget left, and the place a `stack_…` id keeps
 * on a page when no stack with widgets stands behind it. Its cells are free again (the «+» of
 * the page uses them). Idempotent; the same object comes back when there is nothing to take out.
 */
export function withoutEmptyStacks(layout: LauncherLayout): LauncherLayout {
  const stacks = layout.stacks ?? {};
  const live = new Set(
    Object.entries(stacks)
      .filter(([, stack]) => stack.ids.length > 0)
      .map(([id]) => id)
  );
  let changed = live.size !== Object.keys(stacks).length;
  const pages = layout.pages.map((page) => {
    let pageChanged = false;
    const placements: LauncherPage['placements'] = {};
    for (const [key, rects] of Object.entries(page.placements) as [
      DeviceClass,
      Placements | undefined,
    ][]) {
      if (!rects) continue;
      const orphans = Object.keys(rects).filter((id) => isStackId(id) && !live.has(id));
      if (orphans.length === 0) {
        placements[key] = rects;
        continue;
      }
      pageChanged = true;
      placements[key] = Object.fromEntries(
        Object.entries(rects).filter(([id]) => !orphans.includes(id))
      );
    }
    return pageChanged ? { ...page, placements } : page;
  });
  changed = changed || pages.some((page, index) => page !== layout.pages[index]);
  if (!changed) return layout;
  const { stacks: _previous, ...others } = layout;
  const kept = Object.fromEntries(Object.entries(stacks).filter(([id]) => live.has(id)));
  return { ...others, pages, ...(Object.keys(kept).length > 0 ? { stacks: kept } : {}) };
}

/*
 * Ghost stacks (ISSUE-116). A stack none of whose widgets has a definition shows its cells free,
 * with the «+», but the saved layout is not touched: its ids stay, so the stack comes back as soon
 * as a widget of it can be resolved again (Home Assistant reachable, a definition loaded). While a
 * user action places or moves something, the ghosts are lifted off the page for the operation
 * (so their cells count as free) and put back afterwards, never deleted: the saved layout has no
 * overlap and `layout.stacks` is the same object.
 */

/** A ghost stack taken off the active class of a page, to be put back by reseatGhostStacks. */
export interface LiftedStack {
  pageId: string;
  key: DeviceClass;
  id: string;
  rect: CellRect;
}

/**
 * Takes the ghost stacks off the placements the page uses on this screen, for the operation that
 * follows. The same layout comes back when there are none. Other classes are not touched.
 */
export function liftGhostStacks(
  layout: LauncherLayout,
  ctx: LayoutContext,
  isGhost: (pageId: string, id: string) => boolean
): { layout: LauncherLayout; lifted: LiftedStack[] } {
  const lifted: LiftedStack[] = [];
  const pages = layout.pages.map((page) => {
    if (page.kind !== 'widgets' && page.kind !== 'cover') return page;
    const key = pageClass(layout, page, ctx);
    const rects = page.placements[key];
    if (!rects) return page;
    const ghosts = Object.keys(rects).filter((id) => isStackId(id) && isGhost(page.id, id));
    if (ghosts.length === 0) return page;
    for (const id of ghosts) lifted.push({ pageId: page.id, key, id, rect: rects[id] });
    const kept = Object.fromEntries(Object.entries(rects).filter(([id]) => !ghosts.includes(id)));
    return { ...page, placements: { ...page.placements, [key]: kept } };
  });
  return lifted.length === 0 ? { layout, lifted } : { layout: { ...layout, pages }, lifted };
}

/**
 * Puts the lifted stacks back, one by one: on the same rectangle when it is still free; else at
 * the first free rectangle of the same size on the page, then smaller (down to one cell); else on
 * the first later page of widgets that has room, else on a new page at the end. A stack is never
 * dropped: `layout.stacks` is not read or written, so its widgets stay as they were.
 */
export function reseatGhostStacks(
  layout: LauncherLayout,
  ctx: LayoutContext,
  lifted: readonly LiftedStack[]
): LauncherLayout {
  return lifted.reduce((next, item) => reseatGhostStack(next, ctx, item), layout);
}

function reseatGhostStack(
  layout: LauncherLayout,
  ctx: LayoutContext,
  { pageId, key, id, rect }: LiftedStack
): LauncherLayout {
  const size: CellSize = { w: rect.w, h: rect.h };
  const page = findPage(layout, pageId);
  if (page) {
    const current = pagePlacements(page, key);
    if (current[id]) return layout;
    const grid = gridFor(ctx.grids, key);
    const spot =
      (rectFits(rect, grid) && isFree(current, rect) ? rect : null) ??
      findFreeRect(current, grid, size) ??
      findFreeRectShrinking(current, grid, size);
    if (spot)
      return replacePage(layout, pageId, (item) =>
        withPlacements(item, key, { ...current, [id]: spot })
      );
  }
  // No room on its page: the first page of widgets after it that has room, else a new one.
  const start = page ? layout.pages.indexOf(page) + 1 : 0;
  for (const later of layout.pages.slice(start)) {
    if (later.kind !== 'widgets' || later.hidden) continue;
    const laterKey = pageClass(layout, later, ctx);
    const laterGrid = gridFor(ctx.grids, laterKey);
    const current = pagePlacements(later, laterKey);
    const spot = findFreeRectShrinking(current, laterGrid, clampSize(size, laterGrid));
    if (spot) {
      return replacePage(layout, later.id, (item) =>
        withPlacements(item, laterKey, { ...current, [id]: spot })
      );
    }
  }
  const added = addPageToLayout(layout, { label: PAGE_KIND_LABEL.widgets, kind: 'widgets' });
  const created = findPage(added.layout, added.pageId);
  if (!created) return layout;
  const createdKey = pageClass(added.layout, created, ctx);
  const fitted = clampSize(size, gridFor(ctx.grids, createdKey));
  return replacePage(added.layout, added.pageId, (item) =>
    withPlacements(item, createdKey, { [id]: { x: 0, y: 0, ...fitted } })
  );
}

/** Replaces `fromId` with `toId` in every class of the page, keeping its rectangles. */
function renamePlacement(page: LauncherPage, fromId: string, toId: string): LauncherPage {
  const placements: LauncherPage['placements'] = {};
  for (const [item, rects] of Object.entries(page.placements) as [
    DeviceClass,
    Placements | undefined,
  ][]) {
    if (!rects) continue;
    if (!rects[fromId]) {
      placements[item] = rects;
      continue;
    }
    const { [fromId]: rect, ...rest } = rects;
    placements[item] = { ...rest, [toId]: rect };
  }
  return { ...page, placements };
}

/** Removes a widget from every class of the page. */
function dropPlacement(page: LauncherPage, id: string): LauncherPage {
  const placements: LauncherPage['placements'] = {};
  for (const [item, rects] of Object.entries(page.placements) as [
    DeviceClass,
    Placements | undefined,
  ][]) {
    if (!rects) continue;
    const { [id]: _gone, ...rest } = rects;
    placements[item] = rest;
  }
  return { ...page, placements };
}

/**
 * Puts `draggedId` on `ontoId` of the same page: into its stack, or into a new stack that
 * takes the place of `ontoId`. `stackId` names a new stack (the caller makes it unique). The
 * change spans the family: under another key either widget may be on another of its pages.
 */
export function stackWidgetsInLayout(
  layout: LauncherLayout,
  pageId: string,
  draggedId: string,
  ontoId: string,
  stackId: string
): LauncherLayout | null {
  const page = findPage(layout, pageId);
  if (!page || draggedId === ontoId || isStackId(draggedId)) return null;
  const stacks = { ...(layout.stacks ?? {}) };
  const intoStack = isStackId(ontoId) && Boolean(stacks[ontoId]);
  if (intoStack) {
    const current = stacks[ontoId];
    stacks[ontoId] = {
      ...current,
      ids: [...current.ids.filter((id) => id !== draggedId), draggedId],
    };
  } else {
    stacks[stackId] = { ids: [ontoId, draggedId] };
  }
  const inFamily = sameFamily(page);
  return {
    ...layout,
    stacks,
    pages: layout.pages.map((item) => {
      if (!inFamily(item)) return item;
      const dropped = dropPlacement(item, draggedId);
      return intoStack ? dropped : renamePlacement(dropped, ontoId, stackId);
    }),
  };
}

/**
 * Takes `memberId` out of the stack: it goes back on the page (nearest free place, else the
 * first page with room); a stack left with one widget gives way to that widget.
 */
export function unstackWidgetInLayout(
  layout: LauncherLayout,
  ctx: LayoutContext,
  pageId: string,
  stackId: string,
  memberId: string
): LauncherLayout | null {
  const stack = layout.stacks?.[stackId];
  if (!stack || !stack.ids.includes(memberId)) return null;
  const rest = stack.ids.filter((id) => id !== memberId);
  const stacks = { ...(layout.stacks ?? {}) };
  let next: LauncherLayout = layout;
  if (rest.length <= 1) {
    delete stacks[stackId];
    // The widget left takes the place of the stack on every page of the family; with none left
    // the stack goes and its cells are free (an empty stack must not keep a place).
    const page = findPage(layout, pageId);
    const inFamily = page ? sameFamily(page) : (item: LauncherPage) => item.id === pageId;
    next = {
      ...layout,
      pages: layout.pages.map((item) => {
        if (!inFamily(item)) return item;
        return rest.length === 1
          ? renamePlacement(item, stackId, rest[0])
          : dropPlacement(item, stackId);
      }),
    };
  } else {
    stacks[stackId] = { ...stack, ids: rest };
  }
  next = { ...next, stacks };
  if (Object.keys(stacks).length === 0) delete next.stacks;
  return placeWidgetInLayout(next, ctx, pageId, memberId).layout;
}

/** Turns the automatic rotation of a stack on or off. */
export function setStackRotateInLayout(
  layout: LauncherLayout,
  stackId: string,
  rotate: boolean
): LauncherLayout {
  const stack = layout.stacks?.[stackId];
  if (!stack) return layout;
  const updated: WidgetStack = rotate ? { ...stack, rotate: true } : { ids: stack.ids };
  return { ...layout, stacks: { ...layout.stacks, [stackId]: updated } };
}

/** Widget ids of a layout's stack members, for the legacy page lists. */
export function expandStacks(layout: LauncherLayout, ids: readonly string[]): string[] {
  return ids.flatMap((id) => (isStackId(id) ? (layout.stacks?.[id]?.ids ?? []) : [id]));
}
