/**
 * Columns per page and dynamic gap (REP-20261008-001, increment C): the gap of each axis takes
 * the spare space, the rows follow the columns on a fixed reference area per class, each page
 * keeps its placements under the key of its own grid, the Lenovo in Chrome shows 8×2 seeded from
 * its 6×2, the cover has three columns.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type {
  BaseDeviceClass,
  DeviceClass,
  LauncherLayout,
  LauncherPage,
  WidgetDefinition,
  WidgetProps,
} from '@/@types/launcher';
import { applySnapshot, collectSnapshot } from '@/api/snapshot';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { useWidgetDrag, type DragSession } from '@/hooks/launcher/useWidgetDrag';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import {
  BASE_DEVICE_CLASSES,
  DEFAULT_GRIDS,
  cellMetrics,
  columnsKey,
  columnsOn,
  columnsToStore,
  deviceClassFor,
  gridFor,
  landscapeFits,
  placementKey,
  rectToBox,
  rowsOn,
} from '@/utils/launcher/deviceClass';
import { packItems, rectFits, rectsOverlap, type Placements } from '@/utils/launcher/grid';
import {
  COVER_PAGE_ID,
  coverPageOf,
  coverRects,
  defaultCoverPage,
  dropEmptyContinuations,
  ensureDeviceClass,
  moveWidgetInLayout,
  moveWidgetToPageInLayout,
  pageClass,
  placeWidgetInLayout,
  removePageFromLayout,
  removeWidgetFromLayout,
  resizeWidgetInLayout,
  stackWidgetsInLayout,
  unstackWidgetInLayout,
  updatePageInLayout,
  withCoverPage,
  type LayoutContext,
} from '@/utils/launcher/layout';
import { layoutToPagesConfig } from '@/utils/launcher/legacySync';
import { pagerEntries } from '@/utils/launcher/pager';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { isLauncherLayout, sanitizeLauncherLayout } from '@/validators/launcher';

const one = { min: { w: 1, h: 1 }, max: { w: 4, h: 4 }, default: { w: 1, h: 1 } };
const ctxFor = (deviceClass: DeviceClass): LayoutContext => ({
  deviceClass,
  grids: DEFAULT_GRIDS,
  sizesOf: () => one,
});
const cell = (x: number, y: number) => ({ x, y, w: 1, h: 1 });
const widgetsPage = (
  id: string,
  placements: LauncherPage['placements'],
  extra: Partial<LauncherPage> = {}
): LauncherPage => ({
  id,
  label: id === 'home' ? 'Casa' : id,
  kind: 'widgets',
  placements,
  ...extra,
});
const layoutOf = (...pages: LauncherPage[]): LauncherLayout => ({
  version: 1,
  cover: { enabled: false },
  pages,
});

describe('gap dinamico (C.1)', () => {
  it('fills the area: the spare width goes to the gaps, the cell does not change', () => {
    // Lenovo Tab M11 in Chrome: grid area 973×230 measured on the screenshots, 8×2, DPR 1.875.
    const metrics = cellMetrics(973, 230, { w: 8, h: 2 }, 10, 1.875);
    expect(metrics.cell).toBe(110);
    expect(metrics.gapY).toBe(10);
    expect(metrics.gapX).toBeGreaterThan(10);
    expect(metrics.width).toBeLessThanOrEqual(973);
    expect(metrics.width).toBeGreaterThan(973 - 7 / 1.875);
    expect(metrics.height).toBe(230);
    // Snapped to device pixels.
    expect(metrics.gapX * 1.875).toBeCloseTo(Math.round(metrics.gapX * 1.875), 6);
  });

  it('caps the gap at half a cell: beyond it the grid is centred with margins', () => {
    const metrics = cellMetrics(1000, 300, { w: 2, h: 2 }, 10);
    expect(metrics).toMatchObject({ cell: 145, gapX: 72, gapY: 10 });
    expect(metrics.width).toBe(362);
    expect(metrics.width).toBeLessThan(1000);
  });

  it('one column or one row: no gap on that axis', () => {
    expect(cellMetrics(300, 1000, { w: 1, h: 3 }, 10)).toMatchObject({ cell: 300, gapX: 0 });
    expect(cellMetrics(973, 230, { w: 3, h: 1 }, 10)).toMatchObject({ cell: 230, gapY: 0 });
  });

  it('an area of 0 (jsdom, Sistema open) gives cell 0 and the minimum gaps', () => {
    expect(cellMetrics(0, 0, { w: 8, h: 5 }, 16)).toMatchObject({ cell: 0, gapX: 16, gapY: 16 });
  });

  it('snaps the gaps to the pixel ratio (1.5) and never below the minimum', () => {
    const metrics = cellMetrics(973, 230, { w: 8, h: 2 }, 10, 1.5);
    expect(metrics.gapX).toBeCloseTo(19 / 1.5, 6);
    expect(cellMetrics(1000, 600, { w: 8, h: 5 }, 16, 1.5).gapY).toBe(16);
  });

  it('places rectangles with a step per axis', () => {
    expect(rectToBox({ x: 2, y: 1, w: 2, h: 1 }, { cell: 100, gapX: 40, gapY: 10 })).toEqual({
      left: 280,
      top: 110,
      width: 240,
      height: 100,
    });
  });

  it('the Lenovo in Chrome is a landscape phone, in full screen a tablet', () => {
    expect(deviceClassFor(960, 445)).toBe('phoneLandscape');
    expect(deviceClassFor(1024, 472)).toBe('phoneLandscape');
    expect(deviceClassFor(960, 600)).toBe('tablet');
    expect(deviceClassFor(1024, 640)).toBe('tablet');
  });
});

describe('trascinamento con gapX ≠ gapY (C.1)', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // By default 4 × 2 cells of 100 px; 40 px between columns, 10 px between rows.
  const setup = (
    placements: Placements,
    geometry = { cell: 100, gapX: 40, gapY: 10, grid: { w: 4, h: 2 } }
  ) => {
    const onDrop = vi.fn<(session: DragSession) => void>();
    const hook = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => ({ left: 0, top: 0, ...geometry }),
        getPlacements: () => placements,
        sizesFor: () => one,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
      })
    );
    const move = (x: number, y: number) => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
      act(() => vi.advanceTimersByTime(20));
    };
    return { ...hook, onDrop, move };
  };

  it('snaps a move on the step of each axis', () => {
    const { result, move } = setup({ a: cell(0, 0) });
    act(() =>
      result.current.begin({
        mode: 'move',
        widgetId: 'a',
        label: 'Luce',
        pageId: 'home',
        origin: cell(0, 0),
        box: { left: 0, top: 0, width: 100, height: 100 },
        clientX: 50,
        clientY: 50,
        pointerId: 1,
      })
    );
    move(60, 50);
    // 290 px across is 2.07 columns of 140 px; 60 px down is 0.55 rows of 110 px.
    move(340, 110);
    expect(result.current.session?.target?.rect).toEqual(cell(2, 1));
  });

  it('measures the middle of a widget for a stack on its box in px', () => {
    const { result, move } = setup({ a: cell(0, 0), b: { x: 2, y: 0, w: 2, h: 1 } });
    act(() =>
      result.current.begin({
        mode: 'move',
        widgetId: 'a',
        label: 'Luce',
        pageId: 'home',
        origin: cell(0, 0),
        box: { left: 0, top: 0, width: 100, height: 100 },
        clientX: 50,
        clientY: 50,
        pointerId: 1,
      })
    );
    move(60, 50);
    // b spans 280-520 px: 400 is its middle, 470 is in its last quarter.
    move(400, 50);
    expect(result.current.session?.target?.stackOn).toBe('b');
    move(470, 50);
    expect(result.current.session?.target?.stackOn).toBeUndefined();
  });

  /*
   * Small cells (40 px, steps of 50 px across and 60 px down), so a grip far from its side
   * would jump with a line measured from the grid, (pointer − left + gap/2) / step: 32 px
   * outside the left side of x = 2 (100 px) is (68 + 5) / 50 = 1.46, one column off.
   */
  const small = { cell: 40, gapX: 10, gapY: 20, grid: { w: 6, h: 3 } };
  const resize = (
    result: { current: ReturnType<typeof useWidgetDrag> },
    edge: { x: -1 | 0 | 1; y: -1 | 0 | 1 },
    origin: { x: number; y: number; w: number; h: number },
    clientX: number,
    clientY: number
  ) =>
    act(() =>
      result.current.begin({
        mode: 'resize',
        edge,
        widgetId: 'a',
        label: 'Luce',
        pageId: 'home',
        origin,
        box: { left: origin.x * 50, top: origin.y * 60, width: 40, height: 40 },
        clientX,
        clientY,
        pointerId: 1,
      })
    );

  it('resizing from a grip 32 px outside the left side does not jump', () => {
    const origin = { x: 2, y: 1, w: 1, h: 1 };
    const { result, move, onDrop } = setup({ a: origin }, small);
    resize(result, { x: -1, y: 0 }, origin, 68, 80);
    move(60, 80);
    expect(result.current.session?.target?.rect).toEqual(origin);
    // One column step to the left: the left side moves one column, the right side stays.
    move(68 - 50, 80);
    expect(result.current.session?.target?.rect).toEqual({ x: 1, y: 1, w: 2, h: 1 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 18, clientY: 80 });
    expect(onDrop.mock.calls[0][0].target?.rect).toEqual({ x: 1, y: 1, w: 2, h: 1 });
  });

  it('resizing from a grip 24 px inside the right side does not jump', () => {
    const origin = { x: 1, y: 1, w: 2, h: 1 };
    const { result, move } = setup({ a: origin }, small);
    // The right side is at 140 px; from the grid the line would be (108 + 5) / 50 = 2.26.
    resize(result, { x: 1, y: 0 }, origin, 116, 80);
    move(108, 80);
    expect(result.current.session?.target?.rect).toEqual(origin);
    move(116 + 50, 80);
    expect(result.current.session?.target?.rect).toEqual({ x: 1, y: 1, w: 3, h: 1 });
  });

  it('resizing up follows the step of the rows, not of the columns', () => {
    const origin = { x: 2, y: 1, w: 1, h: 1 };
    const { result, move } = setup({ a: origin }, small);
    resize(result, { x: 0, y: -1 }, origin, 120, 20);
    // 27 px up: 0.45 of a row of 60 px (0.54 of a column of 50 px): the side stays.
    move(120, 20 - 27);
    expect(result.current.session?.target?.rect).toEqual(origin);
    move(120, 20 - 33);
    expect(result.current.session?.target?.rect).toEqual({ x: 2, y: 0, w: 1, h: 2 });
  });
});

