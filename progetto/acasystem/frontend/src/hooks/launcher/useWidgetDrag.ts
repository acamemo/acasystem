/**
 * Pointer dragging of the launcher widgets in edit mode: move, resize from any side or corner,
 * and add (a widget type dragged from the tray, REP-20261007-027). Cells snap, the target page
 * shows a preview with the other widgets pushed aside or packed again to make room, and holding
 * the pointer on the left or right edge turns the page. A widget not yet selected lifts only
 * after a press of a second (holdMs, REP-20261008-001). The keyboard alternative lives in the
 * widget host.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CellRect, CellSize, WidgetSizes } from '@/@types/launcher';
import { afterNextFrame } from '@/utils/launcher/afterFrame';
import { canAnimate, prefersReducedMotion } from '@/utils/launcher/motion';
import { HOLD_TOLERANCE_PX, vibrate } from './gestures';
import {
  boxOfCells,
  cellsForBox,
  clampSize,
  resizeRect,
  shrinkCandidates,
  tryMove,
  tryMoveWithReflow,
  type Placements,
  type ResizeEdge,
} from '@/utils/launcher/grid';

/** Id of the widget that a drag from the tray is adding (it has no card yet). */
export const NEW_WIDGET_ID = '__aca_new_widget__';

export type DragMode = 'move' | 'resize' | 'add';

/** Where a page grid is on screen, in px; the gaps differ between the axes (REP-20261008-001). */
export interface GridGeometry {
  left: number;
  top: number;
  cell: number;
  gapX: number;
  gapY: number;
  grid: CellSize;
}

export interface DragTarget {
  pageId: string;
  rect: CellRect;
  valid: boolean;
  /** Placements of the target page if dropped now (others pushed aside); null when refused. */
  preview: Placements | null;
  /**
   * The pointer has not rested on this place long enough yet (REP-20261007-032): the others
   * stay where they are in the preview; a drop still makes room as usual.
   */
  waiting?: boolean;
  /**
   * The widget is held over the middle of this other widget of the same page: dropped there,
   * the two make a stack (REP-20261007-037), as Launcher3 makes a folder.
   */
  stackOn?: string;
}

/**
 * The flight of the copy after the release (REP-20261023-006, D-M8, D-M10): it lands in its cell
 * (`land`), goes back to the one it left when the drop is refused (`return`), or shrinks away over
 * the trash (`remove`). A `land` is committed at the release, before the flight (`onDrop` with
 * `flying`), and the widget shows when the copy has landed (`flightEnded`, `onLanded`); the others
 * are committed when they have landed (`flightEnded`).
 */
export interface DragFlight {
  kind: 'land' | 'return' | 'remove';
  /** Top-left corner of the copy at the end of the flight, on screen. */
  x: number;
  y: number;
  /** Uniform scale that brings the copy to the size of the cell it flies to. */
  scale: number;
}

export interface DragSession {
  mode: DragMode;
  /** Side or corner being dragged (resize only); the bottom-right corner is { x: 1, y: 1 }. */
  edge: ResizeEdge;
  /** Widget type dragged from the tray (add only). */
  addType?: string;
  /** Size limits of the widget (add only: it has no card to look them up). */
  sizes?: WidgetSizes;
  widgetId: string;
  label: string;
  sourcePageId: string;
  origin: CellRect;
  /** Size of the widget on screen, for the floating copy. */
  box: { width: number; height: number };
  /**
   * Size of the widget on the grid of its page in px, measured once when it is picked up: on
   * another page it keeps about this size (REP-20261012-001). Absent: the box.
   */
  shown?: { width: number; height: number };
  /** Pointer position inside the widget when it was picked up. */
  offset: { x: number; y: number };
  /** Pointer position on screen when it was pressed: resizing counts from there. */
  start: { x: number; y: number };
  pointer: { x: number; y: number };
  target: DragTarget | null;
  /** Over the trash of the widget bar (moving only): released there, the widget is removed. */
  removing?: boolean;
  /** Lifted by a press of a second (not by a few pixels of a drag): the copy rises at once. */
  lifted?: boolean;
  /** Released: the copy flies to where it ends and the drop is committed after it. */
  flight?: DragFlight;
}

