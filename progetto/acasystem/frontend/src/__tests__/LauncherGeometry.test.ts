import { describe, expect, it } from 'vitest';
import type { BaseDeviceClass, CellSize, DeviceClass } from '@/@types/launcher';
import {
  BASE_DEVICE_CLASSES,
  COVER_COLUMNS,
  DEFAULT_GRIDS,
  cellMetrics,
  columnsKey,
  deviceClassFor,
  rectToBox,
  rowsOn,
} from '@/utils/launcher/deviceClass';
import {
  clampSize,
  findFreeRect,
  findFreeRectShrinking,
  idsByPosition,
  packItems,
  rectFits,
  rectsOverlap,
  shrinkCandidates,
  tryMove,
  tryResize,
  type Placements,
} from '@/utils/launcher/grid';
import { sizeAcrossKeys } from '@/utils/launcher/layout';

const grid = { w: 8, h: 5 };

describe('launcher geometry: rectangles', () => {
  it('detects overlaps and touching edges', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true);
    expect(rectsOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 })).toBe(false);
    expect(rectsOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 0, y: 2, w: 1, h: 1 })).toBe(false);
  });

  it('accepts only whole cells inside the grid', () => {
    expect(rectFits({ x: 6, y: 3, w: 2, h: 2 }, grid)).toBe(true);
    expect(rectFits({ x: 7, y: 0, w: 2, h: 1 }, grid)).toBe(false);
    expect(rectFits({ x: -1, y: 0, w: 1, h: 1 }, grid)).toBe(false);
    expect(rectFits({ x: 0.5, y: 0, w: 1, h: 1 }, grid)).toBe(false);
    expect(rectFits({ x: 0, y: 0, w: 0, h: 1 }, grid)).toBe(false);
  });

  it('clamps sizes to the definition limits and to the grid', () => {
    const sizes = { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } };
    expect(clampSize({ w: 1, h: 4 }, grid, sizes)).toEqual({ w: 2, h: 2 });
    expect(clampSize({ w: 12, h: 9 }, grid)).toEqual({ w: 8, h: 5 });
    expect(clampSize({ w: Number.NaN, h: 2 }, grid)).toEqual({ w: 1, h: 2 });
  });

  it('orders ids by reading position', () => {
    const placements: Placements = {
      c: { x: 0, y: 1, w: 1, h: 1 },
      b: { x: 3, y: 0, w: 1, h: 1 },
      a: { x: 0, y: 0, w: 1, h: 1 },
    };
    expect(idsByPosition(placements)).toEqual(['a', 'b', 'c']);
  });
});

describe('launcher geometry: free space and packing', () => {
  const placements: Placements = {
    a: { x: 0, y: 0, w: 4, h: 2 },
    b: { x: 4, y: 0, w: 2, h: 2 },
  };

  it('finds the first free rectangle in reading order', () => {
    expect(findFreeRect(placements, grid, { w: 2, h: 2 })).toEqual({ x: 6, y: 0, w: 2, h: 2 });
    expect(findFreeRect(placements, grid, { w: 9, h: 1 })).toBeNull();
  });

  it('finds the free rectangle closest to a cell', () => {
    expect(findFreeRect(placements, grid, { w: 2, h: 2 }, { x: 1, y: 3 })).toEqual({
      x: 1,
      y: 3,
      w: 2,
      h: 2,
    });
    // (1, 0) is taken: the closest free place is one row below.
    expect(findFreeRect(placements, grid, { w: 2, h: 2 }, { x: 1, y: 0 })).toEqual({
      x: 1,
      y: 2,
      w: 2,
      h: 2,
    });
  });

  it('shrinks from the requested size down to the minimum, largest first', () => {
    expect(shrinkCandidates({ w: 2, h: 2 })).toEqual([
      { w: 2, h: 2 },
      { w: 2, h: 1 },
      { w: 1, h: 2 },
      { w: 1, h: 1 },
    ]);
    const full: Placements = { a: { x: 0, y: 0, w: 8, h: 4 }, b: { x: 0, y: 4, w: 7, h: 1 } };
    expect(findFreeRectShrinking(full, grid, { w: 2, h: 2 })).toEqual({ x: 7, y: 4, w: 1, h: 1 });
    expect(findFreeRectShrinking(full, grid, { w: 2, h: 2 }, { w: 2, h: 1 })).toBeNull();
  });

  it('packs in order and reports what overflows', () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      id: `w${index}`,
      size: { w: 2, h: 2 },
      min: { w: 2, h: 2 },
    }));
    const result = packItems(items, { w: 4, h: 6 });
    expect(Object.keys(result.placements)).toHaveLength(6);
    expect(result.placements.w0).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(result.placements.w1).toEqual({ x: 2, y: 0, w: 2, h: 2 });
    expect(result.overflow.map((item) => item.id)).toEqual(['w6', 'w7', 'w8', 'w9', 'w10']);
  });
});