describe('colonne per pagina: funzioni pure (C.2)', () => {
  it('columns shown on each screen class', () => {
    const shown = (base: BaseDeviceClass) =>
      [2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => columnsOn(base, c));
    expect(shown('tablet')).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(shown('phoneLandscape')).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 9]);
    expect(shown('tabletPortrait')).toEqual([2, 2, 3, 4, 5, 5, 6, 6, 6]);
    expect(shown('phone')).toEqual([2, 2, 2, 3, 3, 4, 4, 4, 4]);
  });

  it('rows from the reference area of each class', () => {
    const rows = (base: BaseDeviceClass, list: number[]) => list.map((c) => rowsOn(base, c));
    expect(rows('phoneLandscape', [2, 3, 4, 5, 6, 7, 8, 9])).toEqual([1, 1, 1, 1, 1, 2, 2, 2]);
    expect(rows('tablet', [2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5]);
    expect(rows('tabletPortrait', [2, 3, 4, 5, 6])).toEqual([2, 3, 4, 5, 6]);
    expect(rows('phone', [2, 3, 4])).toEqual([3, 5, 6]);
  });

  it('the stored columns of the columns shown', () => {
    expect(columnsToStore('phoneLandscape', 7)).toBe(7);
    expect(columnsToStore('phone', 3)).toBe(6);
    expect(columnsToStore('tabletPortrait', 6)).toBe(8);
    expect(columnsToStore('phone', 1)).toBe(2);
  });

  it('a grid of a density keeps the key of the class; the others name their grid', () => {
    expect(placementKey('phoneLandscape', { w: 6, h: 2 }, DEFAULT_GRIDS)).toBe('phoneLandscape');
    expect(placementKey('phoneLandscape', { w: 8, h: 3 }, DEFAULT_GRIDS)).toBe(
      'phoneLandscape@wide'
    );
    expect(columnsKey('phone', 8, DEFAULT_GRIDS)).toBe('phone');
    expect(columnsKey('phone', 6, DEFAULT_GRIDS)).toBe('phone@compact');
    expect(columnsKey('phoneLandscape', 8, DEFAULT_GRIDS)).toBe('phoneLandscape@8x2');
    expect(columnsKey('tablet', 8, DEFAULT_GRIDS)).toBe('tablet@8x4');
    // On the area measured on the Lenovo (973×230) six columns make one row, not the 6×2 of the
    // class: the arrangement under `phoneLandscape` is not reached from the columns (to confirm).
    expect(columnsKey('phoneLandscape', 6, DEFAULT_GRIDS)).toBe('phoneLandscape@6x1');
  });

  it('a key always gives the same grid, whatever the grids of the classes', () => {
    const other = { ...DEFAULT_GRIDS, phoneLandscape: { w: 3, h: 3 } };
    expect(gridFor(DEFAULT_GRIDS, 'phoneLandscape@8x2')).toEqual({ w: 8, h: 2 });
    expect(gridFor(other, 'phoneLandscape@8x2')).toEqual({ w: 8, h: 2 });
  });

  it('the places of the cover on two columns and on one', () => {
    expect(coverRects({ w: 2, h: 3 })).toEqual([
      { x: 0, y: 0, w: 2, h: 1 },
      cell(0, 1),
      cell(1, 1),
    ]);
    expect(coverRects({ w: 1, h: 3 })).toEqual([cell(0, 0), cell(0, 1), cell(0, 2)]);
    expect(coverRects({ w: 3, h: 1 })).toEqual([cell(0, 0), cell(1, 0), cell(2, 0)]);
  });

  it('packs after a reading index first, then into the holes', () => {
    const initial = { a: cell(0, 0), b: cell(2, 0) };
    const items = [
      { id: 'c', size: { w: 1, h: 1 } },
      { id: 'd', size: { w: 1, h: 1 } },
      { id: 'e', size: { w: 1, h: 1 } },
    ];
    const packed = packItems(items, { w: 3, h: 2 }, initial, { from: 3 });
    expect(packed.placements).toMatchObject({ c: cell(0, 1), d: cell(1, 1), e: cell(2, 1) });
    const full = packItems([...items, { id: 'f', size: { w: 1, h: 1 } }], { w: 3, h: 2 }, initial, {
      from: 3,
    });
    expect(full.placements.f).toEqual(cell(1, 0));
  });
});

