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

/** Square cells and gaps of a grid in px: enough to turn a box into cells. */
export interface CellPitch {
  cell: number;
  gapX: number;
  gapY: number;
}

/**
 * Cells of a grid nearest to a box in px (REP-20261012-001): a widget moved to a page whose
 * cells have another size keeps about the size it shows. At least one cell on each axis.
 */
export function cellsForBox(box: { width: number; height: number }, pitch: CellPitch): CellSize {
  const span = (px: number, gap: number) =>
    pitch.cell + gap > 0 ? Math.max(1, Math.round((px + gap) / (pitch.cell + gap))) : 1;
  return { w: span(box.width, pitch.gapX), h: span(box.height, pitch.gapY) };
}

/** Box in px of a rectangle of `size` cells. */
export function boxOfCells(size: CellSize, pitch: CellPitch): { width: number; height: number } {
  return {
    width: size.w * pitch.cell + (size.w - 1) * pitch.gapX,
    height: size.h * pitch.cell + (size.h - 1) * pitch.gapY,
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

/** Index of a cell in reading order. */
const readingIndex = (cell: { x: number; y: number }, grid: CellSize) => cell.y * grid.w + cell.x;

/** Reading index just after the top-left cell of the last placement (0 when there is none). */
export function afterLastPlaced(placements: Placements, grid: CellSize): number {
  return Object.values(placements).reduce(
    (last, rect) => Math.max(last, readingIndex(rect, grid) + 1),
    0
  );
}

/**
 * Free rectangle at the largest size that fits (down to `min`): at that size the first place
 * at or after `from` in reading order, else the first hole before it.
 */
function findFreeRectFrom(
  placements: Placements,
  grid: CellSize,
  size: CellSize,
  min: CellSize | undefined,
  from: number
): CellRect | null {
  for (const candidate of shrinkCandidates(size, min)) {
    let hole: CellRect | null = null;
    for (let y = 0; y + candidate.h <= grid.h; y += 1) {
      for (let x = 0; x + candidate.w <= grid.w; x += 1) {
        const rect = { x, y, w: candidate.w, h: candidate.h };
        if (!isFree(placements, rect)) continue;
        if (readingIndex(rect, grid) >= from) return rect;
        hole ??= rect;
      }
    }
    if (hole) return hole;
  }
  return null;
}

/**
 * Packs items in order (first fit, shrinking when needed); what does not fit overflows. With
 * `from` (a reading index) the items go after it first, each after the previous one, and only
 * then into the holes before it (REP-20261008-001: what a new grid cannot keep in place goes
 * after the widgets that stayed).
 */
export function packItems(
  items: readonly PackItem[],
  grid: CellSize,
  initial: Placements = {},
  options: { from?: number } = {}
): PackResult {
  const placements: Placements = { ...initial };
  const overflow: PackItem[] = [];
  let cursor = options.from;
  for (const item of items) {
    if (placements[item.id]) continue;
    const size = { w: Math.min(item.size.w, grid.w), h: Math.min(item.size.h, grid.h) };
    const rect =
      cursor === undefined
        ? findFreeRectShrinking(placements, grid, size, item.min)
        : findFreeRectFrom(placements, grid, size, item.min, cursor);
    if (rect && cursor !== undefined) {
      cursor = Math.max(cursor, readingIndex(rect, grid) + 1);
    }
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

/**
 * Side or corner dragged when resizing (REP-20261007-027): -1 moves the left/top side, 1 the
 * right/bottom side, 0 leaves that axis alone. The opposite side stays where it is.
 */
export interface ResizeEdge {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

function resizeAxis(
  start: number,
  length: number,
  side: -1 | 0 | 1,
  line: number,
  min: number,
  max: number,
  cells: number
): [number, number] {
  if (side === 0) return [start, length];
  if (side === 1) {
    const room = Math.max(1, cells - start);
    const size = Math.min(Math.max(line - start, min), max, room);
    return [start, Math.max(1, size)];
  }
  const end = start + length;
  const size = Math.max(1, Math.min(Math.max(end - line, min), max, end));
  return [end - size, size];
}

/**
 * Rectangle after dragging `edge` of `origin` to the grid lines `line` (0 = left/top edge of
 * the grid, grid.w/grid.h = right/bottom edge): the side follows the line, the opposite side
 * stays, the size keeps the widget's min/max and the rectangle stays inside the grid.
 */
export function resizeRect(
  origin: CellRect,
  edge: ResizeEdge,
  line: { x: number; y: number },
  grid: CellSize,
  sizes?: WidgetSizes
): CellRect {
  const minW = Math.min(sizes?.min.w ?? 1, grid.w);
  const minH = Math.min(sizes?.min.h ?? 1, grid.h);
  const maxW = Math.max(minW, Math.min(sizes?.max.w ?? grid.w, grid.w));
  const maxH = Math.max(minH, Math.min(sizes?.max.h ?? grid.h, grid.h));
  const [x, w] = resizeAxis(origin.x, origin.w, edge.x, Math.round(line.x), minW, maxW, grid.w);
  const [y, h] = resizeAxis(origin.y, origin.h, edge.y, Math.round(line.y), minH, maxH, grid.h);
  return { x, y, w, h };
}

/**
 * Like tryMove, but when a widget in the way finds no room the page makes room
 * (REP-20261007-027):
 *   1. the widgets in the way go to the nearest free spot, shrinking down to their minimum;
 *   2. otherwise every other widget is packed again in reading order around `target`,
 *      shrinking down to its minimum.
 * Null only when even that leaves a widget out. `minOf` gives the minimum size of a widget;
 * without it a widget keeps its size.
 */
export function tryMoveWithReflow(
  placements: Placements,
  grid: CellSize,
  id: string,
  target: CellRect,
  minOf?: (widgetId: string) => CellSize | undefined
): Placements | null {
  const direct = tryMove(placements, grid, id, target);
  if (direct) return direct;
  if (!rectFits(target, grid)) return null;
  const minFor = (other: string) => {
    const rect = placements[other];
    return minOf?.(other) ?? { w: rect.w, h: rect.h };
  };

  // 1. Only the widgets in the way move, shrinking if they must.
  const displaced = idsByPosition(placements).filter(
    (other) => other !== id && rectsOverlap(placements[other], target)
  );
  const kept: Placements = { [id]: { ...target } };
  for (const [other, rect] of Object.entries(placements)) {
    if (other !== id && !displaced.includes(other)) kept[other] = rect;
  }
  let local: Placements | null = { ...kept };
  for (const other of displaced) {
    const original = placements[other];
    const rect = findFreeRectShrinking(
      local,
      grid,
      { w: original.w, h: original.h },
      minFor(other),
      original
    );
    if (!rect) {
      local = null;
      break;
    }
    local[other] = rect;
  }
  if (local) return local;

  // 2. The whole page is packed again around the target.
  const items: PackItem[] = idsByPosition(placements)
    .filter((other) => other !== id)
    .map((other) => ({
      id: other,
      size: { w: placements[other].w, h: placements[other].h },
      min: minFor(other),
    }));
  const packed = packItems(items, grid, { [id]: { ...target } });
  return packed.overflow.length === 0 ? packed.placements : null;
}

/** Ids whose size differs between two placements (widgets shrunk to make room). */
export function resizedIds(before: Placements, after: Placements, ignore?: string): string[] {
  return Object.keys(after).filter((other) => {
    if (other === ignore || !before[other]) return false;
    return before[other].w !== after[other].w || before[other].h !== after[other].h;
  });
}