describe('launcher geometry: collisions', () => {
  const placements: Placements = {
    a: { x: 0, y: 0, w: 2, h: 2 },
    b: { x: 2, y: 0, w: 2, h: 2 },
  };

  it('moves into free space without touching the others', () => {
    const next = tryMove(placements, grid, 'a', { x: 5, y: 3, w: 2, h: 2 });
    expect(next).toEqual({ a: { x: 5, y: 3, w: 2, h: 2 }, b: placements.b });
  });

  it('pushes a widget in the way to the closest free position', () => {
    const next = tryMove(placements, grid, 'a', { x: 2, y: 0, w: 2, h: 2 });
    expect(next?.a).toEqual({ x: 2, y: 0, w: 2, h: 2 });
    expect(next?.b).toBeDefined();
    expect(rectsOverlap(next!.a, next!.b)).toBe(false);
    // The closest free place for b is where a came from or next to it.
    expect(Math.abs(next!.b.x - 2) + Math.abs(next!.b.y)).toBeLessThanOrEqual(2);
  });

  it('refuses a move when the pushed widget finds no room', () => {
    const tight = { w: 4, h: 2 };
    expect(tryMove(placements, tight, 'a', { x: 2, y: 0, w: 2, h: 2 })).not.toBeNull();
    const full: Placements = {
      a: { x: 0, y: 0, w: 2, h: 2 },
      b: { x: 2, y: 0, w: 2, h: 2 },
    };
    expect(tryMove(full, tight, 'a', { x: 1, y: 0, w: 3, h: 2 })).toBeNull();
    expect(tryMove(full, tight, 'a', { x: 3, y: 0, w: 2, h: 2 })).toBeNull();
  });

  it('resizes keeping the top-left cell, or refuses', () => {
    expect(tryResize(placements, grid, 'b', { w: 3, h: 2 })?.b).toEqual({ x: 2, y: 0, w: 3, h: 2 });
    expect(tryResize(placements, { w: 4, h: 2 }, 'a', { w: 3, h: 2 })).toBeNull();
    expect(tryResize(placements, grid, 'missing', { w: 1, h: 1 })).toBeNull();
  });
});

describe('launcher device classes', () => {
  it('derives the class from width and orientation', () => {
    expect(deviceClassFor(390, 844)).toBe('phone');
    expect(deviceClassFor(844, 390)).toBe('phoneLandscape');
    expect(deviceClassFor(768, 1024)).toBe('tabletPortrait');
    expect(deviceClassFor(1024, 768)).toBe('tablet');
    expect(deviceClassFor(1280, 800)).toBe('tablet');
    expect(deviceClassFor(0, 0)).toBe('tablet');
  });

  it('computes square cells that fit both directions', () => {
    const metrics = cellMetrics(1000, 600, { w: 8, h: 5 }, 16);
    expect(metrics.cell).toBe(107);
    expect(metrics.height).toBeLessThanOrEqual(600);
    expect(metrics.width).toBeLessThanOrEqual(1000);
    // The spare width goes to the gaps between columns (REP-20261008-001): 20 px, not 16.
    expect(metrics).toMatchObject({ gapX: 20, gapY: 16 });
    expect(rectToBox({ x: 1, y: 2, w: 2, h: 1 }, metrics)).toEqual({
      left: 127,
      top: 246,
      width: 234,
      height: 107,
    });
  });
});