describe('colonne per pagina: disposizione (C.2, C.5)', () => {
  it('a layout without columns, away from the landscape phone at normal density, stays the same', () => {
    const layout = layoutOf(
      widgetsPage('home', {
        tablet: { a: { x: 0, y: 0, w: 2, h: 2 } },
        phone: { a: { x: 0, y: 0, w: 2, h: 2 } },
        'phoneLandscape@compact': { a: { x: 0, y: 0, w: 2, h: 2 } },
      })
    );
    expect(ensureDeviceClass(layout, ctxFor('tablet'))).toBe(layout);
    expect(ensureDeviceClass(layout, ctxFor('phone'))).toBe(layout);
    expect(ensureDeviceClass(layout, ctxFor('phoneLandscape@compact'))).toBe(layout);
  });

  it('the Lenovo layout under phoneLandscape seeds phoneLandscape@8x2 with the same places', () => {
    const saved: Placements = {
      clock: { x: 0, y: 0, w: 2, h: 2 },
      light: cell(2, 0),
      climate: { x: 3, y: 0, w: 2, h: 1 },
      sensor: cell(5, 1),
    };
    const layout = layoutOf(widgetsPage('home', { phoneLandscape: saved }));
    const next = ensureDeviceClass(layout, ctxFor('phoneLandscape'));
    expect(next.pages).toHaveLength(1);
    expect(next.pages[0].placements['phoneLandscape@8x2']).toEqual(saved);
    expect(next.pages[0].placements.phoneLandscape).toBe(saved);
    expect(ensureDeviceClass(next, ctxFor('phoneLandscape'))).toBe(next);
  });

  it('from 8 to 7 columns: what does not fit goes after the last widget, not into a hole', () => {
    const row: Placements = {};
    for (const x of [0, 1, 3, 4, 5, 6, 7]) row[`w${x}`] = cell(x, 0);
    const layout = layoutOf(widgetsPage('home', { 'phoneLandscape@8x2': row }, { columns: 8 }));
    const ctx = ctxFor('phoneLandscape');
    const changed = updatePageInLayout(layout, 'home', { columns: 7 });
    const next = ensureDeviceClass(changed, ctx, { home: pageClass(layout, layout.pages[0], ctx) });
    const placements = next.pages[0].placements['phoneLandscape@7x2']!;
    expect(placements.w6).toEqual(cell(6, 0));
    expect(placements.w7).toEqual(cell(0, 1));
    expect(next.pages).toHaveLength(1);
  });

  it('from 8 to 7 columns on a full page: the rest goes to a continuation of the family', () => {
    const full: Placements = {};
    for (let y = 0; y < 2; y += 1) for (let x = 0; x < 8; x += 1) full[`w${x}_${y}`] = cell(x, y);
    const layout = layoutOf(widgetsPage('home', { 'phoneLandscape@8x2': full }, { columns: 8 }));
    const ctx = ctxFor('phoneLandscape');
    const changed = updatePageInLayout(layout, 'home', { columns: 7 });
    const next = ensureDeviceClass(changed, ctx, { home: 'phoneLandscape@8x2' });
    expect(next.pages).toHaveLength(2);
    const continuation = next.pages[1];
    expect(continuation.continuationOf).toBe('home');
    expect(Object.keys(continuation.placements['phoneLandscape@7x2']!).sort()).toEqual([
      'w7_0',
      'w7_1',
    ]);
    // The continuation is explicitly empty under the other keys of the family.
    expect(continuation.placements['phoneLandscape@8x2']).toEqual({});
    // It uses the grid of its family.
    expect(pageClass(next, continuation, ctx)).toBe('phoneLandscape@7x2');
  });

  it('columns go to the first page of the family, kept in range; null removes them', () => {
    const layout = layoutOf(
      widgetsPage('home', {}),
      widgetsPage('home_2', {}, { continuationOf: 'home' }),
      { id: 'luci', label: 'Luci', kind: 'lights', placements: {} }
    );
    const set = updatePageInLayout(layout, 'home_2', { columns: 12.4 });
    expect(set.pages[0].columns).toBe(10);
    expect(set.pages[1].columns).toBeUndefined();
    expect(updatePageInLayout(set, 'home', { columns: 10 })).toBe(set);
    expect(updatePageInLayout(set, 'home', { columns: null }).pages[0].columns).toBeUndefined();
    expect(updatePageInLayout(layout, 'luci', { columns: 4 })).toBe(layout);
  });

  it('the columns pass to the new first page when the first one is removed', () => {
    const layout = layoutOf(
      widgetsPage('home', {}),
      widgetsPage('luci', {}, { columns: 5 }),
      widgetsPage('luci_2', {}, { continuationOf: 'luci' }),
      widgetsPage('luci_3', {}, { continuationOf: 'luci' })
    );
    const next = removePageFromLayout(layout, 'luci');
    expect(next.pages.find((page) => page.id === 'luci_2')).toMatchObject({ columns: 5 });
    expect(next.pages.find((page) => page.id === 'luci_2')?.continuationOf).toBeUndefined();
    expect(next.pages.find((page) => page.id === 'luci_3')).toMatchObject({
      continuationOf: 'luci_2',
    });
  });

  it('removing and moving a widget leave no copy under the keys of the grids', () => {
    const layout = layoutOf(
      widgetsPage('home', {
        tablet: { a: cell(0, 0), b: cell(1, 0) },
        'phoneLandscape@8x2': { a: cell(0, 0), b: cell(1, 0) },
      }),
      widgetsPage('altra', { 'phoneLandscape@4x1': {} }, { columns: 4 })
    );
    const removed = removeWidgetFromLayout(layout, 'home', 'a');
    expect(removed.pages[0].placements['phoneLandscape@8x2']).toEqual({ b: cell(1, 0) });
    expect(removed.pages[0].placements.tablet).toEqual({ b: cell(1, 0) });

    const moved = moveWidgetToPageInLayout(layout, ctxFor('phoneLandscape'), 'home', 'altra', 'b')!;
    const [home, altra] = moved.pages;
    expect(home.placements['phoneLandscape@8x2']?.b).toBeUndefined();
    expect(home.placements.tablet?.b).toBeUndefined();
    expect(altra.placements['phoneLandscape@4x1']?.b).toBeDefined();
  });

  it('the cover has three columns on every screen class, inside its grid', () => {
    const layout: LauncherLayout = {
      ...layoutOf(widgetsPage('home', {})),
      cover: { enabled: true },
    };
    const cover = coverPageOf(layout, DEFAULT_GRIDS);
    const expected: Record<BaseDeviceClass, DeviceClass> = {
      tablet: 'tablet@3x1',
      phoneLandscape: 'phoneLandscape@3x1',
      tabletPortrait: 'tabletPortrait@2x2',
      phone: 'phone@2x3',
    };
    for (const base of BASE_DEVICE_CLASSES) {
      const key = pageClass(layout, cover, ctxFor(base));
      expect(key).toBe(expected[base]);
      const rects = Object.values(defaultCoverPage(DEFAULT_GRIDS).placements[key] ?? {});
      expect(rects).toHaveLength(3);
      for (const rect of rects) expect(rectFits(rect, gridFor(DEFAULT_GRIDS, key))).toBe(true);
      rects.forEach((a, i) =>
        rects.slice(i + 1).forEach((b) => expect(rectsOverlap(a, b)).toBe(false))
      );
    }
  });

  it('a cover saved by an earlier build gets three columns once, if it has up to three widgets (C.5)', () => {
    const ctx = ctxFor('tablet');
    const four: LauncherPage = {
      id: COVER_PAGE_ID,
      label: 'Copertina',
      kind: 'cover',
      placements: { tablet: { a: cell(0, 0), b: cell(1, 0), c: cell(2, 0), d: cell(3, 0) } },
    };
    const many: LauncherLayout = {
      ...layoutOf(widgetsPage('home', { tablet: {} }), four),
      cover: { enabled: true },
    };
    // More than three widgets: it stays as it is.
    expect(ensureDeviceClass(many, ctx)).toBe(many);

    const three: LauncherPage = {
      ...four,
      placements: { tablet: { a: { x: 4, y: 0, w: 2, h: 2 }, b: cell(0, 0), c: cell(1, 0) } },
    };
    const few: LauncherLayout = {
      ...layoutOf(widgetsPage('home', { tablet: {} }), three),
      cover: { enabled: true },
    };
    const next = ensureDeviceClass(few, ctx);
    const cover = next.pages[1];
    expect(cover.columns).toBe(3);
    expect(pageClass(next, cover, ctx)).toBe('tablet@3x1');
    // The three places in the reading order of the grid shown until now (b, c, a).
    expect(cover.placements['tablet@3x1']).toEqual({ b: cell(0, 0), c: cell(1, 0), a: cell(2, 0) });
    expect(cover.placements.tablet).toBe(three.placements.tablet);
    expect(ensureDeviceClass(next, ctx)).toBe(next);
    // Stored: one widget less keeps the three columns, and so would one more.
    const fewer = removeWidgetFromLayout(next, COVER_PAGE_ID, 'c');
    expect(pageClass(fewer, fewer.pages[1], ctx)).toBe('tablet@3x1');
  });

  it('the columns of the cover never go under three', () => {
    const layout: LauncherLayout = {
      ...layoutOf(widgetsPage('home', {})),
      cover: { enabled: true },
    };
    const stored = withCoverPage(layout, DEFAULT_GRIDS);
    expect(updatePageInLayout(stored, COVER_PAGE_ID, { columns: 2 }).pages[1].columns).toBe(3);
    expect(updatePageInLayout(stored, COVER_PAGE_ID, { columns: 5 }).pages[1].columns).toBe(5);
  });

  it('three columns chosen on such a cover start from the arrangement shown before', () => {
    const three: LauncherPage = {
      id: COVER_PAGE_ID,
      label: 'Copertina',
      kind: 'cover',
      placements: { tablet: { a: { x: 4, y: 0, w: 2, h: 2 }, b: cell(0, 0), c: cell(1, 0) } },
    };
    const few: LauncherLayout = {
      ...layoutOf(widgetsPage('home', { tablet: {} }), three),
      cover: { enabled: true },
    };
    const chosen = updatePageInLayout(few, COVER_PAGE_ID, { columns: 3 });
    expect(chosen.pages[1].columns).toBe(3);
    const next = ensureDeviceClass(chosen, ctxFor('tablet'), { [COVER_PAGE_ID]: 'tablet' });
    // The three places in the reading order of the arrangement shown before (b, c, a).
    expect(next.pages[1].placements['tablet@3x1']).toEqual({
      b: cell(0, 0),
      c: cell(1, 0),
      a: cell(2, 0),
    });
    expect(next.pages).toHaveLength(2);
  });
});

