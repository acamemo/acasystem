/**
 * Device classes and their grids (ADR-0007). Each class keeps its own placements, like
 * separate Android home screens; the class comes from the viewport width and orientation.
 */
import type { CellSize, DeviceClass, LauncherGrids } from '@/@types/launcher';

/**
 * Columns (w) × rows (h) per class: to be tuned on the pilot tablet. The landscape phone has
 * two rows, so edit mode stays usable, and six columns, so at 640×400 (tablet at 200%) its
 * cells are not smaller than the portrait phone's (measured in REP-20261006-002).
 */
export const DEFAULT_GRIDS: LauncherGrids = {
  phone: { w: 4, h: 6 },
  phoneLandscape: { w: 6, h: 2 },
  tabletPortrait: { w: 6, h: 8 },
  tablet: { w: 8, h: 5 },
};

export const DEVICE_CLASSES: readonly DeviceClass[] = [
  'tablet',
  'tabletPortrait',
  'phone',
  'phoneLandscape',
];

/** Gap between cells in px: tighter on phones, where cells are small. */
export const GRID_GAPS: Record<DeviceClass, number> = {
  phone: 10,
  phoneLandscape: 10,
  tabletPortrait: 14,
  tablet: 16,
};

/** Below this short side (CSS px) the screen is a phone, in either orientation. */
export const PHONE_MAX_SHORT_SIDE = 600;

export function deviceClassFor(width: number, height: number): DeviceClass {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'tablet';
  }
  if (Math.min(width, height) < PHONE_MAX_SHORT_SIDE) {
    return width > height ? 'phoneLandscape' : 'phone';
  }
  return height > width ? 'tabletPortrait' : 'tablet';
}

export interface CellMetrics {
  /** Side of a square cell in px. */
  cell: number;
  gap: number;
  /** Size of the whole grid in px (centred in the available area). */
  width: number;
  height: number;
}

/** Largest square cell that lets the whole grid fit the available area (no scrolling). */
export function cellMetrics(
  availableWidth: number,
  availableHeight: number,
  grid: CellSize,
  gap: number
): CellMetrics {
  const byWidth = (availableWidth - gap * (grid.w - 1)) / grid.w;
  const byHeight = (availableHeight - gap * (grid.h - 1)) / grid.h;
  const cell = Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
  return {
    cell,
    gap,
    width: cell * grid.w + gap * (grid.w - 1),
    height: cell * grid.h + gap * (grid.h - 1),
  };
}

/** Pixel box of a cell rectangle inside the grid. */
export function rectToBox(
  rect: { x: number; y: number; w: number; h: number },
  metrics: Pick<CellMetrics, 'cell' | 'gap'>
) {
  const pitch = metrics.cell + metrics.gap;
  return {
    left: rect.x * pitch,
    top: rect.y * pitch,
    width: rect.w * metrics.cell + (rect.w - 1) * metrics.gap,
    height: rect.h * metrics.cell + (rect.h - 1) * metrics.gap,
  };
}
