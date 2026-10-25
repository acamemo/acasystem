/**
 * Device classes and their grids (ADR-0007). Each class keeps its own placements, like
 * separate Android home screens; the class comes from the viewport width and orientation.
 */
import type {
  BaseDeviceClass,
  CellSize,
  DeviceClass,
  GridDensity,
  LauncherGrids,
} from '@/@types/launcher';

/**
 * Columns (w) × rows (h) per class. The landscape phone has two rows, so edit mode stays
 * usable, and six columns, so at 640×400 its cells are not smaller than the portrait phone's
 * (measured in REP-20261006-002). On wider landscape screens, such as the Lenovo Tab M11 in
 * Chrome (about 1024×472 CSS px, REP-20261008-001), the pages without a choice of columns use
 * the tablet's 8 columns instead (landscapeFits, pageClass in layout.ts).
 */
export const DEFAULT_GRIDS: LauncherGrids = {
  phone: { w: 4, h: 6 },
  phoneLandscape: { w: 6, h: 2 },
  tabletPortrait: { w: 6, h: 8 },
  tablet: { w: 8, h: 5 },
};

/** The screen classes. */
export const BASE_DEVICE_CLASSES: readonly BaseDeviceClass[] = [
  'tablet',
  'tabletPortrait',
  'phone',
  'phoneLandscape',
];

/** Every class of placements: each screen class at normal, compact and wide density. */
export const DEVICE_CLASSES: readonly DeviceClass[] = [
  ...BASE_DEVICE_CLASSES,
  ...BASE_DEVICE_CLASSES.map((item) => `${item}@compact` as const),
  ...BASE_DEVICE_CLASSES.map((item) => `${item}@wide` as const),
];

/*
 * Grid densities (REP-20261007-034), as the grid sizes of Android home settings: compact has
 * fewer, larger cells; wide more, smaller ones. They are the default of the pages without a
 * choice of columns (REP-20261008-001).
 */
export const DENSITY_GRIDS: Record<Exclude<GridDensity, 'normal'>, LauncherGrids> = {
  compact: {
    phone: { w: 3, h: 5 },
    phoneLandscape: { w: 5, h: 2 },
    tabletPortrait: { w: 5, h: 7 },
    tablet: { w: 6, h: 4 },
  },
  wide: {
    phone: { w: 5, h: 7 },
    phoneLandscape: { w: 8, h: 3 },
    tabletPortrait: { w: 7, h: 10 },
    tablet: { w: 10, h: 6 },
  },
};

/** Minimum gap between cells in px: tighter on phones, where cells are small. */
export const GRID_GAPS: Record<BaseDeviceClass, number> = {
  phone: 10,
  phoneLandscape: 10,
  tabletPortrait: 14,
  tablet: 16,
};

/** Screen class of a class of placements. */
export function baseClassOf(deviceClass: DeviceClass): BaseDeviceClass {
  return deviceClass.split('@')[0] as BaseDeviceClass;
}

/** Density of a class of placements. */
export function densityOf(deviceClass: DeviceClass): GridDensity {
  const density = deviceClass.split('@')[1];
  return density === 'compact' || density === 'wide' ? density : 'normal';
}

/** Class of placements for a screen class at a density. */
export function classWithDensity(
  base: BaseDeviceClass,
  density: GridDensity | undefined
): DeviceClass {
  return !density || density === 'normal' ? base : `${base}@${density}`;
}

/*
 * Keys that name their own grid (REP-20261008-001): `phoneLandscape@8x2` is 8 columns × 2 rows
 * on a landscape phone. A page with its own columns keeps its placements under such a key; the
 * key never changes grid, so a new reference area only makes new keys.
 */
const GRID_KEY = /^(tablet|tabletPortrait|phone|phoneLandscape)@(\d{1,2})x(\d{1,2})$/;
/** Largest side of a grid in a key, as the validator accepts it. */
export const GRID_KEY_MAX = 16;

/** Screen class and grid of a `base@WxH` key; null for the other keys. */
export function parseGridKey(key: string): { base: BaseDeviceClass; w: number; h: number } | null {
  const match = GRID_KEY.exec(key);
  if (!match) return null;
  const w = Number(match[2]);
  const h = Number(match[3]);
  if (w < 1 || h < 1 || w > GRID_KEY_MAX || h > GRID_KEY_MAX) return null;
  return { base: match[1] as BaseDeviceClass, w, h };
}

/** True for a key of placements: a class at a density, or a `base@WxH` grid. */
export function isPlacementKey(value: unknown): value is DeviceClass {
  return (
    typeof value === 'string' &&
    ((DEVICE_CLASSES as readonly string[]).includes(value) || parseGridKey(value) !== null)
  );
}