describe('semina e continuazioni senza doppioni né pagine nuove (revisione di C)', () => {
  const ids = (count: number, from = 0) => Array.from({ length: count }, (_, i) => `w${from + i}`);
  /** Widgets of 1×1 in reading order on rows of `w` cells. */
  const rows = (list: string[], w: number): Placements =>
    Object.fromEntries(list.map((id, i) => [id, cell(i % w, Math.floor(i / w))]));
  /** Widgets of the family of `root` under `key`, with their repetitions. */
  const inFamily = (layout: LauncherLayout, root: string, key: DeviceClass) =>
    layout.pages
      .filter((page) => (page.continuationOf ?? page.id) === root)
      .flatMap((page) => Object.keys(page.placements[key] ?? {}));

  it('a family on the tablet with a 6×2 continuation seeds 8×2 where each widget was', () => {
    // As the earlier build left it on the Lenovo after the PC filled the page (16 widgets).
    const layout = layoutOf(
      widgetsPage('home', { tablet: rows(ids(16), 8), phoneLandscape: rows(ids(12), 6) }),
      widgetsPage(
        'home_2',
        { tablet: {}, phoneLandscape: rows(ids(4, 12), 6) },
        { continuationOf: 'home' }
      )
    );
    const ctx = ctxFor('phoneLandscape');
    const next = ensureDeviceClass(layout, ctx);
    expect(next.pages).toHaveLength(2);
    const [home, rest] = next.pages;
    expect(home.placements['phoneLandscape@8x2']).toEqual(rows(ids(12), 6));
    expect(rest.placements['phoneLandscape@8x2']).toEqual(rows(ids(4, 12), 6));
    expect(ensureDeviceClass(next, ctx)).toBe(next);
  });

  it.each([
    [8, 9],
    [9, 8],
  ])('from %i to %i columns a family with a continuation keeps each widget once', (from, to) => {
    const key = columnsKey('phoneLandscape', from, DEFAULT_GRIDS);
    const width = gridFor(DEFAULT_GRIDS, key).w;
    const capacity = width * 2;
    const all = ids(capacity + 2);
    const layout = layoutOf(
      widgetsPage(
        'home',
        { tablet: rows(all, 8), [key]: rows(all.slice(0, capacity), width) },
        { columns: from }
      ),
      widgetsPage(
        'home_2',
        { tablet: {}, [key]: rows(all.slice(capacity), width) },
        { continuationOf: 'home' }
      )
    );
    const ctx = ctxFor('phoneLandscape');
    const changed = updatePageInLayout(layout, 'home', { columns: to });
    const next = ensureDeviceClass(changed, ctx, { home: key });
    const shown = inFamily(next, 'home', columnsKey('phoneLandscape', to, DEFAULT_GRIDS));
    expect([...shown].sort()).toEqual([...all].sort());
  });

  it('widgets 13 to 16 on a Lenovo page full on 6×2 make no new page', () => {
    const ctx = ctxFor('phoneLandscape');
    let layout = ensureDeviceClass(
      layoutOf(widgetsPage('home', { phoneLandscape: rows(ids(12), 6) })),
      ctx
    );
    for (const id of ['n1', 'n2', 'n3', 'n4']) {
      const placed = placeWidgetInLayout(layout, ctx, 'home', id, { w: 1, h: 1 });
      layout = ensureDeviceClass(placed.layout, ctx);
    }
    expect(layout.pages.map((page) => page.id)).toEqual(['home']);
    expect(Object.keys(layout.pages[0].placements['phoneLandscape@8x2']!)).toHaveLength(16);
  });

  it('moving a widget from the cover to a page makes no page and no key of the cover', () => {
    const ctx = ctxFor('phoneLandscape');
    const base: LauncherLayout = {
      ...layoutOf(
        widgetsPage('home', {
          'phoneLandscape@8x2': rows(ids(8), 8),
          phoneLandscape: rows(ids(8), 6),
        })
      ),
      cover: { enabled: true },
    };
    const layout = ensureDeviceClass(withCoverPage(base, DEFAULT_GRIDS), ctx);
    const moved = moveWidgetToPageInLayout(layout, ctx, COVER_PAGE_ID, 'home', 'cover_clock')!;
    const next = ensureDeviceClass(moved, ctx);
    expect(next.pages.map((page) => page.id)).toEqual(['home', COVER_PAGE_ID]);
    expect(next.pages[0].placements['phoneLandscape@8x2']?.cover_clock).toBeDefined();
    expect(Object.keys(next.pages[0].placements).sort()).toEqual([
      'phoneLandscape',
      'phoneLandscape@8x2',
    ]);
    // Two more widgets on «Casa»: still one page.
    let after = next;
    for (const id of ['n1', 'n2']) {
      after = ensureDeviceClass(placeWidgetInLayout(after, ctx, 'home', id).layout, ctx);
    }
    expect(after.pages).toHaveLength(2);
  });

  it('a cover of five widgets on five columns keeps all of them', () => {
    const cover: LauncherPage = {
      id: COVER_PAGE_ID,
      label: 'Copertina',
      kind: 'cover',
      placements: {
        phoneLandscape: {
          cover_clock: { x: 0, y: 0, w: 2, h: 2 },
          cover_calendar: { x: 2, y: 0, w: 2, h: 2 },
          cover_weather: { x: 4, y: 0, w: 2, h: 1 },
          a: cell(4, 1),
          b: cell(5, 1),
        },
      },
    };
    const layout: LauncherLayout = {
      ...layoutOf(widgetsPage('home', { phoneLandscape: {} }), cover),
      cover: { enabled: true },
    };
    const ctx = ctxFor('phoneLandscape');
    const changed = updatePageInLayout(layout, COVER_PAGE_ID, { columns: 5 });
    const next = ensureDeviceClass(changed, ctx, { [COVER_PAGE_ID]: 'phoneLandscape' });
    const key = pageClass(next, next.pages[1], ctx);
    expect(key).toBe('phoneLandscape@5x1');
    expect(Object.keys(next.pages[1].placements[key] ?? {}).sort()).toEqual([
      'a',
      'b',
      'cover_calendar',
      'cover_clock',
      'cover_weather',
    ]);
  });

  it('a fourth widget on the cover of the phone does not change its grid', () => {
    const ctx = ctxFor('phone');
    const layout = withCoverPage(
      { ...layoutOf(widgetsPage('home', { phone: {} })), cover: { enabled: true } },
      DEFAULT_GRIDS
    );
    const cover = layout.pages[1];
    expect(pageClass(layout, cover, ctx)).toBe('phone@2x3');
    const placed = placeWidgetInLayout(
      layout,
      ctx,
      COVER_PAGE_ID,
      'light.x',
      { w: 1, h: 1 },
      {
        x: 0,
        y: 2,
      }
    );
    expect(placed.pageId).toBe(COVER_PAGE_ID);
    const after = ensureDeviceClass(placed.layout, ctx);
    expect(pageClass(after, after.pages[1], ctx)).toBe('phone@2x3');
    expect(after.pages[1].placements['phone@2x3']).toEqual({
      ...cover.placements['phone@2x3'],
      'light.x': cell(0, 2),
    });
  });

  it('a landscape screen too narrow for 8 columns keeps the 6×2 of its class', () => {
    expect([1024, 844, 640].map((width) => landscapeFits(width, 8))).toEqual([true, true, false]);
    const page = widgetsPage('home', {});
    const layout = layoutOf(page);
    const at = (viewportWidth: number) =>
      pageClass(layout, page, { ...ctxFor('phoneLandscape'), viewportWidth });
    expect([at(640), at(844), at(1024)]).toEqual([
      'phoneLandscape',
      'phoneLandscape@8x2',
      'phoneLandscape@8x2',
    ]);
  });
});

