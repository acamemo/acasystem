/**
 * Pointer dragging of the launcher widgets (move and resize) in edit mode. Cells snap, the
 * target page shows a preview with the other widgets pushed aside, and holding the pointer on
 * the left or right edge turns the page. The keyboard alternative lives in the widget host.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CellRect, CellSize, WidgetSizes } from '@/@types/launcher';
import { clampSize, tryMove, tryResize, type Placements } from '@/utils/launcher/grid';

/** Where a page grid is on screen, in px. */
export interface GridGeometry {
  left: number;
  top: number;
  cell: number;
  gap: number;
  grid: CellSize;
}

export interface DragTarget {
  pageId: string;
  rect: CellRect;
  valid: boolean;
  /** Placements of the target page if dropped now (others pushed aside); null when refused. */
  preview: Placements | null;
}

export interface DragSession {
  mode: 'move' | 'resize';
  widgetId: string;
  label: string;
  sourcePageId: string;
  origin: CellRect;
  /** Size of the widget on screen, for the floating copy. */
  box: { width: number; height: number };
  /** Pointer position inside the widget when it was picked up. */
  offset: { x: number; y: number };
  pointer: { x: number; y: number };
  target: DragTarget | null;
}

export interface DragStart {
  mode: 'move' | 'resize';
  widgetId: string;
  label: string;
  pageId: string;
  origin: CellRect;
  /** Screen box of the widget (getBoundingClientRect). */
  box: { left: number; top: number; width: number; height: number };
  clientX: number;
  clientY: number;
  pointerId: number;
}

export interface WidgetDragOptions {
  getGeometry: (pageId: string) => GridGeometry | null;
  getPlacements: (pageId: string) => Placements;
  sizesFor: (pageId: string, widgetId: string) => WidgetSizes | undefined;
  /** Screen box of the pager, to detect the edges. */
  getPagerBounds: () => { left: number; right: number } | null;
  /** Turns the page towards `direction`; returns the new page id or null when there is none. */
  onEdge: (direction: -1 | 1) => string | null;
  onDrop: (session: DragSession) => void;
  onCancel?: (session: DragSession) => void;
}

const DRAG_THRESHOLD_PX = 6;
const EDGE_PX = 48;
const EDGE_DELAY_MS = 650;

function computeTarget(
  session: Omit<DragSession, 'target'>,
  pageId: string,
  options: WidgetDragOptions
): DragTarget | null {
  const geometry = options.getGeometry(pageId);
  if (!geometry) return null;
  const { grid, cell, gap } = geometry;
  const pitch = cell + gap;
  if (pitch <= 0) return null;
  const placements = options.getPlacements(pageId);
  const sizes = options.sizesFor(pageId, session.widgetId);

  if (session.mode === 'resize') {
    const left = geometry.left + session.origin.x * pitch;
    const top = geometry.top + session.origin.y * pitch;
    const raw = {
      w: Math.round((session.pointer.x - left + gap) / pitch),
      h: Math.round((session.pointer.y - top + gap) / pitch),
    };
    const limited = clampSize(raw, grid, sizes);
    const size = {
      w: Math.min(limited.w, grid.w - session.origin.x),
      h: Math.min(limited.h, grid.h - session.origin.y),
    };
    const rect = { x: session.origin.x, y: session.origin.y, ...size };
    const preview = tryResize(placements, grid, session.widgetId, size);
    return { pageId, rect, valid: preview !== null, preview };
  }

  const size = clampSize({ w: session.origin.w, h: session.origin.h }, grid, sizes);
  const localX = session.pointer.x - session.offset.x - geometry.left;
  const localY = session.pointer.y - session.offset.y - geometry.top;
  const x = Math.min(Math.max(0, Math.round(localX / pitch)), grid.w - size.w);
  const y = Math.min(Math.max(0, Math.round(localY / pitch)), grid.h - size.h);
  const rect = { x, y, w: size.w, h: size.h };
  const preview = tryMove(placements, grid, session.widgetId, rect);
  return { pageId, rect, valid: preview !== null, preview };
}