export interface DragStart {
  mode: DragMode;
  edge?: ResizeEdge;
  addType?: string;
  sizes?: WidgetSizes;
  widgetId: string;
  label: string;
  pageId: string;
  origin: CellRect;
  /** Screen box of the widget (getBoundingClientRect). */
  box: { left: number; top: number; width: number; height: number };
  clientX: number;
  clientY: number;
  pointerId: number;
  /**
   * Hold before the drag starts (REP-20261008-001): moving beyond the tolerance meanwhile
   * cancels it (the page scrolls). Without it the drag starts after a few pixels.
   */
  holdMs?: number;
  /** Already lifted (a long press out of edit mode): the drag starts at once. */
  lifted?: boolean;
}

export interface WidgetDragOptions {
  getGeometry: (pageId: string) => GridGeometry | null;
  getPlacements: (pageId: string) => Placements;
  sizesFor: (pageId: string, widgetId: string) => WidgetSizes | undefined;
  /** Screen box of the pager, to detect the edges. */
  getPagerBounds: () => { left: number; right: number } | null;
  /** Turns the page towards `direction`; returns the new page id or null when there is none. */
  onEdge: (direction: -1 | 1) => string | null;
  /** True when a page of widgets lies towards `direction` (the edge shows its hint). */
  hasPage?: (direction: -1 | 1) => boolean;
  /**
   * The drop is committed. `flying` is true when the copy still has to fly to its cell: the drop
   * is committed at the release and the widget must stay hidden in its cell until `onLanded`
   * (REP-20261023-006, K6b, choice of the user of 2026-10-25, «Sistema al rilascio»).
   */
  onDrop: (session: DragSession, flying?: boolean) => void;
  /**
   * The copy of a drop committed with `flying` has landed (or the flight was cut short): the
   * widget shows in its cell. Called once per such drop.
   */
  onLanded?: (session: DragSession) => void;
  onCancel?: (session: DragSession) => void;
  /**
   * Screen box of the trash of the widget bar while moving a widget (REP-20261008-001), null
   * when there is none; a release over it calls onRemove instead of onDrop.
   */
  getRemoveBounds?: () => { left: number; right: number; top: number; bottom: number } | null;
  onRemove?: (session: DragSession) => void;
  /** The drag has started: the widget is lifted (once per drag, never on a tap). */
  onActivate?: (session: DragSession) => void;
  /** Released before the drag started: a tap on the handle that was pressed. */
  onTap?: (start: DragStart, pointer: { x: number; y: number }) => void;
}

const CORNER: ResizeEdge = { x: 1, y: 1 };
/** Rest on a place before the others move aside, as Launcher3 (REORDER_TIMEOUT, 650 ms). */
const REFLOW_DELAY_MS = 650;
/** Share of a widget from each side that does not make a stack: the middle 50 % does. */
const STACK_EDGE = 0.25;
const DRAG_THRESHOLD_PX = 6;
/*
 * Turning the page while dragging (REP-20261007-030): the finger within 72 px of a side, or the
 * dragged copy sticking out of it by a third of its width, held for 450 ms.
 */
const EDGE_PX = 72;
const EDGE_OVERHANG = 1 / 3;
const EDGE_DELAY_MS = 450;