describe('griglia nel CSS (C.1)', () => {
  let css = '';
  beforeAll(async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    css = fs
      .readFileSync('src/templates/launcher/launcher.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });
  const rule = (selector: string) =>
    new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(
      css
    )?.[1] ?? '';

  it('centres the grid in the page', () => {
    expect(rule('.aca-launcher-page')).toMatch(/place-items:\s*center/);
  });

  it('uses the gap of each axis for the size and the place of a rectangle', () => {
    const body = rule('.aca-launcher-drop.aca-m');
    expect(body).toMatch(
      /width:\s*calc\(var\(--aca-lw\) \* var\(--aca-cell\) \+ \(var\(--aca-lw\) - 1\) \* var\(--aca-gap-x\)\)/
    );
    expect(body).toMatch(
      /height:\s*calc\(var\(--aca-lh\) \* var\(--aca-cell\) \+ \(var\(--aca-lh\) - 1\) \* var\(--aca-gap-y\)\)/
    );
    expect(body).toMatch(/calc\(var\(--aca-lx\) \* \(var\(--aca-cell\) \+ var\(--aca-gap-x\)\)\)/);
    expect(body).toMatch(/calc\(var\(--aca-ly\) \* \(var\(--aca-cell\) \+ var\(--aca-gap-y\)\)\)/);
  });
});

describe('validatore e salvataggi (C.2)', () => {
  const clean: LauncherLayout = {
    version: 1,
    cover: { enabled: true },
    pages: [
      {
        id: 'home',
        label: 'Casa',
        kind: 'widgets',
        columns: 7,
        placements: { 'phoneLandscape@7x2': { a: cell(0, 0) }, tablet: { a: cell(0, 0) } },
      },
      {
        id: COVER_PAGE_ID,
        label: 'Copertina',
        kind: 'cover',
        columns: 4,
        placements: { 'tablet@4x2': { cover_clock: cell(0, 0) } },
      },
    ],
  };

  it('keeps the keys of the grids and the columns of first pages and cover', () => {
    expect(isLauncherLayout(clean)).toBe(true);
    expect(sanitizeLauncherLayout(clean)).toEqual(clean);
  });

  it('drops keys out of range and columns where they do not belong', () => {
    const dirty = {
      version: 1,
      cover: { enabled: true },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          columns: 7.5,
          placements: {
            'phoneLandscape@8x2': { a: cell(0, 0) },
            'tablet@17x1': { a: cell(0, 0) },
            'phone@0x3': { a: cell(0, 0) },
            'watch@2x2': { a: cell(0, 0) },
          },
        },
        {
          id: 'home_2',
          label: 'Casa 2',
          kind: 'widgets',
          columns: 5,
          continuationOf: 'home',
          placements: {},
        },
        { id: 'altra', label: 'Altra', kind: 'widgets', columns: 11, placements: {} },
        { id: 'luci', label: 'Luci', kind: 'lights', columns: 4, placements: {} },
        { id: COVER_PAGE_ID, label: 'Copertina', kind: 'cover', columns: 2, placements: {} },
      ],
    };
    const result = sanitizeLauncherLayout(dirty)!;
    expect(Object.keys(result.pages[0].placements)).toEqual(['phoneLandscape@8x2']);
    for (const page of result.pages) expect(page.columns).toBeUndefined();
    expect(isLauncherLayout(dirty)).toBe(false);
  });

  describe('andata e ritorno', () => {
    beforeEach(() => localStorage.clear());

    it('through the snapshot', () => {
      localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(clean));
      const snapshot = collectSnapshot();
      localStorage.clear();
      const persistLauncherLayout = vi.fn();
      applySnapshot(snapshot, { persistLauncherLayout });
      expect(persistLauncherLayout).toHaveBeenCalledWith(clean);
    });

    it('through PageContext and its storage', async () => {
      const wrapper = ({ children }: { children?: ReactNode }) => (
        <PageProvider>{children}</PageProvider>
      );
      const { result } = renderHook(() => usePages(), { wrapper });
      await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
      act(() => result.current.persistLauncherLayout(clean));
      const reloaded = renderHook(() => usePages(), { wrapper });
      expect(reloaded.result.current.launcherLayout).toEqual(clean);
    });
  });
});

