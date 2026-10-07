import { describe, expect, it } from 'vitest';
import type { CellRect, LauncherLayout, WidgetSizes } from '@/@types/launcher';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { rectsOverlap, type Placements } from '@/utils/launcher/grid';
import { placeWidgetInLayout, type LayoutContext } from '@/utils/launcher/layout';

// REP-20261007-001, second round, R-01: a widget added from a «+» cell keeps the size chosen in
// the sheet. First on the touched cell, then at the free place nearest to it; it shrinks only
// when the chosen size fits nowhere on the page (and then on the cell first).

const sizes: WidgetSizes = { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } };
const tablet: LayoutContext = { deviceClass: 'tablet', grids: DEFAULT_GRIDS, sizesOf: () => sizes };

function page(placements: Placements): LauncherLayout {
  return {
    version: 1,
    cover: { enabled: true },
    pages: [
      { id: 'home', label: 'Principale', kind: 'widgets', placements: { tablet: placements } },
    ],
  };
}

const placedRect = (layout: LauncherLayout, id: string) =>
  layout.pages.find((item) => item.id === 'home')?.placements.tablet?.[id];

const covers = (rect: CellRect | undefined, cell: { x: number; y: number }) =>
  Boolean(
    rect &&
    cell.x >= rect.x &&
    cell.x < rect.x + rect.w &&
    cell.y >= rect.y &&
    cell.y < rect.y + rect.h
  );

/** Cells between a tapped cell and a rectangle: 0 when the rectangle covers it. */
const cellDistance = (
  rect: { x: number; y: number; w: number; h: number },
  cell: { x: number; y: number }
) =>
  Math.max(0, rect.x - cell.x, cell.x - (rect.x + rect.w - 1)) +
  Math.max(0, rect.y - cell.y, cell.y - (rect.y + rect.h - 1));

describe('size chosen in the sheet, from a «+» cell', () => {
  it('keeps a 2×2 at the nearest free place instead of shrinking it to cover the cell (P1)', () => {
    // Row 0 taken from column 1 on, column 0 taken from row 1 on: only (0,0) is free there.
    const layout = page({ a: { x: 1, y: 0, w: 7, h: 1 }, b: { x: 0, y: 1, w: 1, h: 1 } });
    const result = placeWidgetInLayout(layout, tablet, 'home', 'w', { w: 2, h: 2 }, { x: 0, y: 0 });
    expect(result.pageId).toBe('home');
    expect(placedRect(result.layout, 'w')).toEqual({ x: 1, y: 1, w: 2, h: 2 });
  });

  it('goes next to a cell boxed in by other widgets, at the chosen size', () => {
    const around: Placements = {
      left: { x: 2, y: 0, w: 1, h: 5 },
      right: { x: 4, y: 0, w: 1, h: 5 },
      above: { x: 3, y: 0, w: 1, h: 2 },
      below: { x: 3, y: 3, w: 1, h: 2 },
    };
    const result = placeWidgetInLayout(
      page(around),
      tablet,
      'home',
      'w',
      { w: 2, h: 2 },
      { x: 3, y: 2 }
    );
    const rect = placedRect(result.layout, 'w');
    expect(rect && { w: rect.w, h: rect.h }).toEqual({ w: 2, h: 2 });
    for (const other of Object.values(around)) expect(rectsOverlap(rect!, other)).toBe(false);
    // The nearest 2×2, measured from the cell: right of «right» or left of «left», 2 cells away.
    expect(cellDistance(rect!, { x: 3, y: 2 })).toBe(2);
  });

  it('still covers the cell at the chosen size when there is room around it', () => {
    const result = placeWidgetInLayout(
      page({ a: { x: 4, y: 0, w: 1, h: 5 } }),
      tablet,
      'home',
      'w',
      { w: 2, h: 2 },
      { x: 3, y: 1 }
    );
    // Slides left to stay on the cell, never across «a».
    expect(placedRect(result.layout, 'w')).toEqual({ x: 2, y: 1, w: 2, h: 2 });
  });

  it('shrinks only when the chosen size fits nowhere, and then on the touched cell', () => {
    // Every 2×2 is blocked: the free cells form a checkerboard of single cells and 1×2 bars.
    const blocked: Placements = {};
    for (let x = 0; x < 8; x += 2) {
      for (let y = 0; y < 5; y += 2) blocked[`b${x}${y}`] = { x, y, w: 1, h: 1 };
    }
    const result = placeWidgetInLayout(
      page(blocked),
      tablet,
      'home',
      'w',
      { w: 2, h: 2 },
      { x: 5, y: 3 }
    );
    expect(result.pageId).toBe('home');
    const rect = placedRect(result.layout, 'w');
    expect(rect && rect.w * rect.h).toBeLessThan(4);
    expect(covers(rect, { x: 5, y: 3 })).toBe(true);
    for (const other of Object.values(blocked)) expect(rectsOverlap(rect!, other)).toBe(false);
  });
});
