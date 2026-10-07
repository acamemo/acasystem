/**
 * Cell geometry of the launcher (ADR-0007): pure functions on rectangles in grid cells.
 * A page is `grid.w` columns × `grid.h` rows; placements never overlap and never leave the grid.
 */
import type { CellRect, CellSize, WidgetSizes } from '@/@types/launcher';

/** Widget id → rectangle, for one page and one device class. */
export type Placements = Record<string, CellRect>;

export interface PackItem {
  id: string;
  size: CellSize;
  /** Smallest size the widget accepts when it has to shrink; 1×1 when unknown. */
  min?: CellSize;
}

export interface PackResult {
  placements: Placements;
  /** Items that did not fit even at their minimum size, in input order. */
  overflow: PackItem[];
}

const ONE: CellSize = { w: 1, h: 1 };

export function rectsOverlap(a: CellRect, b: CellRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** True when the rectangle is made of whole cells and lies inside the grid. */
export function rectFits(rect: CellRect, grid: CellSize): boolean {
  return (
    Number.isInteger(rect.x) &&
    Number.isInteger(rect.y) &&
    Number.isInteger(rect.w) &&
    Number.isInteger(rect.h) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.w >= 1 &&
    rect.h >= 1 &&
    rect.x + rect.w <= grid.w &&
    rect.y + rect.h <= grid.h
  );
}

const clampInt = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;

/** Size limited by the widget's min/max and by the grid. */
export function clampSize(size: CellSize, grid: CellSize, sizes?: WidgetSizes): CellSize {
  const minW = Math.min(sizes?.min.w ?? 1, grid.w);
  const minH = Math.min(sizes?.min.h ?? 1, grid.h);
  const maxW = Math.min(sizes?.max.w ?? grid.w, grid.w);
  const maxH = Math.min(sizes?.max.h ?? grid.h, grid.h);
  return {
    w: clampInt(size.w, minW, Math.max(minW, maxW)),
    h: clampInt(size.h, minH, Math.max(minH, maxH)),
  };
}

/** Ids ordered by reading position: top to bottom, then left to right. */
export function idsByPosition(placements: Placements): string[] {
  return Object.keys(placements).sort((a, b) => {
    const ra = placements[a];
    const rb = placements[b];
    return ra.y - rb.y || ra.x - rb.x || a.localeCompare(b);
  });
}

/** True when the rectangle overlaps none of the placements (except the ignored ids). */
export function isFree(
  placements: Placements,
  rect: CellRect,
  ignore: ReadonlySet<string> = new Set()
): boolean {
  return Object.entries(placements).every(
    ([id, other]) => ignore.has(id) || !rectsOverlap(rect, other)
  );
}

/**
 * How `near` is measured: from the rectangle's top-left corner (a position to keep, as when a
 * widget is displaced) or from the whole rectangle (a cell to cover, as when the user taps
 * a free cell: 0 when the rectangle covers it).
 */
export type NearMeasure = 'origin' | 'cell';

const distanceTo = (rect: CellRect, near: { x: number; y: number }, measure: NearMeasure) =>
  measure === 'origin'
    ? Math.abs(rect.x - near.x) + Math.abs(rect.y - near.y)
    : Math.max(0, rect.x - near.x, near.x - (rect.x + rect.w - 1)) +
      Math.max(0, rect.y - near.y, near.y - (rect.y + rect.h - 1));

/**
 * First free rectangle of the given size. Without `near` it scans rows then columns
 * (reading order); with `near` it picks the free position closest to that point.
 */
export function findFreeRect(
  placements: Placements,
  grid: CellSize,
  size: CellSize,
  near?: { x: number; y: number },
  measure: NearMeasure = 'origin'
): CellRect | null {
  if (size.w > grid.w || size.h > grid.h || size.w < 1 || size.h < 1) return null;
  const candidates: CellRect[] = [];
  for (let y = 0; y + size.h <= grid.h; y += 1) {
    for (let x = 0; x + size.w <= grid.w; x += 1) {
      const rect = { x, y, w: size.w, h: size.h };
      if (!isFree(placements, rect)) continue;
      if (!near) return rect;
      candidates.push(rect);
    }
  }
  if (!near || candidates.length === 0) return null;
  const distance = (rect: CellRect) => distanceTo(rect, near, measure);
  candidates.sort((a, b) => distance(a) - distance(b) || a.y - b.y || a.x - b.x);
  return candidates[0];
}

/** Sizes from the requested one down to the minimum, largest area first. */
export function shrinkCandidates(size: CellSize, min: CellSize = ONE): CellSize[] {
  const list: CellSize[] = [];
  const minW = Math.max(1, Math.min(min.w, size.w));
  const minH = Math.max(1, Math.min(min.h, size.h));
  for (let w = size.w; w >= minW; w -= 1) {
    for (let h = size.h; h >= minH; h -= 1) list.push({ w, h });
  }
  return list.sort((a, b) => b.w * b.h - a.w * a.h || b.w - a.w);
}

/**
 * First free rectangle at the requested size, shrinking down to `min` when needed; with
 * `near`, the free position closest to that cell at each size.
 */
export function findFreeRectShrinking(
  placements: Placements,
  grid: CellSize,
  size: CellSize,
  min: CellSize = ONE,
  near?: { x: number; y: number },
  measure: NearMeasure = 'origin'
): CellRect | null {
  for (const candidate of shrinkCandidates(size, min)) {
    const rect = findFreeRect(placements, grid, candidate, near, measure);
    if (rect) return rect;
  }
  return null;
}

/** True when the cell lies inside the grid. */
export function cellInGrid(cell: { x: number; y: number }, grid: CellSize): boolean {
  return (
    Number.isInteger(cell.x) &&
    Number.isInteger(cell.y) &&
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < grid.w &&
    cell.y < grid.h
  );
}

/**
 * Free rectangle that covers `cell`, from the requested size down to `min` (largest first).
 * At each size the rectangle starts on the cell; when that leaves the grid or meets another
 * widget it slides left and up, as long as it still covers the cell. Null when none fits.
 */
export function findFreeRectAtCell(
  placements: Placements,
  grid: CellSize,
  size: CellSize,
  min: CellSize,
  cell: { x: number; y: number }
): CellRect | null {
  if (!cellInGrid(cell, grid)) return null;
  for (const candidate of shrinkCandidates(size, min)) {
    const offsets: Array<{ dx: number; dy: number }> = [];
    for (let dy = 0; dy < candidate.h; dy += 1) {
      for (let dx = 0; dx < candidate.w; dx += 1) offsets.push({ dx, dy });
    }
    offsets.sort((a, b) => a.dx + a.dy - (b.dx + b.dy) || a.dy - b.dy || a.dx - b.dx);
    for (const { dx, dy } of offsets) {
      const rect = { x: cell.x - dx, y: cell.y - dy, w: candidate.w, h: candidate.h };
      if (rectFits(rect, grid) && isFree(placements, rect)) return rect;
    }
  }
  return null;
}

/** Cells not covered by any placement, in reading order. */
export function freeCells(placements: Placements, grid: CellSize): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < grid.h; y += 1) {
    for (let x = 0; x < grid.w; x += 1) {
      if (isFree(placements, { x, y, w: 1, h: 1 })) cells.push({ x, y });
    }
  }
  return cells;
}