/*
 * Guards of REP-20261013-002 (stage 1, ADR-0013): the frame around the grid changes when the top
 * bar moves into the footer band, but REFERENCE_AREAS stays as it is. These tests pin what
 * depends on it, so that nobody re-tunes the areas to the new frame: that would change the rows
 * and the keys of the saved arrangements. They describe today's behaviour and must stay green.
 */
describe('reference area: rows and keys that must not change', () => {
  const columns = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const rows: Record<BaseDeviceClass, number[]> = {
    tablet: [1, 1, 2, 2, 3, 3, 4, 4, 5],
    tabletPortrait: [2, 3, 4, 5, 6, 6, 6, 6, 6],
    phone: [3, 5, 6, 7, 7, 7, 7, 7, 7],
    phoneLandscape: [1, 1, 1, 1, 1, 2, 2, 2, 2],
  };
  const keys: Record<BaseDeviceClass, string[]> = {
    tablet: [
      'tablet@2x1',
      'tablet@3x1',
      'tablet@4x2',
      'tablet@5x2',
      'tablet@6x3',
      'tablet@7x3',
      'tablet@8x4',
      'tablet@9x4',
      'tablet@10x5',
    ],
    tabletPortrait: [
      'tabletPortrait@2x2',
      'tabletPortrait@2x2',
      'tabletPortrait@3x3',
      'tabletPortrait@4x4',
      'tabletPortrait@5x5',
      'tabletPortrait@5x5',
      'tabletPortrait@6x6',
      'tabletPortrait@6x6',
      'tabletPortrait@6x6',
    ],
    phone: [
      'phone@2x3',
      'phone@2x3',
      'phone@2x3',
      'phone@compact',
      'phone@compact',
      'phone',
      'phone',
      'phone',
      'phone',
    ],
    phoneLandscape: [
      'phoneLandscape@2x1',
      'phoneLandscape@3x1',
      'phoneLandscape@4x1',
      'phoneLandscape@5x1',
      'phoneLandscape@6x1',
      'phoneLandscape@7x2',
      'phoneLandscape@8x2',
      'phoneLandscape@9x2',
      'phoneLandscape@9x2',
    ],
  };

  it.each(BASE_DEVICE_CLASSES)('rowsOn of %s for 2 to 10 columns', (base) => {
    expect(columns.map((count) => rowsOn(base, count))).toEqual(rows[base]);
  });

  it.each(BASE_DEVICE_CLASSES)('columnsKey of %s for 2 to 10 stored columns', (base) => {
    expect(columns.map((count) => columnsKey(base, count, DEFAULT_GRIDS))).toEqual(keys[base]);
  });

  it('the cover on three columns keeps its key on every class', () => {
    expect(
      BASE_DEVICE_CLASSES.map((base) => columnsKey(base, COVER_COLUMNS, DEFAULT_GRIDS))
    ).toEqual(['tablet@3x1', 'tabletPortrait@2x2', 'phone@2x3', 'phoneLandscape@3x1']);
  });

  it('the cell of the tablet grid on the Lenovo full screen, before and after the top bar', () => {
    // 973×440: viewport 1024×640 minus the gutters, 64 px of top band, 88 px of footer band and
    // 48 px of page margin. 504 px is the same area without the top band (what ADR-0013 gains).
    const before = cellMetrics(973, 440, { w: 8, h: 5 }, 16);
    const after = cellMetrics(973, 504, { w: 8, h: 5 }, 16);
    expect(before.cell).toBe(75);
    expect(after.cell).toBe(88);
    expect(before.gapY).toBe(16);
    expect(after.gapY).toBe(16);
  });
});