function computeTarget(
  session: Omit<DragSession, 'target'>,
  pageId: string,
  options: WidgetDragOptions
): DragTarget | null {
  const geometry = options.getGeometry(pageId);
  if (!geometry) return null;
  const { grid, cell, gapX, gapY } = geometry;
  // One step per axis: the gaps between columns and between rows differ.
  const pitchX = cell + gapX;
  const pitchY = cell + gapY;
  if (pitchX <= 0 || pitchY <= 0) return null;
  const placements = options.getPlacements(pageId);
  const sizes = session.sizes ?? options.sizesFor(pageId, session.widgetId);
  const minOf = (widgetId: string) => options.sizesFor(pageId, widgetId)?.min;

  if (session.mode === 'resize') {
    // The dragged side starts on its own grid line and moves with the pointer, wherever the
    // grip was taken (even outside the widget); the opposite side stays.
    const { origin, edge } = session;
    const line = {
      x:
        (edge.x === 1 ? origin.x + origin.w : origin.x) +
        (session.pointer.x - session.start.x) / pitchX,
      y:
        (edge.y === 1 ? origin.y + origin.h : origin.y) +
        (session.pointer.y - session.start.y) / pitchY,
    };
    const rect = resizeRect(origin, edge, line, grid, sizes);
    const preview = tryMoveWithReflow(placements, grid, session.widgetId, rect, minOf);
    return { pageId, rect, valid: preview !== null, preview };
  }

  // Over the middle of another widget of the same page: a stack (moving only), measured on
  // the widget's box in px, so the gaps do not shift its middle.
  if (session.mode === 'move' && pageId === session.sourcePageId) {
    const px = session.pointer.x - geometry.left;
    const py = session.pointer.y - geometry.top;
    for (const [id, rect] of Object.entries(placements)) {
      if (id === session.widgetId || session.widgetId.startsWith('stack_')) continue;
      const fx = (px - rect.x * pitchX) / (rect.w * cell + (rect.w - 1) * gapX);
      const fy = (py - rect.y * pitchY) / (rect.h * cell + (rect.h - 1) * gapY);
      if (fx > STACK_EDGE && fx < 1 - STACK_EDGE && fy > STACK_EDGE && fy < 1 - STACK_EDGE) {
        return { pageId, rect: { ...rect }, valid: true, preview: placements, stackOn: id };
      }
    }
  }

  // On another page the widget keeps about the size it shows, in the cells of that page
  // (REP-20261012-001): the cover's large cells and a page's small ones differ a lot.
  const otherPage = session.mode === 'move' && pageId !== session.sourcePageId;
  const size = clampSize(
    otherPage
      ? cellsForBox(session.shown ?? session.box, geometry)
      : { w: session.origin.w, h: session.origin.h },
    grid,
    sizes
  );
  // The copy keeps the size of the page it came from, so it snaps by its centre: from its
  // corner a small copy over larger cells would land one column off (REP-20261009-004). With a
  // copy as large as the target cells this equals snapping by the corner.
  const localX = session.pointer.x - session.offset.x - geometry.left;
  const localY = session.pointer.y - session.offset.y - geometry.top;
  const place = (candidate: CellSize, reflow: boolean) => {
    const centreX = localX + session.box.width / 2 - (candidate.w * pitchX - gapX) / 2;
    const centreY = localY + session.box.height / 2 - (candidate.h * pitchY - gapY) / 2;
    const x = Math.min(Math.max(0, Math.round(centreX / pitchX)), grid.w - candidate.w);
    const y = Math.min(Math.max(0, Math.round(centreY / pitchY)), grid.h - candidate.h);
    const rect = { x, y, w: candidate.w, h: candidate.h };
    const preview = reflow
      ? tryMoveWithReflow(placements, grid, session.widgetId, rect, minOf)
      : tryMove(placements, grid, session.widgetId, rect);
    return { rect, preview };
  };
  if (!otherPage) {
    const { rect, preview } = place(size, true);
    return { pageId, rect, valid: preview !== null, preview };
  }
  // On another page the widget shrinks before any other does, to the largest size that fits
  // where it is dropped, the others only moving aside (the cover has no continuation to make
  // room); only when no size fits do the others shrink too. A drop gives the same: the move
  // with a rectangle tries tryMove on it first.
  const candidates = shrinkCandidates(size, sizes?.min ?? { w: 1, h: 1 });
  const first = (reflow: boolean) => {
    for (const candidate of candidates) {
      const item = place(candidate, reflow);
      if (item.preview) return item;
    }
    return null;
  };
  const best = first(false) ?? first(true) ?? place(size, true);
  return { pageId, rect: best.rect, valid: best.preview !== null, preview: best.preview };
}

