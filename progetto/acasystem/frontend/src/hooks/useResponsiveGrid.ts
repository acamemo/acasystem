import { useState, useEffect } from 'react';
import type { ResponsiveGridResult } from '@/@types/dashboard';
import { MAX_GRID_COLUMNS, MIN_GRID_COLUMNS, MOBILE_BREAKPOINT } from '@/utils/config/constants';

export { MAX_GRID_COLUMNS, MIN_GRID_COLUMNS };

export function getMaxGridColumnsForWidth(width: number): number {
  if (width < MOBILE_BREAKPOINT) return 2;
  if (width < 768) return 3;
  if (width < 1024) return 4;
  return MAX_GRID_COLUMNS;
}

export function getAutoGridColumnsForWidth(width: number): number {
  if (width < 420) return 1;
  if (width < 640) return 2;
  if (width < 1100) return 3;
  return 4;
}

export function getEffectiveGridColumnsForWidth(
  width: number,
  gridColumns: number,
  dynamicColumns = false
): number {
  const maxForWidth = getMaxGridColumnsForWidth(width);
  const suggested = getAutoGridColumnsForWidth(width);
  const targetColumns = dynamicColumns ? Math.min(gridColumns, suggested) : gridColumns;
  return Math.max(MIN_GRID_COLUMNS, Math.min(targetColumns, maxForWidth));
}

/**
 * Responsive grid column count, mobile detection & compact-card flag.
 *
 * @param gridColumns – user-chosen max column count
 * @param dynamicColumns – if true, auto-adjust columns by width/orientation
 */
export function useResponsiveGrid(
  gridColumns: number,
  dynamicColumns = false
): ResponsiveGridResult {
  const [gridColCount, setGridColCount] = useState(1);
  const [isCompactCards, setIsCompactCards] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth
  );

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setViewportWidth(w);
      setIsMobile(w < MOBILE_BREAKPOINT);
      setGridColCount(getEffectiveGridColumnsForWidth(w, gridColumns, dynamicColumns));
      setIsCompactCards(w >= 480 && w < 640);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [gridColumns, dynamicColumns]);

  return { gridColCount, isCompactCards, isMobile, viewportWidth };
}
