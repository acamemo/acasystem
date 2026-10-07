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
  WidgetSizes,
} from '@/@types/launcher';
import { DEVICE_CLASSES } from './deviceClass';
import {
  cellInGrid,
  clampSize,
  findFreeRect,
  findFreeRectAtCell,
  findFreeRectShrinking,
  idsByPosition,
  isFree,
  packItems,
  rectFits,
  samePlacements,
  tryMove,
  type PackItem,
  type Placements,
} from './grid';
import { continuationLabel, createPageId } from './pageIdentity';

export interface LayoutContext {
  deviceClass: DeviceClass;
  grids: LauncherGrids;
  /** Size limits of a widget on a page; undefined when no definition matches. */
  sizesOf?: (widgetId: string, pageId: string) => WidgetSizes | undefined;
}

/** Size used when neither the caller nor a definition gives one: a 2×2 widget. */
export const FALLBACK_WIDGET_SIZE: CellSize = { w: 2, h: 2 };

export function createEmptyLayout(): LauncherLayout {
  return { version: 1, cover: { enabled: true }, pages: [] };
}

export function findPage(layout: LauncherLayout, pageId: string): LauncherPage | undefined {
  return layout.pages.find((page) => page.id === pageId);
}

export function pagePlacements(page: LauncherPage, deviceClass: DeviceClass): Placements {
  return page.placements[deviceClass] ?? {};
}