describe('controller: colonne della pagina', () => {
  function useStore(initial: LauncherLayout | null) {
    const [layout, setLayout] = useState<LauncherLayout | null>(initial);
    return useMemo<LauncherStore>(
      () => ({
        ready: true,
        layout,
        persistLayout: setLayout,
        pagesConfig: { header: [], pages: ['home'], home: [] },
        pageSettings: {},
        cardSettings: {},
      }),
      [layout]
    );
  }
  const renderController = (
    initial: LauncherLayout,
    deviceClass: DeviceClass,
    { viewportWidth, sizes = one }: { viewportWidth?: number; sizes?: typeof one } = {}
  ) =>
    renderHook(() =>
      useLauncherController({
        store: useStore(initial),
        deviceClass,
        viewportWidth,
        resolveSizes: () => sizes,
      })
    );

  it('a landscape phone 640 px wide keeps its pages on the 6×2 of the class', () => {
    const { result } = renderController(
      layoutOf(widgetsPage('home', { phoneLandscape: { a: cell(0, 0) } })),
      'phoneLandscape',
      { viewportWidth: 640 }
    );
    expect(result.current.classFor('home')).toBe('phoneLandscape');
    expect(result.current.gridFor('home')).toEqual({ w: 6, h: 2 });
  });

  it('refuses columns of the cover that cannot hold its widgets', () => {
    const big = { min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } };
    const cover: LauncherPage = {
      id: COVER_PAGE_ID,
      label: 'Copertina',
      kind: 'cover',
      placements: {
        tablet: {
          cover_clock: { x: 0, y: 0, w: 2, h: 2 },
          cover_calendar: { x: 2, y: 0, w: 2, h: 2 },
          cover_weather: { x: 4, y: 0, w: 2, h: 2 },
        },
      },
    };
    const { result } = renderController(
      { ...layoutOf(widgetsPage('home', { tablet: {} }), cover), cover: { enabled: true } },
      'tablet',
      { sizes: big }
    );
    const stored = () => result.current.layout.pages.find((page) => page.kind === 'cover');
    // Saved without columns, it gets the three of a new cover; 3 × 1 cannot hold its widgets
    // at their minimum, so it keeps showing the grid of the class.
    expect(stored()?.columns).toBe(3);
    expect(result.current.classFor(COVER_PAGE_ID)).toBe('tablet');
    // 4 × 2 holds two widgets of 2×2: the choice is not stored, and the controller says so.
    expect(result.current.columnsAllowed(COVER_PAGE_ID, 4)).toBe(false);
    act(() => result.current.updatePage(COVER_PAGE_ID, { columns: 4 }));
    expect(stored()?.columns).toBe(3);
    expect(result.current.classFor(COVER_PAGE_ID)).toBe('tablet');
    // 6 × 3 holds all three.
    expect(result.current.columnsAllowed(COVER_PAGE_ID, 6)).toBe(true);
    expect(result.current.columnsAllowed('home', 2)).toBe(true);
    act(() => result.current.updatePage(COVER_PAGE_ID, { columns: 6 }));
    expect(stored()?.columns).toBe(6);
    expect(result.current.classFor(COVER_PAGE_ID)).toBe('tablet@6x3');
  });

  it('the Lenovo in Chrome shows its pages on 8×2, seeded from 6×2', async () => {
    const saved = { a: { x: 0, y: 0, w: 2, h: 2 }, b: cell(5, 1) };
    const { result } = renderController(
      layoutOf(widgetsPage('home', { phoneLandscape: saved })),
      'phoneLandscape'
    );
    expect(result.current.classFor('home')).toBe('phoneLandscape@8x2');
    expect(result.current.gridFor('home')).toEqual({ w: 8, h: 2 });
    expect(result.current.grid).toEqual({ w: 6, h: 2 });
    await waitFor(() =>
      expect(result.current.layout.pages[0].placements['phoneLandscape@8x2']).toEqual(saved)
    );
  });

  it('a choice on the virtual cover stores the cover with it', () => {
    const initial: LauncherLayout = {
      ...layoutOf(widgetsPage('home', {})),
      cover: { enabled: true },
    };
    const { result } = renderController(initial, 'tablet');
    expect(result.current.classFor(COVER_PAGE_ID)).toBe('tablet@3x1');
    act(() => result.current.updatePage(COVER_PAGE_ID, { columns: 4 }));
    const cover = result.current.layout.pages.find((page) => page.kind === 'cover');
    expect(cover?.columns).toBe(4);
    expect(result.current.classFor(COVER_PAGE_ID)).toBe('tablet@4x2');
    // The three places of the new grid, in the order the widgets had on 3×1.
    const [clock, calendar, weather] = coverRects({ w: 4, h: 2 });
    expect(cover?.placements['tablet@4x2']).toEqual({
      cover_clock: clock,
      cover_calendar: calendar,
      cover_weather: weather,
    });
  });

  it('a change of columns starts from the arrangement shown until then', () => {
    const shown = { a: cell(3, 0), b: cell(7, 1) };
    const { result } = renderController(
      layoutOf(widgetsPage('home', { 'phoneLandscape@8x2': shown })),
      'phoneLandscape'
    );
    act(() => result.current.updatePage('home', { columns: 9 }));
    expect(result.current.layout.pages[0].columns).toBe(9);
    expect(result.current.layout.pages[0].placements['phoneLandscape@9x2']).toEqual(shown);
  });

  it.each([
    ['step by step', [7, 6, 5, 4, 5, 6, 7, 8]],
    ['at once', [4, 8]],
  ])('back to 8 columns %s: no page left that no screen fills', (_name, steps) => {
    const twelve = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`w${i}`, cell(i % 6, Math.floor(i / 6))])
    );
    const { result } = renderController(
      layoutOf(widgetsPage('home', { phoneLandscape: twelve })),
      'phoneLandscape'
    );
    act(() => result.current.setEditMode(true));
    let most = 1;
    for (const columns of steps) {
      act(() => result.current.updatePage('home', { columns }));
      most = Math.max(most, result.current.entries.length);
      // Every widget once on the pages the screen shows.
      const shown = result.current.entries.flatMap((entry) =>
        entry.type === 'page'
          ? Object.keys(entry.page.placements[result.current.classFor(entry.page.id)] ?? {})
          : []
      );
      expect([...shown].sort()).toEqual(Object.keys(twelve).sort());
    }
    // The fewer columns needed continuations; back on 8 × 2 they are gone, in edit mode too.
    expect(most).toBeGreaterThan(1);
    expect(result.current.entries.map((entry) => entry.key)).toEqual(['home']);
    expect(
      Object.keys(result.current.layout.pages[0].placements['phoneLandscape@8x2']!)
    ).toHaveLength(12);
  });
});

describe('griglia della pagina sullo schermo (WidgetGrid)', () => {
  const tile: WidgetDefinition = {
    type: 'test_tile',
    label: 'Tessera',
    icon: 'grid',
    sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 1, h: 1 } },
    matches: (id) => id.startsWith('test_tile'),
    Widget: ({ id }: WidgetProps) => <span>{id}</span>,
  };
  const findDefinition = (id: string, _settings: CardSettings) =>
    tile.matches(id, {}) ? tile : undefined;
  let latest: LauncherController | null = null;

  function Harness() {
    const pages = usePages();
    const store = useMemo<LauncherStore>(
      () => ({
        ready: pages.settingsLoaded,
        layout: pages.launcherLayout,
        persistLayout: pages.persistLauncherLayout,
        pagesConfig: pages.pagesConfig,
        pageSettings: pages.pageSettings,
        cardSettings: pages.cardSettings,
      }),
      [pages]
    );
    const controller = useLauncherController({
      store,
      deviceClass: 'phoneLandscape',
      resolveSizes: (id, settings) => findDefinition(id, settings)?.sizes,
    });
    latest = controller;
    const runtime = useMemo(() => createFixtureRuntime({ editMode: false }), []);
    return (
      <LauncherScreen
        controller={controller}
        runtime={runtime}
        connection={{ phase: 'connected', label: 'Connesso' }}
        chips={[]}
        onOpenSystem={() => undefined}
        detailsWidgetId={null}
        onCloseDetails={() => undefined}
        findDefinition={findDefinition}
      />
    );
  }

  beforeEach(() => {
    localStorage.clear();
    latest = null;
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify(layoutOf(widgetsPage('home', { phoneLandscape: { test_tile_a: cell(0, 0) } })))
    );
    // The area of the grid on the Lenovo in Chrome, as measured on the screenshots.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const area = this.classList.contains('aca-launcher-page');
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: area ? 973 : 0,
        height: area ? 230 : 0,
        right: area ? 973 : 0,
        bottom: area ? 230 : 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('an automatic page draws 8×2 cells of 110 px across the whole area', async () => {
    const view = render(
      <ToastProvider>
        <PageProvider>
          <Harness />
        </PageProvider>
      </ToastProvider>
    );
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    const grid = view.container.querySelector<HTMLElement>(
      '[data-launcher-page="home"] .aca-launcher-grid'
    )!;
    expect(grid.style.getPropertyValue('--aca-cols')).toBe('8');
    expect(grid.style.getPropertyValue('--aca-rows')).toBe('2');
    expect(grid.style.getPropertyValue('--aca-cell')).toBe('110px');
    expect(grid.style.getPropertyValue('--aca-gap-y')).toBe('10px');
    expect(parseFloat(grid.style.width)).toBeGreaterThanOrEqual(969);
    expect(parseFloat(grid.style.width)).toBeLessThanOrEqual(973);
    expect(grid.style.height).toBe('230px');
    // 16 cells: the widget and 15 free ones.
    expect(
      view.container.querySelectorAll('[data-launcher-cells="home"] [data-launcher-cell]')
    ).toHaveLength(15);
  });

  it('snaps the gap of the columns to the pixel ratio of the screen', async () => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1.5);
    const view = render(
      <ToastProvider>
        <PageProvider>
          <Harness />
        </PageProvider>
      </ToastProvider>
    );
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    const grid = view.container.querySelector<HTMLElement>(
      '[data-launcher-page="home"] .aca-launcher-grid'
    )!;
    // (973 − 8·110) / 7 = 13.29 px, floored to 19 device pixels at 1.5.
    expect(parseFloat(grid.style.getPropertyValue('--aca-gap-x'))).toBeCloseTo(19 / 1.5, 6);
  });
});

