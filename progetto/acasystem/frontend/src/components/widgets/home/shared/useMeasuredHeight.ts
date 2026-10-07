import { useCallback, useRef, useState } from 'react';

/**
 * Height in px of an element, kept up to date with ResizeObserver. Cells change with the
 * device (about 80 px on phones, 115–125 px on tablets): lists use it to show only the rows
 * that fit. Null until measured or where ResizeObserver is missing (tests): callers fall back
 * to an estimate from the cell count.
 */
export function useMeasuredHeight<T extends HTMLElement>(): [
  (node: T | null) => void,
  number | null,
] {
  const [height, setHeight] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) setHeight(Math.round(entry.contentRect.height));
    });
    resizeObserver.observe(node);
    observer.current = resizeObserver;
  }, []);
  return [ref, height];
}

/**
 * Rows of `rowHeight` that fit in `available` px; when not all `total` rows fit, `footer` px
 * are kept for the «Altri…» line. At least one row.
 */
export function rowsThatFit(
  available: number,
  rowHeight: number,
  total: number,
  footer: number
): number {
  const all = Math.floor(available / rowHeight);
  if (all >= total) return Math.max(1, total);
  return Math.max(1, Math.floor((available - footer) / rowHeight));
}