describe('size across keys: what the cover and the pages convert to', () => {
  const sizes = [
    { w: 1, h: 1 },
    { w: 2, h: 1 },
    { w: 2, h: 2 },
  ];
  // Cover (three columns) to a page of 8 columns, and back, on each screen class.
  const converted: Record<
    BaseDeviceClass,
    { to: DeviceClass; from: DeviceClass; toPage: CellSize[]; toCover: CellSize[] }
  > = {
    tablet: {
      from: 'tablet@3x1',
      to: 'tablet@8x4',
      toPage: [
        { w: 3, h: 3 },
        { w: 5, h: 3 },
        { w: 5, h: 6 },
      ],
      toCover: [
        { w: 1, h: 1 },
        { w: 1, h: 1 },
        { w: 1, h: 1 },
      ],
    },
    tabletPortrait: {
      from: 'tabletPortrait@2x2',
      to: 'tabletPortrait@6x6',
      toPage: [
        { w: 3, h: 3 },
        { w: 6, h: 3 },
        { w: 6, h: 6 },
      ],
      toCover: [
        { w: 1, h: 1 },
        { w: 1, h: 1 },
        { w: 1, h: 1 },
      ],
    },
    phone: {
      from: 'phone@2x3',
      to: 'phone',
      toPage: [
        { w: 2, h: 2 },
        { w: 4, h: 2 },
        { w: 4, h: 4 },
      ],
      toCover: [
        { w: 1, h: 1 },
        { w: 1, h: 1 },
        { w: 1, h: 1 },
      ],
    },
    phoneLandscape: {
      from: 'phoneLandscape@3x1',
      to: 'phoneLandscape@8x2',
      toPage: [
        { w: 2, h: 2 },
        { w: 5, h: 2 },
        { w: 5, h: 4 },
      ],
      toCover: [
        { w: 1, h: 1 },
        { w: 1, h: 1 },
        { w: 1, h: 1 },
      ],
    },
  };

  it.each(BASE_DEVICE_CLASSES)('%s: the cover keys are the ones the table names', (base) => {
    expect(columnsKey(base, COVER_COLUMNS, DEFAULT_GRIDS)).toBe(converted[base].from);
    expect(columnsKey(base, 8, DEFAULT_GRIDS)).toBe(converted[base].to);
  });

  it.each(BASE_DEVICE_CLASSES)('%s: cover to page and back', (base) => {
    const { from, to, toPage, toCover } = converted[base];
    const grids = DEFAULT_GRIDS;
    expect(sizes.map((size) => sizeAcrossKeys(size, grids, from, to))).toEqual(toPage);
    expect(sizes.map((size) => sizeAcrossKeys(size, grids, to, from))).toEqual(toCover);
  });

  it('the cover and the default page of the tablet (the wall tablet, ADR-0013)', () => {
    const grids = DEFAULT_GRIDS;
    // 1x1 of the cover (cell 313 px) is wider than a cell of the 8x5 grid (75 px).
    expect(sizeAcrossKeys({ w: 1, h: 1 }, grids, 'tablet@3x1', 'tablet')).toEqual({ w: 3, h: 4 });
    expect(sizeAcrossKeys({ w: 1, h: 1 }, grids, 'tabletPortrait@2x2', 'tabletPortrait')).toEqual({
      w: 4,
      h: 4,
    });
    // And back: only a widget as wide as the page gets more than a cell of the cover.
    expect(sizeAcrossKeys({ w: 5, h: 3 }, grids, 'tablet@8x4', 'tablet@3x1')).toEqual({
      w: 2,
      h: 1,
    });
    expect(sizeAcrossKeys({ w: 8, h: 4 }, grids, 'tablet', 'tablet@3x1')).toEqual({ w: 3, h: 1 });
    expect(sizeAcrossKeys({ w: 3, h: 4 }, grids, 'tablet', 'tablet@3x1')).toEqual({ w: 1, h: 1 });
    expect(sizeAcrossKeys({ w: 4, h: 4 }, grids, 'tabletPortrait', 'tabletPortrait@2x2')).toEqual({
      w: 1,
      h: 1,
    });
  });

  it('the same key keeps the size', () => {
    for (const size of sizes) {
      expect(sizeAcrossKeys(size, DEFAULT_GRIDS, 'tablet', 'tablet')).toEqual(size);
    }
  });
});