describe('schermo con la chiave della pagina (LauncherScreen)', () => {
  const tile: WidgetDefinition = {
    type: 'test_tile',
    label: 'Tessera',
    icon: 'grid',
    sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 1, h: 1 } },
    matches: (id) => id.startsWith('test_tile'),
    Widget: ({ id }: WidgetProps) => <span>{id}</span>,
  };
  const findDefinition = (id: string, _settings: CardSettings) =>
    tile.matches(id, {}) ? tile : undefined;
  let latest: LauncherController | null = null;

  function Harness() {
    const pages = usePages();
    const store = useMemo<LauncherStore>(
      () => ({
        ready: pages.settingsLoaded,
        layout: pages.launcherLayout,
        persistLayout: pages.persistLauncherLayout,
        pagesConfig: pages.pagesConfig,
        pageSettings: pages.pageSettings,
        cardSettings: pages.cardSettings,
      }),
      [pages]
    );
    const controller = useLauncherController({
      store,
      deviceClass: 'phoneLandscape',
      resolveSizes: (id, settings) => findDefinition(id, settings)?.sizes,
    });
    latest = controller;
    const runtime = useMemo(
      () =>
        createFixtureRuntime({
          customNames: {
            test_tile_a: 'Tessera A',
            test_tile_b: 'Tessera B',
            test_tile_z: 'Tessera Z',
          },
          editMode: controller.editMode,
        }),
      [controller.editMode]
    );
    return (
      <LauncherScreen
        controller={controller}
        runtime={runtime}
        connection={{ phase: 'connected', label: 'Connesso' }}
        chips={[]}
        onOpenSystem={() => undefined}
        detailsWidgetId={null}
        onCloseDetails={() => undefined}
        findDefinition={findDefinition}
      />
    );
  }

  /** «Tessera Z» is only on the 8 × 2 the Lenovo shows, at column 6; the 6 × 2 has a and b. */
  const lenovo = {
    test_tile_a: cell(0, 0),
    test_tile_z: cell(5, 0),
    test_tile_b: cell(7, 0),
  };
  const classic = { test_tile_a: cell(0, 0), test_tile_b: cell(1, 0) };
  const placement = (key: DeviceClass, id: string) =>
    latest?.layout.pages.find((page) => page.id === 'home')?.placements[key]?.[id];

  async function openHome() {
    render(
      <ToastProvider>
        <PageProvider>
          <Harness />
        </PageProvider>
      </ToastProvider>
    );
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    act(() => latest?.setEditMode(true));
  }

  beforeEach(() => {
    localStorage.clear();
    latest = null;
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify(
        layoutOf(widgetsPage('home', { phoneLandscape: classic, 'phoneLandscape@8x2': lenovo }))
      )
    );
  });

  it('moves with the arrows on the 8 × 2 shown, and «Annulla» puts it back', async () => {
    await openHome();
    const z = () => screen.getByRole('button', { name: /^Tessera Z,/ });
    expect(z()).toHaveAccessibleName('Tessera Z, 1 per 1, colonna 6, riga 1');
    fireEvent.click(z());
    // Column 7 exists on 8 × 2 (on the 6 × 2 of the class it would be the edge of the page).
    fireEvent.keyDown(z(), { key: 'ArrowRight' });
    expect(placement('phoneLandscape@8x2', 'test_tile_z')).toEqual(cell(6, 0));
    expect(placement('phoneLandscape', 'test_tile_z')).toBeUndefined();
    expect(latest?.currentPageId).toBe('home');
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(placement('phoneLandscape@8x2', 'test_tile_z')).toEqual(cell(5, 0));
  });

  it('Canc removes the widget of the 8 × 2 and ends edit mode: the focus goes to «Modifica la disposizione» (2026-10-23)', async () => {
    await openHome();
    // The keyboard: the widget reached with Tab is the selected one.
    fireEvent.keyDown(window, { key: 'Tab' });
    const z = screen.getByRole('button', { name: /^Tessera Z,/ });
    z.focus();
    fireEvent.keyDown(z, { key: 'Delete' });
    expect(placement('phoneLandscape@8x2', 'test_tile_z')).toBeUndefined();
    expect(latest?.editMode).toBe(false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toHaveFocus()
    );
  });
});

