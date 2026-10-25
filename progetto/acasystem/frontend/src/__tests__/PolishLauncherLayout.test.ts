import { describe, expect, it } from 'vitest';
import type { CellRect, LauncherLayout, WidgetSizes } from '@/@types/launcher';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import {
  findFreeRectAtCell,
  freeCells,
  rectsOverlap,
  type Placements,
} from '@/utils/launcher/grid';
import { placeWidgetInLayout, type LayoutContext } from '@/utils/launcher/layout';
import { basePageId, homeEntryIndex, pagerEntries } from '@/utils/launcher/pager';

// REP-20261007-001: «+» cells place the new widget where they are touched; «Principale» is the
// base page of the pager.

const grid = DEFAULT_GRIDS.tablet; // 8 × 5
const sizes: WidgetSizes = { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } };
const tablet: LayoutContext = { deviceClass: 'tablet', grids: DEFAULT_GRIDS, sizesOf: () => sizes };

const covers = (rect: CellRect | undefined, cell: { x: number; y: number }) =>
  Boolean(
    rect &&
    cell.x >= rect.x &&
    cell.x < rect.x + rect.w &&
    cell.y >= rect.y &&
    cell.y < rect.y + rect.h
  );

function page(placements: Placements, id = 'home'): LauncherLayout {
  return {
    version: 1,
    cover: { enabled: true },
    pages: [{ id, label: 'Principale', kind: 'widgets', placements: { tablet: placements } }],
  };
}

const tabletOf = (layout: LauncherLayout, pageId = 'home') =>
  layout.pages.find((item) => item.id === pageId)?.placements.tablet ?? {};

/** Cells between a tapped cell and a rectangle: 0 when the rectangle covers it. */
const cellDistance = (
  rect: { x: number; y: number; w: number; h: number },
  cell: { x: number; y: number }
) =>
  Math.max(0, rect.x - cell.x, cell.x - (rect.x + rect.w - 1)) +
  Math.max(0, rect.y - cell.y, cell.y - (rect.y + rect.h - 1));

describe('free cells of a page', () => {
  it('lists the cells no widget covers, in reading order', () => {
    const cells = freeCells({ a: { x: 0, y: 0, w: 2, h: 2 } }, grid);
    expect(cells).toHaveLength(36);
    expect(cells[0]).toEqual({ x: 2, y: 0 });
    expect(cells).not.toContainEqual({ x: 1, y: 1 });
    expect(cells[cells.length - 1]).toEqual({ x: 7, y: 4 });
  });
});

describe('rectangle on the touched cell', () => {
  const two = { w: 2, h: 2 };
  const one = { w: 1, h: 1 };

  it('starts on the cell when there is room', () => {
    expect(findFreeRectAtCell({}, grid, two, one, { x: 3, y: 1 })).toEqual({
      x: 3,
      y: 1,
      w: 2,
      h: 2,
    });
  });

  it('slides left and up at the edge of the grid, still covering the cell', () => {
    expect(findFreeRectAtCell({}, grid, two, one, { x: 7, y: 4 })).toEqual({
      x: 6,
      y: 3,
      w: 2,
      h: 2,
    });
  });

  it('slides when the cell on its right is taken, before shrinking', () => {
    const taken: Placements = { b: { x: 4, y: 0, w: 1, h: 5 } };
    expect(findFreeRectAtCell(taken, grid, two, one, { x: 3, y: 1 })).toEqual({
      x: 2,
      y: 1,
      w: 2,
      h: 2,
    });
  });

  // The helper shrinks down to `min` when asked; placeWidgetInLayout asks for that only after
  // the chosen size fits nowhere on the page (R-01, Polish2LauncherLayout.test.ts).
  it('shrinks down to the given minimum when only the cell itself is free', () => {
    const around: Placements = {
      left: { x: 2, y: 0, w: 1, h: 5 },
      right: { x: 4, y: 0, w: 1, h: 5 },
      above: { x: 3, y: 0, w: 1, h: 2 },
      below: { x: 3, y: 3, w: 1, h: 2 },
    };
    expect(findFreeRectAtCell(around, grid, two, one, { x: 3, y: 2 })).toEqual({
      x: 3,
      y: 2,
      w: 1,
      h: 1,
    });
    // Not below the minimum, and nothing on a taken or outside cell.
    expect(findFreeRectAtCell(around, grid, two, two, { x: 3, y: 2 })).toBeNull();
    expect(findFreeRectAtCell(around, grid, two, one, { x: 2, y: 2 })).toBeNull();
    expect(findFreeRectAtCell({}, grid, two, one, { x: 8, y: 0 })).toBeNull();
  });
});