export function useWidgetDrag(options: WidgetDragOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [session, setSession] = useState<DragSession | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const pendingRef = useRef<DragStart | null>(null);
  const [tracking, setTracking] = useState(false);
  const edgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetPage = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  const endedAt = useRef(0);

  const update = useCallback((next: DragSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const clearEdge = useCallback(() => {
    if (edgeTimer.current) clearTimeout(edgeTimer.current);
    edgeTimer.current = null;
  }, []);

  const stop = useCallback(() => {
    clearEdge();
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    targetPage.current = null;
    pendingRef.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setTracking(false);
    update(null);
  }, [clearEdge, update]);

  /** Starts tracking a press; the drag begins after a few pixels of movement (a tap does not). */
  const begin = useCallback((start: DragStart) => {
    pendingRef.current = start;
    setTracking(true);
  }, []);

  const activate = useCallback(
    (start: DragStart, pointer: { x: number; y: number }) => {
      const base: Omit<DragSession, 'target'> = {
        mode: start.mode,
        widgetId: start.widgetId,
        label: start.label,
        sourcePageId: start.pageId,
        origin: start.origin,
        box: { width: start.box.width, height: start.box.height },
        offset: { x: start.clientX - start.box.left, y: start.clientY - start.box.top },
        pointer,
      };
      targetPage.current = start.pageId;
      update({ ...base, target: computeTarget(base, start.pageId, optionsRef.current) });
    },
    [update]
  );

  const handleEdge = useCallback(
    (pointerX: number) => {
      const current = sessionRef.current;
      const bounds = optionsRef.current.getPagerBounds();
      if (!current || current.mode !== 'move' || !bounds) {
        clearEdge();
        return;
      }
      const direction =
        pointerX < bounds.left + EDGE_PX ? -1 : pointerX > bounds.right - EDGE_PX ? 1 : 0;
      if (direction === 0) {
        clearEdge();
        return;
      }
      if (edgeTimer.current) return;
      edgeTimer.current = setTimeout(() => {
        edgeTimer.current = null;
        const pageId = optionsRef.current.onEdge(direction);
        const latest = sessionRef.current;
        if (!pageId || !latest) return;
        targetPage.current = pageId;
        update({ ...latest, target: null });
        if (settleTimer.current) clearTimeout(settleTimer.current);
        // Wait for the page to scroll into place before measuring it; moving the pointer
        // again on the edge turns one more page.
        settleTimer.current = setTimeout(() => {
          settleTimer.current = null;
          const now = sessionRef.current;
          if (!now) return;
          update({
            ...now,
            target: computeTarget(now, targetPage.current ?? pageId, optionsRef.current),
          });
        }, 320);
      }, EDGE_DELAY_MS);
    },
    [clearEdge, update]
  );

  useEffect(() => {
    if (!tracking) return undefined;

    const onMove = (event: PointerEvent) => {
      const pending = pendingRef.current;
      const pointer = { x: event.clientX, y: event.clientY };
      if (pending && !sessionRef.current) {
        if (event.pointerId !== pending.pointerId) return;
        const moved = Math.hypot(pointer.x - pending.clientX, pointer.y - pending.clientY);
        if (moved < DRAG_THRESHOLD_PX) return;
        activate(pending, pointer);
        return;
      }
      const current = sessionRef.current;
      if (!current) return;
      event.preventDefault();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const latest = sessionRef.current;
        if (!latest) return;
        const moved = { ...latest, pointer };
        const pageId = targetPage.current ?? latest.sourcePageId;
        update({
          ...moved,
          target: settleTimer.current ? null : computeTarget(moved, pageId, optionsRef.current),
        });
        handleEdge(pointer.x);
      });
    };

    const onUp = (event: PointerEvent) => {
      const pending = pendingRef.current;
      if (pending && event.pointerId !== pending.pointerId) return;
      const current = sessionRef.current;
      if (current) {
        endedAt.current = Date.now();
        const pointer = { x: event.clientX, y: event.clientY };
        const pageId = targetPage.current ?? current.sourcePageId;
        const final = { ...current, pointer };
        optionsRef.current.onDrop({
          ...final,
          target: settleTimer.current ? null : computeTarget(final, pageId, optionsRef.current),
        });
      }
      stop();
    };

    const onCancel = () => {
      const current = sessionRef.current;
      if (current) optionsRef.current.onCancel?.(current);
      stop();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !sessionRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [tracking, activate, handleEdge, stop, update]);

  useEffect(() => stop, [stop]);

  /** True right after a drop: the click that follows the release must not act. */
  const justDropped = useCallback(() => Date.now() - endedAt.current < 400, []);

  return { session, begin, cancel: stop, justDropped };
}