/** The pointer of a moved widget over the trash of the widget bar. */
function overRemove(session: Omit<DragSession, 'target'>, options: WidgetDragOptions) {
  if (session.mode !== 'move' || !options.onRemove) return false;
  const box = options.getRemoveBounds?.();
  if (!box) return false;
  const { x, y } = session.pointer;
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

/**
 * Where the copy of a released widget flies, or null when it does not (nothing animates, reduced
 * motion, a tray widget, a stack, a cell that is not on the screen): the drop is then committed at
 * once, as it always was. The cell is measured on the grid that rests under the finger, not from
 * the copy (the grids report where they rest, WidgetGrid), and the copy is scaled uniformly to its
 * size, so a cell of a page with other cells is reached without a jump at the landing.
 */
function planFlight(
  session: Omit<DragSession, 'target'>,
  removing: boolean,
  target: DragTarget | null,
  options: WidgetDragOptions
): DragFlight | null {
  if (!canAnimate() || prefersReducedMotion() || session.mode !== 'move') return null;
  if (removing) return { kind: 'remove', x: 0, y: 0, scale: 1 };
  if (target?.stackOn) return null;
  const toCell = (kind: 'land' | 'return', pageId: string, rect: CellRect): DragFlight | null => {
    const geometry = options.getGeometry(pageId);
    if (!geometry || session.box.width <= 0 || session.box.height <= 0) return null;
    const box = boxOfCells(rect, geometry);
    const centreX = geometry.left + rect.x * (geometry.cell + geometry.gapX) + box.width / 2;
    const centreY = geometry.top + rect.y * (geometry.cell + geometry.gapY) + box.height / 2;
    // A cell off the screen (another page than the one on view) is not flown to.
    const view = globalThis.window;
    if (
      !view ||
      centreX < 0 ||
      centreY < 0 ||
      centreX > view.innerWidth ||
      centreY > view.innerHeight
    ) {
      return null;
    }
    return {
      kind,
      x: centreX - session.box.width / 2,
      y: centreY - session.box.height / 2,
      scale: Math.min(box.width / session.box.width, box.height / session.box.height),
    };
  };
  return target?.valid
    ? toCell('land', target.pageId, target.rect)
    : toCell('return', session.sourcePageId, session.origin);
}

const rectKey = (target: DragTarget | null) =>
  target
    ? `${target.pageId}:${target.rect.x},${target.rect.y},${target.rect.w},${target.rect.h}:${target.stackOn ?? ''}`
    : '';

/** A short tick under the finger when the drop cell changes (Android; ignored elsewhere). */
function tick() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }
  } catch {
    // Vibration blocked by the browser: nothing to do.
  }
}