/** Every widget of the page in any device class, current class first in reading order. */
export function pageWidgetIds(page: LauncherPage, deviceClass?: DeviceClass): string[] {
  const order = deviceClass
    ? [deviceClass, ...DEVICE_CLASSES.filter((item) => item !== deviceClass)]
    : [...DEVICE_CLASSES];
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

/** Placements of `page` for `deviceClass`, packed from the first class that has them. */
export function materializePage(
  page: LauncherPage,
  deviceClass: DeviceClass,
  ctx: LayoutContext
): { placements: Placements; overflow: PackItem[] } {
  const reference = DEVICE_CLASSES.find(
    (item) => item !== deviceClass && page.placements[item] !== undefined
  );
  if (!reference) return { placements: {}, overflow: [] };
  const source = page.placements[reference] ?? {};
  const grid = ctx.grids[deviceClass];
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

/** Every class except `deviceClass` explicitly empty: used by continuation pages. */
function emptyOtherClasses(deviceClass: DeviceClass, placements: Placements) {
  const result: LauncherPage['placements'] = {};
  for (const item of DEVICE_CLASSES) result[item] = item === deviceClass ? placements : {};
  return result;
}

/**
 * Makes sure every widget page has placements for the class. Overflowing widgets go to new
 * continuation pages right after their page. Returns the same layout when nothing changes.
 */
export function ensureDeviceClass(layout: LauncherLayout, ctx: LayoutContext): LauncherLayout {
  const { deviceClass } = ctx;
  const grid = ctx.grids[deviceClass];
  let changed = false;
  const pages: LauncherPage[] = [];
  const ids = new Set(layout.pages.map((page) => page.id));
  const labels = layout.pages.map((page) => page.label);
  /** Every page as it is now: already processed ones and new continuations included. */
  const latest = new Map(layout.pages.map((page) => [page.id, page]));

  for (const page of layout.pages) {
    if (page.kind !== 'widgets') {
      pages.push(page);
      continue;
    }
    const familyId = page.continuationOf ?? page.id;
    const inFamily = (item: LauncherPage) => (item.continuationOf ?? item.id) === familyId;
    const others = [...latest.values()].filter((item) => item.id !== page.id);
    const elsewhere = new Set(
      others.filter(inFamily).flatMap((item) => Object.keys(item.placements[deviceClass] ?? {}))
    );
    // Arranged per class before membership was shared (old continuation pages without a
    // family marker, moves saved by the earlier build): another page has the widget in this
    // class and its whole family lacks it in a class where this page has it. Keep it there
    // instead of duplicating. The check spans the family because a continuation is explicitly
    // empty in the other classes: that alone is not a per-class move.
    const arrangedElsewhere = (id: string) => {
      const here = DEVICE_CLASSES.filter((item) => page.placements[item]?.[id]);
      return others.some((other) => {
        if (inFamily(other) || !other.placements[deviceClass]?.[id]) return false;
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
    const current = page.placements[deviceClass];
    const placements: Placements = {};
    const overflow: PackItem[] = [];
    for (const id of idsByPosition(current ?? {})) {
      const original = current![id];
      const sizes = sizesFor(ctx, id, page.id);
      const limited = { ...original, ...clampSize(original, grid, sizes) };
      if (rectFits(limited, grid) && isFree(placements, limited)) placements[id] = limited;
      else overflow.push({ id, size: clampSize(original, grid, sizes), min: sizes?.min });
    }
    const missing = pageWidgetIds(page).filter((id) => !current?.[id] && !elsewhere.has(id));
    for (const id of missing) {
      if (arrangedElsewhere(id)) continue;
      const source = DEVICE_CLASSES.map((item) => page.placements[item]?.[id]).find(Boolean);
      if (!source) continue;
      const sizes = sizesFor(ctx, id, page.id);
      overflow.push({ id, size: clampSize(source, grid, sizes), min: sizes?.min });
    }
    const packedPage = packItems(overflow, grid, placements);
    const nextPage = withPlacements(page, deviceClass, packedPage.placements);
    if (nextPage !== page) changed = true;
    pages.push(nextPage);
    latest.set(nextPage.id, nextPage);
    let rest = packedPage.overflow;
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
        placements: emptyOtherClasses(deviceClass, packed.placements),
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
  if (!page || page.kind !== 'widgets') return { layout, pageId, placed: false };
  const { deviceClass, grids } = ctx;
  const sizes = sizesFor(ctx, widgetId, pageId);
  const wanted = size ?? sizes?.default ?? FALLBACK_WIDGET_SIZE;
  const current = pagePlacements(page, deviceClass);
  if (current[widgetId]) return { layout, pageId, placed: true };

  const grid = grids[deviceClass];
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
      for (const item of DEVICE_CLASSES) {
        const other = target.placements[item];
        if (item === deviceClass || !other || other[widgetId]) continue;
        const otherGrid = grids[item];
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
    for (const item of DEVICE_CLASSES) {
      if (page.placements[item] !== undefined) {
        repaired = ensureDeviceClass(repaired, { ...ctx, deviceClass: item });
      }
    }
    return { layout: repaired, pageId, placed: true };
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
  const current = pagePlacements(page, ctx.deviceClass);
  if (!current[widgetId]) return null;
  const grid = ctx.grids[ctx.deviceClass];
  const target = clampRect(to, grid, sizesFor(ctx, widgetId, pageId));
  const next = tryMove(current, grid, widgetId, target);
  if (!next) return null;
  return replacePage(layout, pageId, (item) => withPlacements(item, ctx.deviceClass, next));
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
  const rect = page ? pagePlacements(page, ctx.deviceClass)[widgetId] : undefined;
  if (!rect) return null;
  return moveWidgetInLayout(layout, ctx, pageId, widgetId, {
    x: rect.x,
    y: rect.y,
    w: size.w,
    h: size.h,
  });
}

/**
 * Moves page membership in every class, keeping each class's dimensions. A class whose
 * destination is full gets a continuation instead of a stale copy on the source page.
 */
export function moveWidgetToPageInLayout(
  layout: LauncherLayout,
  ctx: LayoutContext,
  fromPageId: string,
  toPageId: string,
  widgetId: string,
  to?: CellRect
): LauncherLayout | null {
  if (fromPageId === toPageId) {
    return to ? moveWidgetInLayout(layout, ctx, fromPageId, widgetId, to) : layout;
  }
  const { deviceClass } = ctx;
  const source = findPage(layout, fromPageId);
  const target = findPage(layout, toPageId);
  if (!source || !target || target.kind !== 'widgets') return null;
  const sourcePlacements = pagePlacements(source, deviceClass);
  const rect = sourcePlacements[widgetId];
  if (!rect) return null;
  const targetPlacements = pagePlacements(target, deviceClass);
  if (targetPlacements[widgetId]) return null;
  const grid = ctx.grids[deviceClass];
  const sizes = sizesFor(ctx, widgetId, toPageId);
  let nextTarget: Placements | null;
  if (to) {
    nextTarget = tryMove(targetPlacements, grid, widgetId, clampRect(to, grid, sizes));
  } else {
    const free = findFreeRectShrinking(
      targetPlacements,
      grid,
      clampSize(rect, grid, sizes),
      sizes?.min
    );
    nextTarget = free ? { ...targetPlacements, [widgetId]: free } : null;
  }
  if (!nextTarget) return null;
  const sourceFamily = source.continuationOf ?? source.id;
  let moved: LauncherLayout = {
    ...layout,
    pages: layout.pages.map((page) => {
      if ((page.continuationOf ?? page.id) === sourceFamily) {
        const placements = { ...page.placements };
        for (const item of DEVICE_CLASSES) {
          if (!placements[item]?.[widgetId]) continue;
          const { [widgetId]: _moved, ...remaining } = placements[item];
          placements[item] = remaining;
        }
        if (page.id === toPageId) placements[deviceClass] = nextTarget;
        return { ...page, placements };
      }
      if (page.id === toPageId) return withPlacements(page, deviceClass, nextTarget);
      return page;
    }),
  };
  for (const item of DEVICE_CLASSES) {
    if (item === deviceClass) continue;
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
        ctx.grids[item],
        clampSize(original, ctx.grids[item], sizes),
        sizes?.min
      );
      return free ? withPlacements(page, item, { ...other, [widgetId]: free }) : page;
    });
    moved = ensureDeviceClass(moved, { ...ctx, deviceClass: item });
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
      for (const item of DEVICE_CLASSES) {
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

export function updatePageInLayout(
  layout: LauncherLayout,
  pageId: string,
  patch: Partial<Pick<LauncherPage, 'label' | 'icon' | 'hidden'>>
): LauncherLayout {
  return replacePage(layout, pageId, (page) => {
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
}

/** The legacy home page and the last remaining page cannot be removed. */
export function canRemovePage(layout: LauncherLayout, pageId: string): boolean {
  return pageId !== 'home' && layout.pages.length > 1 && Boolean(findPage(layout, pageId));
}

export function removePageFromLayout(layout: LauncherLayout, pageId: string): LauncherLayout {
  if (!canRemovePage(layout, pageId)) return layout;
  // The continuations of a removed page keep their own family, rooted on the first one: a
  // later page that reuses the id must not share their widgets.
  let root: string | undefined;
  const pages = layout.pages
    .filter((page) => page.id !== pageId)
    .map((page) => {
      if (page.continuationOf !== pageId) return page;
      if (root === undefined) {
        root = page.id;
        const { continuationOf: _removed, ...rest } = page;
        return rest;
      }
      return { ...page, continuationOf: root };
    });
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

export function setCoverInLayout(layout: LauncherLayout, enabled: boolean): LauncherLayout {
  return layout.cover.enabled === enabled ? layout : { ...layout, cover: { enabled } };
}