describe('placing a widget from a «+» cell', () => {
  it('puts it on the touched cell', () => {
    const result = placeWidgetInLayout(
      page({}),
      tablet,
      'home',
      'w',
      { w: 2, h: 2 },
      { x: 5, y: 2 }
    );
    expect(result.pageId).toBe('home');
    expect(tabletOf(result.layout).w).toEqual({ x: 5, y: 2, w: 2, h: 2 });
  });

  it('keeps the widget on the cell by sliding it at the right and bottom edges', () => {
    const result = placeWidgetInLayout(
      page({}),
      tablet,
      'home',
      'w',
      { w: 3, h: 2 },
      { x: 7, y: 4 }
    );
    const rect = tabletOf(result.layout).w;
    expect(rect).toEqual({ x: 5, y: 3, w: 3, h: 2 });
  });

  it('keeps several widgets added from the same cell close to it', () => {
    const anchor = { x: 6, y: 3 };
    let layout = page({ a: { x: 0, y: 0, w: 2, h: 2 } });
    for (const id of ['one', 'two', 'three']) {
      layout = placeWidgetInLayout(layout, tablet, 'home', id, { w: 2, h: 1 }, anchor).layout;
    }
    const placed = tabletOf(layout);
    expect(covers(placed.one, anchor)).toBe(true);
    for (const id of ['two', 'three']) {
      const rect = placed[id];
      // Never back at the first free rectangle in reading order (next to «a»).
      expect(rect.x).toBeGreaterThanOrEqual(4);
      expect(rect.y).toBeGreaterThanOrEqual(2);
    }
    const ids = Object.keys(placed);
    for (const a of ids) {
      for (const b of ids) if (a !== b) expect(rectsOverlap(placed[a], placed[b])).toBe(false);
    }
  });

  it('goes to the free rectangle nearest to the cell when the cell is taken', () => {
    const layout = page({ a: { x: 4, y: 2, w: 2, h: 2 } });
    const result = placeWidgetInLayout(layout, tablet, 'home', 'w', { w: 2, h: 2 }, { x: 4, y: 2 });
    const rect = tabletOf(result.layout).w;
    expect(rectsOverlap(rect, { x: 4, y: 2, w: 2, h: 2 })).toBe(false);
    // Measured from the tapped cell (REP-20261007-001, C2-03): the rectangle touches it.
    expect(cellDistance(rect, { x: 4, y: 2 })).toBe(1);
  });

  it('ignores a cell outside the grid and uses the first free rectangle', () => {
    const result = placeWidgetInLayout(
      page({ a: { x: 0, y: 0, w: 2, h: 2 } }),
      tablet,
      'home',
      'w',
      { w: 2, h: 2 },
      { x: 12, y: 9 }
    );
    expect(tabletOf(result.layout).w).toEqual({ x: 2, y: 0, w: 2, h: 2 });
  });

  it('still opens a new page when the page is full', () => {
    const full = page({ big: { x: 0, y: 0, w: 8, h: 5 } });
    const result = placeWidgetInLayout(full, tablet, 'home', 'w', { w: 2, h: 2 }, { x: 0, y: 0 });
    expect(result.pageId).not.toBe('home');
    expect(tabletOf(result.layout, result.pageId).w).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });
});

describe('«Principale», the base page', () => {
  const layout: LauncherLayout = {
    version: 1,
    cover: { enabled: true },
    pages: [
      { id: 'home', label: 'Principale', kind: 'widgets', placements: { tablet: {} } },
      {
        id: 'luci',
        label: 'Luci',
        kind: 'widgets',
        placements: { tablet: { 'light.a': { x: 0, y: 0, w: 2, h: 2 } } },
      },
      { id: 'vuota', label: 'Vuota', kind: 'widgets', placements: { tablet: {} } },
    ],
  };

  it('stays in the pager when empty, like every empty page made by the user (REP-20261007-028)', () => {
    const keys = pagerEntries(layout, 'tablet', false).map((entry) => entry.key);
    expect(keys).toEqual(['cover', 'home', 'luci', 'vuota']);
    expect(pagerEntries(layout, 'tablet', true).map((entry) => entry.key)).toEqual([
      'cover',
      'home',
      'luci',
      'vuota',
    ]);
  });

  it('is the first widget page that is not hidden, and the entry the launcher starts on', () => {
    expect(basePageId(layout)).toBe('home');
    expect(homeEntryIndex(pagerEntries(layout, 'tablet', false), layout)).toBe(1);

    const hiddenHome: LauncherLayout = {
      ...layout,
      pages: layout.pages.map((item) => (item.id === 'home' ? { ...item, hidden: true } : item)),
    };
    expect(basePageId(hiddenHome)).toBe('luci');
    const entries = pagerEntries(hiddenHome, 'tablet', false);
    expect(entries.map((entry) => entry.key)).toEqual(['cover', 'luci', 'vuota']);
    expect(homeEntryIndex(entries, hiddenHome)).toBe(1);

    const coverOnly: LauncherLayout = { version: 1, cover: { enabled: true }, pages: [] };
    expect(basePageId(coverOnly)).toBeNull();
    expect(homeEntryIndex(pagerEntries(coverOnly, 'tablet', false), coverOnly)).toBe(0);
  });
});

describe('nearest place from a «+» cell for wide widgets (C2-03)', () => {
  it('prefers the place touching the cell over a detached one below it', () => {
    // Free: row 2, columns 2-4 (ends next to the tapped cell (5,2), which is taken) and row 4,
    // columns 5-7 (two rows below). Measured from the top-left corner the detached place
    // looked nearer (2 against 3); measured from the cell, the touching one is (1 against 2).
    const layout = page({
      top: { x: 0, y: 0, w: 8, h: 2 },
      left: { x: 0, y: 2, w: 2, h: 1 },
      taken: { x: 5, y: 2, w: 3, h: 1 },
      middle: { x: 0, y: 3, w: 8, h: 1 },
      bottom: { x: 0, y: 4, w: 5, h: 1 },
    });
    const result = placeWidgetInLayout(layout, tablet, 'home', 'w', { w: 3, h: 1 }, { x: 5, y: 2 });
    const rect = tabletOf(result.layout).w;
    expect(rect).toEqual({ x: 2, y: 2, w: 3, h: 1 });
    expect(cellDistance(rect, { x: 5, y: 2 })).toBe(1);
  });
});