/** Grid of a class of placements: the given grids at normal density, the table otherwise. */
export function gridFor(grids: LauncherGrids, deviceClass: DeviceClass): CellSize {
  const named = parseGridKey(deviceClass);
  if (named) return { w: named.w, h: named.h };
  const base = baseClassOf(deviceClass);
  const density = densityOf(deviceClass);
  return density === 'normal' ? grids[base] : DENSITY_GRIDS[density][base];
}

/*
 * Columns per page (REP-20261008-001, U7). A page stores one number, its columns on a landscape
 * screen; each screen class shows a share of it (SCALE) within its own limit. The rows follow
 * from the columns on a fixed reference area of the class, never from the live area (E10): the
 * arrangement stays the same while the overview, a notice or the keyboard change the space.
 */
export const COLUMNS_RANGE = { min: 2, max: 10 } as const;
/** Columns of the cover until the user chooses others: three large squares. */
export const COVER_COLUMNS = 3;
export const COLUMN_SCALE: Record<BaseDeviceClass, number> = {
  tablet: 1,
  phoneLandscape: 1,
  tabletPortrait: 0.75,
  phone: 0.5,
};
export const COLUMN_LIMIT: Record<BaseDeviceClass, number> = {
  tablet: 10,
  phoneLandscape: 9,
  tabletPortrait: 6,
  phone: 4,
};
/*
 * Area inside the frame (CSS px) that fixes the rows of each class. phoneLandscape is the
 * Lenovo Tab M11 in Chrome as measured on the screenshots of 2026-10-08 (status bar pill of
 * 52 px drawn 81 px high on a 1600 px copy of the 1920 px screen: scale 1.875, viewport 1024 CSS
 * px wide, about 472 high; the cell of 110 px limited by the height gives a grid area of 973×230,
 * so a frame of about 242 px instead of the 200 of the CSS, deduced and to confirm on the new
 * build); tablet is the same screen in full screen (1024×640) with the frame of the CSS. Portrait
 * tablet and phone are estimates (Lenovo upright in Chrome, phone 390×844).
 *
 * They are fixed on purpose and are NOT the live frame any more (REP-20261013-002, ADR-0013): the
 * status bar went down to the footer band and the top band is the safe area alone, so the pages
 * gain 64 px (the Lenovo in full screen: a grid area of 973×504, not 973×440). The rows (rowsOn),
 * the keys of the saved arrangements (columnsKey) and the size across keys (sizeAcrossKeys) read
 * these values: changing them would reshuffle every saved layout. Calibrating them again is a
 * separate decision with a migration; the guard in LauncherGeometry.test.ts holds the outcomes.
 */
export const REFERENCE_AREAS: Record<BaseDeviceClass, { width: number; height: number }> = {
  tablet: { width: 973, height: 440 },
  phoneLandscape: { width: 973, height: 230 },
  tabletPortrait: { width: 568, height: 540 },
  phone: { width: 358, height: 576 },
};
/** Rows are dropped while the reference cell would be smaller than this. */
const MIN_REFERENCE_CELL = 72;

/** Columns shown on a screen class for the columns chosen for a page. */
export function columnsOn(base: BaseDeviceClass, columns: number): number {
  const shown = Math.round(columns * COLUMN_SCALE[base]);
  return Math.min(COLUMN_LIMIT[base], Math.max(COLUMNS_RANGE.min, shown));
}

/**
 * Rows of a grid of `columns` on a screen class: as many square cells as fit the reference
 * area, rounded (the spare space goes to the gaps), never cells under MIN_REFERENCE_CELL.
 */
export function rowsOn(base: BaseDeviceClass, columns: number): number {
  const { width, height } = REFERENCE_AREAS[base];
  const gap = GRID_GAPS[base];
  const cell = (width - (columns - 1) * gap) / columns;
  let rows = Math.max(1, Math.round((height + gap) / (cell + gap)));
  while (rows > 1 && (height - (rows - 1) * gap) / rows < MIN_REFERENCE_CELL) rows -= 1;
  return rows;
}

/** Columns to store for the columns shown on a screen class (the selector works in these). */
export function columnsToStore(base: BaseDeviceClass, shown: number): number {
  const stored = Math.round(shown / COLUMN_SCALE[base]);
  return Math.min(COLUMNS_RANGE.max, Math.max(COLUMNS_RANGE.min, stored));
}