export function useWidgetDrag(options: WidgetDragOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [session, setSession] = useState<DragSession | null>(null);
  /** Side whose page is about to come (the edge shows a hint), 0 when none. */
  const [edgeSide, setEdgeSide] = useState<-1 | 0 | 1>(0);
  const sessionRef = useRef<DragSession | null>(null);
  const pendingRef = useRef<DragStart | null>(null);
  const [tracking, setTracking] = useState(false);
  /** Widget held before it lifts (the progressive cue), null when none. */
  const [pressing, setPressing] = useState<{ pageId: string; widgetId: string } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetPage = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  const endedAt = useRef(0);

  /*
   * Reflow after a rest (REP-20261007-032): a new place shows the dragged widget there with the
   * others still; after REFLOW_DELAY_MS on the same place they move aside.
   */
  const heldKey = useRef('');
  const reflowReady = useRef(false);
  const fullTarget = useRef<DragTarget | null>(null);
  const reflowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearReflow = useCallback(() => {
    if (reflowTimer.current) clearTimeout(reflowTimer.current);
    reflowTimer.current = null;
    heldKey.current = '';
    reflowReady.current = false;
    fullTarget.current = null;
  }, []);

  const update = useCallback((next: DragSession | null) => {
    const before = sessionRef.current;
    if (before && next?.target?.valid && rectKey(next.target) !== rectKey(before.target)) tick();
    sessionRef.current = next;
    setSession(next);
  }, []);

  /** The target as shown while dragging: the full reflow only after a rest on the place. */
  const hold = useCallback(
    (target: DragTarget | null, widgetId: string): DragTarget | null => {
      fullTarget.current = target;
      if (!target) {
        if (reflowTimer.current) clearTimeout(reflowTimer.current);
        reflowTimer.current = null;
        heldKey.current = '';
        reflowReady.current = false;
        return null;
      }
      const key = rectKey(target);
      if (key !== heldKey.current) {
        heldKey.current = key;
        reflowReady.current = false;
        if (reflowTimer.current) clearTimeout(reflowTimer.current);
        reflowTimer.current = setTimeout(() => {
          reflowTimer.current = null;
          reflowReady.current = true;
          const now = sessionRef.current;
          if (now?.target && rectKey(now.target) === heldKey.current && fullTarget.current) {
            update({ ...now, target: fullTarget.current });
          }
        }, REFLOW_DELAY_MS);
      }
      if (reflowReady.current || !target.valid || target.stackOn) return target;
      const still = optionsRef.current.getPlacements(target.pageId);
      return { ...target, waiting: true, preview: { ...still, [widgetId]: target.rect } };
    },
    [update]
  );

  const clearEdge = useCallback(() => {
    if (edgeTimer.current) clearTimeout(edgeTimer.current);
    edgeTimer.current = null;
    setEdgeSide(0);
  }, []);

  /** The pointer is let go: nothing tracks it, timers and frames are cancelled; the session stays. */
  const release = useCallback(() => {
    clearEdge();
    clearReflow();
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setPressing(null);
    targetPage.current = null;
    pendingRef.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setTracking(false);
  }, [clearEdge, clearReflow]);

  /** What the end of the flight does (flightEnded): the commit of a refused drop or of a removal,
   * or the landing of a drop already committed. */
  const landing = useRef<(() => void) | null>(null);
  /** The second beat of a landing (flightEnded): cancels the frames that wait for it. */
  const finishing = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    finishing.current?.();
    finishing.current = null;
    release();
    // A drop already released and still in flight is committed now, without the flight: the
    // person has decided, and the end of edit mode or the unmount must not lose it.
    const settle = landing.current;
    landing.current = null;
    settle?.();
    update(null);
  }, [release, update]);

  const activate = useCallback(
    (start: DragStart, pointer: { x: number; y: number }, lifted = false) => {
      const base: Omit<DragSession, 'target'> = {
        mode: start.mode,
        edge: start.edge ?? CORNER,
        addType: start.addType,
        sizes: start.sizes,
        widgetId: start.widgetId,
        label: start.label,
        sourcePageId: start.pageId,
        origin: start.origin,
        box: { width: start.box.width, height: start.box.height },
        offset: { x: start.clientX - start.box.left, y: start.clientY - start.box.top },
        start: { x: start.clientX, y: start.clientY },
        pointer,
        lifted: lifted || undefined,
      };
      targetPage.current = start.pageId;
      // The grid of its page, measured now that the page rests (not while another scrolls in).
      const own = start.mode === 'move' ? optionsRef.current.getGeometry(start.pageId) : null;
      if (own) base.shown = boxOfCells(start.origin, own);
      const session = {
        ...base,
        target: hold(computeTarget(base, start.pageId, optionsRef.current), base.widgetId),
      };
      update(session);
      optionsRef.current.onActivate?.(session);
    },
    [hold, update]
  );

  /**
   * Starts tracking a press. The drag begins after a few pixels of movement (a tap does not),
   * after holdMs without moving, or at once when the widget is already lifted.
   */
  const begin = useCallback(
    (start: DragStart) => {
      // The copy of the last drop is still flying: its drop is not over.
      if (sessionRef.current?.flight) return;
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = null;
      pendingRef.current = start;
      setTracking(true);
      const at = { x: start.clientX, y: start.clientY };
      if (start.lifted) {
        activate(start, at, true);
        return;
      }
      if (!start.holdMs) return;
      setPressing({ pageId: start.pageId, widgetId: start.widgetId });
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        setPressing(null);
        if (pendingRef.current !== start || sessionRef.current) return;
        // Lifted where it is: the copy appears on the widget, then follows the finger.
        vibrate(10);
        activate(start, at, true);
      }, start.holdMs);
    },
    [activate]
  );

  const handleEdge = useCallback(
    (pointerX: number) => {
      const current = sessionRef.current;
      const bounds = optionsRef.current.getPagerBounds();
      if (!current || current.mode === 'resize' || !bounds) {
        clearEdge();
        return;
      }
      // The finger near a side, or the copy of the widget sticking out of it.
      const left = pointerX - current.offset.x;
      const right = left + current.box.width;
      const overhang = current.box.width * EDGE_OVERHANG;
      const towards: -1 | 0 | 1 =
        pointerX < bounds.left + EDGE_PX || left < bounds.left - overhang
          ? -1
          : pointerX > bounds.right - EDGE_PX || right > bounds.right + overhang
            ? 1
            : 0;
      const direction: -1 | 0 | 1 =
        towards !== 0 && (optionsRef.current.hasPage?.(towards) ?? true) ? towards : 0;
      if (direction === 0) {
        clearEdge();
        return;
      }
      if (edgeTimer.current) return;
      setEdgeSide(direction);
      edgeTimer.current = setTimeout(() => {
        edgeTimer.current = null;
        setEdgeSide(0);
        const pageId = optionsRef.current.onEdge(direction);
        const latest = sessionRef.current;
        if (!pageId || !latest) return;
        targetPage.current = pageId;
        // The grids report where they will rest (WidgetGrid), so the new page is a target at
        // once, even while it still scrolls into view; a release now drops there. Moving the
        // pointer again on the edge turns one more page.
        update({
          ...latest,
          target: hold(computeTarget(latest, pageId, optionsRef.current), latest.widgetId),
        });
      }, EDGE_DELAY_MS);
    },
    [clearEdge, hold, update]
  );

  useEffect(() => {
    if (!tracking) return undefined;

    const onMove = (event: PointerEvent) => {
      const pending = pendingRef.current;
      const pointer = { x: event.clientX, y: event.clientY };
      if (pending && !sessionRef.current) {
        if (event.pointerId !== pending.pointerId) return;
        const moved = Math.hypot(pointer.x - pending.clientX, pointer.y - pending.clientY);
        // Still holding: a swipe gives up the press, the page scrolls.
        if (holdTimer.current) {
          if (moved > HOLD_TOLERANCE_PX) stop();
          return;
        }
        if (moved < DRAG_THRESHOLD_PX) return;
        // A touch across the tray scrolls its row; adding starts in the vertical direction.
        if (
          pending.mode === 'add' &&
          event.pointerType === 'touch' &&
          Math.abs(pointer.x - pending.clientX) > Math.abs(pointer.y - pending.clientY)
        ) {
          stop();
          return;
        }
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
        if (overRemove(moved, optionsRef.current)) {
          clearEdge();
          if (!latest.removing) tick();
          update({ ...moved, removing: true, target: null });
          return;
        }
        update({
          ...moved,
          removing: false,
          target: hold(computeTarget(moved, pageId, optionsRef.current), moved.widgetId),
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
        const removing = overRemove(final, optionsRef.current);
        const target = removing ? null : computeTarget(final, pageId, optionsRef.current);
        const settle = removing
          ? () => optionsRef.current.onRemove?.({ ...final, removing: true, target: null })
          : () => optionsRef.current.onDrop({ ...final, target });
        // The copy flies on to where it ends. A drop into a cell is committed now, before the
        // flight, with the widget hidden in its cell until the copy has landed: the commit at the
        // landing was a task of 156-169 ms on the frame the copy arrives (tracing of 2026-10-24).
        // The others (back to the cell it left, over the trash) are committed when they have
        // landed. Where it does not fly the drop is committed now (REP-20261023-006, D-M8, D-M10,
        // K6b).
        const flight = planFlight(final, removing, target, optionsRef.current);
        if (flight) {
          release();
          const early = flight.kind === 'land';
          const flying: DragSession = {
            ...final,
            removing,
            // The grid shows the places as they will be; a refused drop shows no target.
            target: flight.kind === 'land' ? target : null,
            flight,
          };
          landing.current = early ? () => optionsRef.current.onLanded?.(flying) : settle;
          update(flying);
          if (early) optionsRef.current.onDrop({ ...final, target }, true);
          return;
        }
        settle();
      } else if (pending) {
        optionsRef.current.onTap?.(pending, { x: event.clientX, y: event.clientY });
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

    // Once lifted the finger drags the widget, not the page: Chrome on Android would otherwise
    // start scrolling and cancel the pointer.
    const onTouchMove = (event: TouchEvent) => {
      if (sessionRef.current && event.cancelable) event.preventDefault();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [tracking, activate, handleEdge, clearEdge, hold, stop, update, release]);

  useEffect(() => stop, [stop]);

  /** True right after a drop: the click that follows the release must not act. */
  const justDropped = useCallback(() => Date.now() - endedAt.current < 400, []);

  /**
   * The copy has flown to where it ends. A drop into a cell was committed at the release: the
   * widget shows in its cell (`onLanded`) and the copy goes. The others are committed now, with the
   * copy going in the same render.
   */
  const flightEnded = useCallback(() => {
    const settle = landing.current;
    if (!settle) return;
    landing.current = null;
    if (sessionRef.current?.flight?.kind !== 'land') {
      settle();
      stop();
      return;
    }
    // A landing in two beats (REP-20261023-006, D-M8 card 4b; tracing of 2026-10-25, W2): first
    // only the swap, the widget shows where the copy is taken away (the copy hides in the same
    // handler, DragGhost), a small render of one grid; the end of the session, which takes the
    // drag style off three grids, the bar and the pager indicator and unmounts the copy, comes in
    // a task of its own after the next frames. One commit of 112-139 ms stopped the screen for
    // about 150 ms on the frame the copy arrived.
    flushSync(settle);
    finishing.current = afterNextFrame(() => {
      finishing.current = null;
      stop();
    });
  }, [stop]);

  return { session, edgeSide, pressing, begin, cancel: stop, justDropped, flightEnded };
}
