import { describe, expect, it } from 'vitest';
import { cellMetrics, deviceClassFor, rectToBox } from '@/utils/launcher/deviceClass';
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
    expect(rectToBox({ x: 1, y: 2, w: 2, h: 1 }, metrics)).toEqual({
      left: 123,
      top: 246,
      width: 230,
      height: 107,
    });
  });
});