/**
 * Key of the placements of a grid on a screen class: the class key when the grid is one of
 * its density grids (normal, compact, wide), so nothing moves, else `base@WxH`.
 */
export function placementKey(
  base: BaseDeviceClass,
  grid: CellSize,
  grids: LauncherGrids
): DeviceClass {
  const same = (other: CellSize) => other.w === grid.w && other.h === grid.h;
  if (same(grids[base])) return base;
  if (same(DENSITY_GRIDS.compact[base])) return `${base}@compact`;
  if (same(DENSITY_GRIDS.wide[base])) return `${base}@wide`;
  return `${base}@${grid.w}x${grid.h}`;
}

/** Key of the placements of a page with `columns` on a screen class. */
export function columnsKey(
  base: BaseDeviceClass,
  columns: number,
  grids: LauncherGrids
): DeviceClass {
  const w = columnsOn(base, columns);
  return placementKey(base, { w, h: rowsOn(base, w) }, grids);
}

/** Cell of the portrait phone (REP-20261006-002): every widget shows its controls whole. */
export const PORTRAIT_PHONE_CELL = 84;

/**
 * True when a landscape screen `width` CSS px wide gives `columns` cells at least as large as
 * the portrait phone's, with the side gutters of the launcher (clamp(16px, 2.5vw, 28px)) and
 * the minimum gaps. The Lenovo in Chrome (1024) and a phone at 844 qualify for 8 columns; a
 * tablet zoomed to 200 % (640×400) does not, and keeps the grid of its class (6×2).
 */
export function landscapeFits(width: number, columns: number): boolean {
  const gutter = Math.min(28, Math.max(16, width * 0.025));
  const gaps = (columns - 1) * GRID_GAPS.phoneLandscape;
  return (width - 2 * gutter - gaps) / columns >= PORTRAIT_PHONE_CELL;
}

/**
 * Below this short side (CSS px) the screen is a phone, in either orientation. The Lenovo in
 * Chrome falls here (short side about 472 px): its columns come from the width instead
 * (landscapeFits, REFERENCE_AREAS, pageClass), so the class does not cut them.
 */
export const PHONE_MAX_SHORT_SIDE = 600;

export function deviceClassFor(width: number, height: number): BaseDeviceClass {
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
  /** Gaps between columns and between rows: the spare space of each axis (U7). */
  gapX: number;
  gapY: number;
  /** Size of the whole grid in px (centred in the available area). */
  width: number;
  height: number;
}

/** Largest gap as a share of the cell: beyond it the grid stays centred with margins. */
export const GAP_MAX_RATIO = 0.5;

/**
 * Largest square cell that lets the whole grid fit the available area (no scrolling), with
 * the gaps at least `minGap`; the space left on each axis goes to that axis's gaps, up to half
 * a cell (REP-20261008-001). Gaps above the minimum are floored to device pixels; the cell stays
 * in whole CSS px, so on fractional pixel ratios the steps can still fall between device pixels.
 */
export function cellMetrics(
  availableWidth: number,
  availableHeight: number,
  grid: CellSize,
  minGap: number,
  pixelRatio = 1,
  spreadGaps = true
): CellMetrics {
  const byWidth = (availableWidth - minGap * (grid.w - 1)) / grid.w;
  const byHeight = (availableHeight - minGap * (grid.h - 1)) / grid.h;
  const cell = Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
  const ratio = pixelRatio > 0 ? pixelRatio : 1;
  const cap = spreadGaps ? Math.max(minGap, cell * GAP_MAX_RATIO) : minGap;
  const spread = (available: number, count: number) => {
    if (count <= 1) return 0;
    const gap = Math.min(cap, (available - cell * count) / (count - 1));
    return gap > minGap ? Math.max(minGap, Math.floor(gap * ratio) / ratio) : minGap;
  };
  const gapX = spread(availableWidth, grid.w);
  const gapY = spread(availableHeight, grid.h);
  return {
    cell,
    gapX,
    gapY,
    width: cell * grid.w + gapX * (grid.w - 1),
    height: cell * grid.h + gapY * (grid.h - 1),
  };
}

/** Pixel box of a cell rectangle inside the grid. */
export function rectToBox(
  rect: { x: number; y: number; w: number; h: number },
  metrics: Pick<CellMetrics, 'cell' | 'gapX' | 'gapY'>
) {
  return {
    left: rect.x * (metrics.cell + metrics.gapX),
    top: rect.y * (metrics.cell + metrics.gapY),
    width: rect.w * metrics.cell + (rect.w - 1) * metrics.gapX,
    height: rect.h * metrics.cell + (rect.h - 1) * metrics.gapY,
  };
}