/** Packs items in order (first fit, shrinking when needed); what does not fit overflows. */
export function packItems(
  items: readonly PackItem[],
  grid: CellSize,
  initial: Placements = {}
): PackResult {
  const placements: Placements = { ...initial };
  const overflow: PackItem[] = [];
  for (const item of items) {
    if (placements[item.id]) continue;
    const size = { w: Math.min(item.size.w, grid.w), h: Math.min(item.size.h, grid.h) };
    const rect = findFreeRectShrinking(placements, grid, size, item.min);
    if (rect) placements[item.id] = rect;
    else overflow.push(item);
  }
  return { placements, overflow };
}

/**
 * Puts `id` at `target`. Widgets in the way move to the free position closest to where they
 * were; if one of them finds no room the move is rejected (null). Nothing else moves.
 */
export function tryMove(
  placements: Placements,
  grid: CellSize,
  id: string,
  target: CellRect
): Placements | null {
  if (!rectFits(target, grid)) return null;
  const displaced = idsByPosition(placements).filter(
    (other) => other !== id && rectsOverlap(placements[other], target)
  );
  const next: Placements = {};
  for (const [other, rect] of Object.entries(placements)) {
    if (other !== id && !displaced.includes(other)) next[other] = rect;
  }
  next[id] = { ...target };
  for (const other of displaced) {
    const original = placements[other];
    const rect = findFreeRect(next, grid, { w: original.w, h: original.h }, original);
    if (!rect) return null;
    next[other] = rect;
  }
  return next;
}

/** Changes the size of `id` keeping its top-left cell; widgets in the way move or reject it. */
export function tryResize(
  placements: Placements,
  grid: CellSize,
  id: string,
  size: CellSize
): Placements | null {
  const current = placements[id];
  if (!current) return null;
  return tryMove(placements, grid, id, { x: current.x, y: current.y, w: size.w, h: size.h });
}

/** Same placements (same ids and rectangles)? */
export function samePlacements(a: Placements | undefined, b: Placements | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const ra = a[key];
    const rb = b[key];
    return Boolean(rb) && ra.x === rb.x && ra.y === rb.y && ra.w === rb.w && ra.h === rb.h;
  });
}