describe('chiavi delle pagine e continuazioni (revisione di C, giro 2)', () => {
  const ids = (count: number, from = 0) => Array.from({ length: count }, (_, i) => `w${from + i}`);
  const rows = (list: string[], w: number): Placements =>
    Object.fromEntries(list.map((id, i) => [id, cell(i % w, Math.floor(i / w))]));
  const inFamily = (layout: LauncherLayout, root: string, key: DeviceClass) =>
    layout.pages
      .filter((page) => (page.continuationOf ?? page.id) === root)
      .flatMap((page) => Object.keys(page.placements[key] ?? {}));
  const ctx = ctxFor('phoneLandscape');
  const lenovoKey: DeviceClass = 'phoneLandscape@8x2';

  it('from 8 to 7 columns the rest fills the continuation that has room: no new page', () => {
    const layout = layoutOf(
      widgetsPage('home', { [lenovoKey]: rows(ids(16), 8) }, { columns: 8 }),
      widgetsPage(
        'casa_2',
        { [lenovoKey]: rows(ids(2, 16), 8) },
        { continuationOf: 'home', label: 'Casa 2' }
      )
    );
    const changed = updatePageInLayout(layout, 'home', { columns: 7 });
    const next = ensureDeviceClass(changed, ctx, { home: lenovoKey });
    expect(next.pages.map((page) => page.id)).toEqual(['home', 'casa_2']);
    const key = 'phoneLandscape@7x2';
    expect(Object.keys(next.pages[0].placements[key]!)).toHaveLength(14);
    // After the widgets the continuation already had, in reading order.
    expect(next.pages[1].placements[key]).toEqual({
      w16: cell(0, 0),
      w17: cell(1, 0),
      w7: cell(2, 0),
      w15: cell(3, 0),
    });
  });

  it('a continuation that is needed goes after the last page of the family', () => {
    const layout = layoutOf(
      widgetsPage('home', { [lenovoKey]: rows(ids(16), 8) }, { columns: 8 }),
      widgetsPage(
        'casa_2',
        { [lenovoKey]: rows(ids(16, 16), 8) },
        { continuationOf: 'home', label: 'Casa 2' }
      ),
      widgetsPage('altra', { tablet: {} })
    );
    const changed = updatePageInLayout(layout, 'home', { columns: 7 });
    const next = ensureDeviceClass(changed, ctx, { home: lenovoKey });
    expect(next.pages.map((page) => page.label)).toEqual(['Casa', 'Casa 2', 'Casa 3', 'altra']);
    const shown = inFamily(next, 'home', 'phoneLandscape@7x2');
    expect([...shown].sort()).toEqual(ids(32).sort());
  });

  it('a seeded key keeps a widget once when a continuation already has it there', () => {
    const layout = layoutOf(
      widgetsPage('home', { phoneLandscape: { a: cell(0, 0), b: cell(1, 0) } }),
      widgetsPage(
        'home_2',
        { phoneLandscape: {}, [lenovoKey]: { b: cell(0, 0) } },
        { continuationOf: 'home' }
      )
    );
    const next = ensureDeviceClass(layout, ctx);
    expect(next.pages[0].placements[lenovoKey]).toEqual({ a: cell(0, 0) });
    expect(inFamily(next, 'home', lenovoKey).sort()).toEqual(['a', 'b']);
  });

  it('moves and resizes on the key the page shows, not on the key of the class', () => {
    const classic = { a: cell(0, 0) };
    const layout = layoutOf(
      widgetsPage('home', { phoneLandscape: classic, [lenovoKey]: { a: cell(0, 0) } }),
      widgetsPage('sette', { 'phoneLandscape@7x2': { b: cell(0, 0) } }, { columns: 7 })
    );
    const moved = moveWidgetInLayout(layout, ctx, 'home', 'a', cell(7, 1))!;
    expect(moved.pages[0].placements[lenovoKey]?.a).toEqual(cell(7, 1));
    expect(moved.pages[0].placements.phoneLandscape).toBe(classic);
    const resized = resizeWidgetInLayout(layout, ctx, 'home', 'a', { w: 2, h: 2 })!;
    expect(resized.pages[0].placements[lenovoKey]?.a).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(resized.pages[0].placements.phoneLandscape).toBe(classic);

    const seven = moveWidgetInLayout(layout, ctx, 'sette', 'b', cell(6, 1))!;
    expect(seven.pages[1].placements['phoneLandscape@7x2']?.b).toEqual(cell(6, 1));
    const wider = resizeWidgetInLayout(layout, ctx, 'sette', 'b', { w: 3, h: 1 })!;
    expect(wider.pages[1].placements['phoneLandscape@7x2']?.b).toEqual({ x: 0, y: 0, w: 3, h: 1 });
  });

  it('the pager shows a continuation filled under the key of its page, at each width', () => {
    const layout = layoutOf(
      widgetsPage('home', { phoneLandscape: { a: cell(0, 0) }, [lenovoKey]: { a: cell(0, 0) } }),
      widgetsPage(
        'home_2',
        { phoneLandscape: {}, [lenovoKey]: { b: cell(0, 0) } },
        { continuationOf: 'home' }
      ),
      widgetsPage('sette', { 'phoneLandscape@7x2': { c: cell(0, 0) } }, { columns: 7 }),
      widgetsPage(
        'sette_2',
        { 'phoneLandscape@7x2': { d: cell(0, 0) }, phoneLandscape: {} },
        { continuationOf: 'sette' }
      ),
      widgetsPage(
        'sette_3',
        { 'phoneLandscape@7x2': {}, phoneLandscape: { e: cell(0, 0) } },
        { continuationOf: 'sette' }
      )
    );
    const keys = (viewportWidth?: number) =>
      pagerEntries(layout, 'phoneLandscape', false, DEFAULT_GRIDS, viewportWidth).map(
        (entry) => entry.key
      );
    // Wide (the Lenovo): home_2 on 8 × 2; sette_2 on its 7 × 2; sette_3 is empty there.
    expect(keys()).toEqual(['home', 'home_2', 'sette', 'sette_2']);
    expect(keys(1024)).toEqual(['home', 'home_2', 'sette', 'sette_2']);
    // At 640 the automatic pages show the 6 × 2, where home_2 is empty; the columns stay.
    expect(keys(640)).toEqual(['home', 'sette', 'sette_2']);
  });

  it('the legacy cards follow the reading order of the key each page shows', () => {
    const layout = layoutOf(
      widgetsPage('home', {
        phoneLandscape: { a: cell(0, 0), b: cell(1, 0) },
        [lenovoKey]: { b: cell(0, 0), a: cell(1, 0) },
      })
    );
    const previous = { header: [], pages: [] };
    const config = (viewportWidth?: number) =>
      layoutToPagesConfig(layout, previous, 'phoneLandscape', DEFAULT_GRIDS, viewportWidth).home;
    expect(config()).toEqual(['b', 'a']);
    expect(config(640)).toEqual(['a', 'b']);
    expect(layoutToPagesConfig(layout, previous, 'phoneLandscape').home).toEqual(['a', 'b']);
  });

  it('a stack made on the Lenovo leaves no copy under the 6 × 2 of a narrow screen', () => {
    const lenovo = { ...rows(ids(12), 8), n1: cell(4, 1) };
    const layout = layoutOf(
      widgetsPage('home', { [lenovoKey]: lenovo, phoneLandscape: rows(ids(12), 6) }),
      widgetsPage(
        'home_2',
        { [lenovoKey]: {}, phoneLandscape: { n1: cell(0, 0) } },
        { continuationOf: 'home' }
      )
    );
    const keys: DeviceClass[] = [lenovoKey, 'phoneLandscape'];
    const stacked = stackWidgetsInLayout(layout, 'home', 'n1', 'w0', 'stack_x')!;
    for (const key of keys) {
      const shown = inFamily(stacked, 'home', key);
      expect(shown).not.toContain('n1');
      expect(shown).not.toContain('w0');
      expect(shown.filter((id) => id === 'stack_x')).toHaveLength(1);
    }
    // Taken apart: the widget left takes the place of the stack under both keys.
    const apart = unstackWidgetInLayout(stacked, ctx, 'home', 'stack_x', 'n1')!;
    for (const key of keys) {
      const shown = inFamily(apart, 'home', key);
      expect(shown).not.toContain('stack_x');
      expect(shown.filter((id) => id === 'w0')).toHaveLength(1);
    }
  });

  it('drops only the continuations that no screen fills and whose widgets are kept elsewhere', () => {
    const layout = layoutOf(
      widgetsPage('home', { [lenovoKey]: { a: cell(0, 0), b: cell(1, 0) } }, { columns: 8 }),
      // Left by 4 columns: its widget is on «Casa» under the 8 × 2.
      widgetsPage(
        'home_2',
        { 'phoneLandscape@4x1': { b: cell(0, 0) }, [lenovoKey]: {} },
        { continuationOf: 'home' }
      ),
      // Its widget is nowhere else: it stays.
      widgetsPage(
        'home_3',
        { 'phoneLandscape@4x1': { c: cell(0, 0) }, [lenovoKey]: {} },
        { continuationOf: 'home' }
      ),
      // Filled under the key the phone shows: it stays.
      widgetsPage(
        'home_4',
        { [columnsKey('phone', 8, DEFAULT_GRIDS)]: { a: cell(0, 0) }, [lenovoKey]: {} },
        { continuationOf: 'home' }
      )
    );
    const next = dropEmptyContinuations(layout, ctx, 'home');
    expect(next.pages.map((page) => page.id)).toEqual(['home', 'home_3', 'home_4']);
    expect(dropEmptyContinuations(next, ctx, 'home')).toBe(next);
  });
});
