/**
 * Manual layout editing by dragging (REP-20261007-027): resize from every side and corner,
 * the reflow that makes room, and the drop of a new widget from the tray.
 */
import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LauncherLayout } from '@/@types/launcher';
import { NEW_WIDGET_ID, useWidgetDrag, type DragSession } from '@/hooks/launcher/useWidgetDrag';
import { LONG_PRESS_MS } from '@/hooks/launcher/gestures';
import { usePageDrag } from '@/hooks/launcher/usePageDrag';
import { COVER_COLUMNS, DEFAULT_GRIDS, columnsKey } from '@/utils/launcher/deviceClass';
import {
  boxOfCells,
  cellsForBox,
  resizeRect,
  resizedIds,
  tryMove,
  tryMoveWithReflow,
  type Placements,
} from '@/utils/launcher/grid';
import {
  COVER_PAGE_ID,
  ensureDeviceClass,
  movePageOrder,
  moveWidgetInLayout,
  moveWidgetToPageInLayout,
  pageClass,
  sizeAcrossKeys,
  withCoverPage,
} from '@/utils/launcher/layout';
import { pagerEntries } from '@/utils/launcher/pager';

const grid = { w: 4, h: 2 };
const free = { min: { w: 1, h: 1 }, max: { w: 4, h: 2 }, default: { w: 1, h: 1 } };

describe('resizeRect: every side and corner', () => {
  const origin = { x: 1, y: 0, w: 2, h: 1 };

  it('the bottom-right corner moves the right and bottom sides, the top-left stays', () => {
    expect(resizeRect(origin, { x: 1, y: 1 }, { x: 4, y: 2 }, grid, free)).toEqual({
      x: 1,
      y: 0,
      w: 3,
      h: 2,
    });
  });

  it('the left side moves left, the right side stays', () => {
    expect(resizeRect(origin, { x: -1, y: 0 }, { x: 0, y: 0 }, grid, free)).toEqual({
      x: 0,
      y: 0,
      w: 3,
      h: 1,
    });
  });

  it('the top side of a widget in row 2 grows upwards', () => {
    const low = { x: 0, y: 1, w: 1, h: 1 };
    expect(resizeRect(low, { x: 0, y: -1 }, { x: 0, y: 0 }, grid, free)).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 2,
    });
  });

  it('keeps the minimum and maximum of the widget, and the grid', () => {
    const sizes = { min: { w: 2, h: 1 }, max: { w: 3, h: 2 }, default: { w: 2, h: 1 } };
    // Dragging the left side past the right one stops at the minimum width.
    expect(resizeRect(origin, { x: -1, y: 0 }, { x: 4, y: 0 }, grid, sizes)).toEqual({
      x: 1,
      y: 0,
      w: 2,
      h: 1,
    });
    // Dragging the right side far out stops at the maximum and at the grid edge.
    expect(resizeRect(origin, { x: 1, y: 0 }, { x: 9, y: 0 }, grid, sizes)).toEqual({
      x: 1,
      y: 0,
      w: 3,
      h: 1,
    });
    // An untouched axis keeps its size.
    expect(resizeRect(origin, { x: 1, y: 0 }, { x: 3, y: 9 }, grid, sizes).h).toBe(1);
  });
});

describe('tryMoveWithReflow: the page makes room', () => {
  // A full 4 × 2 page: a and b on top, c and d below, each 2 × 1.
  const full: Placements = {
    a: { x: 0, y: 0, w: 2, h: 1 },
    b: { x: 2, y: 0, w: 2, h: 1 },
    c: { x: 0, y: 1, w: 2, h: 1 },
    d: { x: 2, y: 1, w: 2, h: 1 },
  };

  it('keeps the gentle push of tryMove when it is enough', () => {
    const roomy: Placements = { a: { x: 0, y: 0, w: 1, h: 1 }, b: { x: 1, y: 0, w: 1, h: 1 } };
    const target = { x: 1, y: 0, w: 1, h: 1 };
    expect(tryMoveWithReflow(roomy, grid, 'a', target)).toEqual(tryMove(roomy, grid, 'a', target));
  });

  it('shrinks the widgets in the way down to their minimum when they find no room', () => {
    // a grows to 3 wide: b has no 2-wide room left, it shrinks to 1 × 1.
    const target = { x: 0, y: 0, w: 3, h: 1 };
    expect(tryMove(full, grid, 'a', target)).toBeNull();
    const next = tryMoveWithReflow(full, grid, 'a', target, () => ({ w: 1, h: 1 }));
    expect(next).not.toBeNull();
    expect(next?.a).toEqual(target);
    expect(next?.b).toEqual({ x: 3, y: 0, w: 1, h: 1 });
    expect(resizedIds(full, next!, 'a')).toEqual(['b']);
  });

  it('refuses, as before, when even the minimum sizes leave a widget out', () => {
    const target = { x: 0, y: 0, w: 4, h: 2 };
    expect(tryMoveWithReflow(full, grid, 'a', target, () => ({ w: 1, h: 1 }))).toBeNull();
  });

  it('without minimum sizes nobody shrinks', () => {
    expect(tryMoveWithReflow(full, grid, 'a', { x: 0, y: 0, w: 3, h: 1 })).toBeNull();
  });

  it('the saved layout matches the preview, with the minimum sizes of the definitions', () => {
    const layout: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: {
            phone: {
              a: { x: 0, y: 0, w: 3, h: 1 },
              b: { x: 3, y: 0, w: 3, h: 1 },
              c: { x: 0, y: 1, w: 6, h: 1 },
            },
          },
        },
      ],
    };
    // A 6×2 grid of its own class (a landscape phone now shows 8×2, REP-20261008-001).
    const ctx = {
      deviceClass: 'phone' as const,
      grids: { ...DEFAULT_GRIDS, phone: { w: 6, h: 2 } },
      sizesOf: () => free,
    };
    const next = moveWidgetInLayout(layout, ctx, 'home', 'a', { x: 0, y: 0, w: 4, h: 1 });
    const placements = next?.pages[0].placements.phone;
    expect(placements?.a).toEqual({ x: 0, y: 0, w: 4, h: 1 });
    expect(placements?.b).toEqual({ x: 4, y: 0, w: 2, h: 1 });
    expect(placements?.c).toEqual({ x: 0, y: 1, w: 6, h: 1 });
  });
});

describe('useWidgetDrag: drops of every kind', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // 4 × 2 cells of 100 px, no gap, at the origin of the screen.
  const setup = (placements: Placements) => {
    const onDrop = vi.fn<(session: DragSession) => void>();
    const hook = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => ({ left: 0, top: 0, cell: 100, gapX: 0, gapY: 0, grid }),
        getPlacements: () => placements,
        sizesFor: () => free,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
      })
    );
    const move = (x: number, y: number) => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
      act(() => vi.advanceTimersByTime(20));
    };
    return { ...hook, onDrop, move };
  };

  it('moves a widget with a complete pointer drag and hands the drop its new cell', () => {
    const { result, onDrop, move } = setup({ a: { x: 0, y: 0, w: 1, h: 1 } });
    act(() =>
      result.current.begin({
        mode: 'move',
        widgetId: 'a',
        label: 'Luce',
        pageId: 'home',
        origin: { x: 0, y: 0, w: 1, h: 1 },
        box: { left: 0, top: 0, width: 100, height: 100 },
        clientX: 50,
        clientY: 50,
        pointerId: 1,
      })
    );
    move(60, 50);
    move(250, 150);
    expect(result.current.session?.target?.rect).toEqual({ x: 2, y: 1, w: 1, h: 1 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onDrop.mock.calls[0][0].target).toMatchObject({
      valid: true,
      rect: { x: 2, y: 1, w: 1, h: 1 },
    });
  });

  it('snaps a copy smaller than the cells by its centre, not by its corner (REP-20261009-004)', () => {
    // The copy of a widget of a page with small cells held over a cover of 3 cells of 400 px.
    const onDrop = vi.fn<(session: DragSession) => void>();
    const { result } = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => ({
          left: 0,
          top: 0,
          cell: 400,
          gapX: 0,
          gapY: 0,
          grid: { w: 3, h: 1 },
        }),
        getPlacements: () => ({ a: { x: 1, y: 0, w: 1, h: 1 } }),
        sizesFor: () => free,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
      })
    );
    act(() =>
      result.current.begin({
        mode: 'move',
        widgetId: 'b',
        label: 'Orologio',
        pageId: 'home',
        origin: { x: 0, y: 0, w: 1, h: 1 },
        // 107 px copy held by its middle.
        box: { left: 0, top: 0, width: 107, height: 107 },
        clientX: 53.5,
        clientY: 53.5,
        pointerId: 1,
        lifted: true,
      })
    );
    // Finger at 0.9 of the first cell: the copy's corner is at 306 px, its centre at 360 px.
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 360, clientY: 200 });
    act(() => vi.advanceTimersByTime(20));
    expect(result.current.session?.target?.rect).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    // At the middle of the third cell it lands there.
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 1010, clientY: 200 });
    act(() => vi.advanceTimersByTime(20));
    expect(result.current.session?.target?.rect).toEqual({ x: 2, y: 0, w: 1, h: 1 });
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });

  describe('on another page (REP-20261012-001)', () => {
    // A tablet: Principale with cells of 112 px, the cover with three cells of 320 px in a row.
    const geometry = {
      home: { left: 0, top: 0, cell: 112, gapX: 10, gapY: 48, grid: { w: 8, h: 2 } },
      cover: { left: 0, top: 0, cell: 320, gapX: 10, gapY: 0, grid: { w: 3, h: 1 } },
    };
    const sizes = { min: { w: 1, h: 1 }, max: { w: 6, h: 3 }, default: { w: 2, h: 2 } };
    /** Starts on `from`, turns the page at an edge, then rests the pointer at (x, y). */
    const dragAcross = (
      placements: Record<string, Placements>,
      from: 'home' | 'cover',
      widgetId: string,
      origin: { x: number; y: number; w: number; h: number },
      box: { width: number; height: number },
      to: { x: number; y: number }
    ) => {
      let page = from;
      const hook = renderHook(() =>
        useWidgetDrag({
          getGeometry: (id) => geometry[id as 'home' | 'cover'],
          getPlacements: (id) => placements[id],
          sizesFor: () => sizes,
          getPagerBounds: () => ({ left: 0, right: 1000 }),
          onEdge: () => (page === from ? (page = from === 'home' ? 'cover' : 'home') : null),
          onDrop: vi.fn(),
        })
      );
      const startX = box.width / 2;
      const startY = box.height / 2;
      act(() =>
        hook.result.current.begin({
          mode: 'move',
          widgetId,
          label: 'Orologio',
          pageId: from,
          origin,
          box: { left: 0, top: 0, ...box },
          clientX: startX,
          clientY: startY,
          pointerId: 1,
          lifted: true,
        })
      );
      // Held on an edge: the page turns.
      fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: from === 'home' ? 20 : 980,
        clientY: startY,
      });
      act(() => vi.advanceTimersByTime(20));
      act(() => vi.advanceTimersByTime(500));
      fireEvent.pointerMove(window, { pointerId: 1, clientX: to.x, clientY: to.y });
      act(() => vi.advanceTimersByTime(20));
      const target = hook.result.current.session?.target;
      fireEvent.pointerCancel(window, { pointerId: 1 });
      return target;
    };

    it('the clock enlarged on Principale goes back to the free cover cell, not the whole row', () => {
      const target = dragAcross(
        {
          home: { clock: { x: 0, y: 0, w: 3, h: 2 } },
          cover: { date: { x: 1, y: 0, w: 1, h: 1 }, weather: { x: 2, y: 0, w: 1, h: 1 } },
        },
        'home',
        'clock',
        { x: 0, y: 0, w: 3, h: 2 },
        { width: 356, height: 272 },
        { x: 178, y: 136 }
      );
      expect(target).toMatchObject({
        pageId: 'cover',
        rect: { x: 0, y: 0, w: 1, h: 1 },
        valid: true,
      });
    });

    it('a widget too large for the free place shrinks to it, down to one cell', () => {
      // 6 × 2 on Principale is about 2 × 1 on the cover; only the first cell is free.
      const target = dragAcross(
        {
          home: { big: { x: 0, y: 0, w: 6, h: 2 } },
          cover: { date: { x: 1, y: 0, w: 1, h: 1 }, weather: { x: 2, y: 0, w: 1, h: 1 } },
        },
        'home',
        'big',
        { x: 0, y: 0, w: 6, h: 2 },
        { width: 722, height: 272 },
        // The middle of the copy over the free first cell.
        { x: 160, y: 136 }
      );
      expect(target).toMatchObject({
        pageId: 'cover',
        rect: { x: 0, y: 0, w: 1, h: 1 },
        valid: true,
      });
    });

    it('the clock of the cover arrives about as large as it was, and shrinks itself before the others', () => {
      // On Principale a, b and c fill the columns 0-5: the 3 × 2 clock shrinks to the free 2 × 2.
      const placements = {
        home: {
          a: { x: 0, y: 0, w: 2, h: 2 },
          b: { x: 2, y: 0, w: 2, h: 2 },
          c: { x: 4, y: 0, w: 2, h: 2 },
        },
        cover: { clock: { x: 0, y: 0, w: 1, h: 1 } },
      };
      const target = dragAcross(
        placements,
        'cover',
        'clock',
        { x: 0, y: 0, w: 1, h: 1 },
        { width: 320, height: 320 },
        { x: 849, y: 136 }
      );
      expect(target).toMatchObject({
        pageId: 'home',
        rect: { x: 6, y: 0, w: 2, h: 2 },
        valid: true,
      });
      expect(target?.preview?.c).toEqual({ x: 4, y: 0, w: 2, h: 2 });
      // On an empty Principale it keeps about its size: 3 × 2 of the small cells.
      const wide = dragAcross(
        { home: {}, cover: { clock: { x: 0, y: 0, w: 1, h: 1 } } },
        'cover',
        'clock',
        { x: 0, y: 0, w: 1, h: 1 },
        { width: 320, height: 320 },
        { x: 300, y: 136 }
      );
      expect(wide?.rect).toMatchObject({ w: 3, h: 2 });
    });
  });

  it('resizes from the left side: the right side stays and the others make room', () => {
    const { result, onDrop, move } = setup({
      a: { x: 0, y: 0, w: 1, h: 1 },
      b: { x: 2, y: 0, w: 2, h: 1 },
    });
    act(() =>
      result.current.begin({
        mode: 'resize',
        edge: { x: -1, y: 0 },
        widgetId: 'b',
        label: 'Clima',
        pageId: 'home',
        origin: { x: 2, y: 0, w: 2, h: 1 },
        box: { left: 200, top: 0, width: 200, height: 100 },
        clientX: 200,
        clientY: 50,
        pointerId: 1,
      })
    );
    move(190, 50);
    move(10, 50);
    const waiting = result.current.session?.target;
    expect(waiting?.rect).toEqual({ x: 0, y: 0, w: 4, h: 1 });
    // Not rested yet (REP-20261007-032): a still in its cell.
    expect(waiting?.waiting).toBe(true);
    expect(waiting?.preview?.a).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    // After 650 ms on the same place a is pushed below, to the nearest free cell.
    act(() => vi.advanceTimersByTime(660));
    const target = result.current.session?.target;
    expect(target?.waiting).toBeUndefined();
    expect(target?.preview?.a).toEqual({ x: 0, y: 1, w: 1, h: 1 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 50 });
    expect(onDrop.mock.calls[0][0]).toMatchObject({
      mode: 'resize',
      target: { valid: true, rect: { x: 0, y: 0, w: 4, h: 1 } },
    });
  });

  it('drags a new widget from the tray at its size, with a tick when the cell changes', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      const { result, onDrop, move } = setup({ a: { x: 0, y: 0, w: 1, h: 1 } });
      act(() =>
        result.current.begin({
          mode: 'add',
          addType: 'light',
          sizes: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
          widgetId: NEW_WIDGET_ID,
          label: 'Luci',
          pageId: 'home',
          origin: { x: 0, y: 0, w: 2, h: 1 },
          box: { left: 0, top: 500, width: 200, height: 100 },
          clientX: 100,
          clientY: 550,
          pointerId: 1,
        })
      );
      move(100, 530);
      move(300, 150);
      expect(result.current.session?.target?.rect).toEqual({ x: 2, y: 1, w: 2, h: 1 });
      expect(vibrate).toHaveBeenCalled();
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 150 });
      expect(onDrop.mock.calls[0][0]).toMatchObject({
        mode: 'add',
        addType: 'light',
        target: { valid: true, rect: { x: 2, y: 1, w: 2, h: 1 } },
      });
    } finally {
      Reflect.deleteProperty(navigator, 'vibrate');
    }
  });

  it('a horizontal touch scrolls the tray without a drop, while a vertical touch adds', () => {
    const { result, onDrop } = setup({});
    const begin = () =>
      act(() =>
        result.current.begin({
          mode: 'add',
          addType: 'light',
          widgetId: NEW_WIDGET_ID,
          label: 'Luce',
          pageId: 'home',
          origin: { x: 0, y: 0, w: 1, h: 1 },
          box: { left: 0, top: 500, width: 100, height: 100 },
          clientX: 50,
          clientY: 550,
          pointerId: 1,
        })
      );
    const moveTouch = (x: number, y: number) => {
      const event = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: x,
        clientY: y,
        bubbles: true,
      });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      fireEvent(window, event);
      act(() => vi.advanceTimersByTime(20));
    };
    begin();
    moveTouch(90, 550);
    expect(result.current.session).toBeNull();
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 90, clientY: 550 });
    expect(onDrop).not.toHaveBeenCalled();
    begin();
    moveTouch(50, 530);
    expect(result.current.session?.mode).toBe('add');
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 50, clientY: 530 });
    expect(onDrop).toHaveBeenCalledOnce();
  });
});

describe('the layout keeps the column of a widget that comes back to the cover (REP-20261009-004)', () => {
  const ctx = { deviceClass: 'phoneLandscape' as const, grids: DEFAULT_GRIDS, sizesOf: () => free };
  const home: LauncherLayout = {
    version: 1,
    cover: { enabled: true },
    pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: { phoneLandscape: {} } }],
  };

  const columnOf = (layout: LauncherLayout, id: string) => {
    const cover = layout.pages.find((page) => page.id === COVER_PAGE_ID)!;
    return cover.placements[pageClass(layout, cover, ctx)]?.[id]?.x;
  };

  it('the clock out to a page and back to the first column takes its place', () => {
    const start = ensureDeviceClass(withCoverPage(home, DEFAULT_GRIDS), ctx);
    expect(columnOf(start, 'cover_clock')).toBe(0);
    const out = moveWidgetToPageInLayout(start, ctx, COVER_PAGE_ID, 'home', 'cover_clock')!;
    const back = moveWidgetToPageInLayout(out, ctx, 'home', COVER_PAGE_ID, 'cover_clock', {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    })!;
    expect(columnOf(back, 'cover_clock')).toBe(0);
    // The calendar made room instead of the clock going to the second column.
    expect(columnOf(back, 'cover_calendar')).toBe(1);
  });

  it('a cover saved without columns gets its three and takes the widget back the same way', () => {
    const old: LauncherLayout = {
      ...home,
      pages: [
        ...home.pages,
        {
          id: COVER_PAGE_ID,
          label: 'Copertina',
          kind: 'cover',
          placements: {
            phoneLandscape: {
              cover_clock: { x: 0, y: 0, w: 1, h: 1 },
              cover_calendar: { x: 1, y: 0, w: 1, h: 1 },
            },
          },
        },
      ],
    };
    const start = ensureDeviceClass(old, ctx);
    const out = moveWidgetToPageInLayout(start, ctx, COVER_PAGE_ID, 'home', 'cover_clock')!;
    const back = moveWidgetToPageInLayout(out, ctx, 'home', COVER_PAGE_ID, 'cover_clock', {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    })!;
    expect(columnOf(back, 'cover_clock')).toBe(0);
    expect(columnOf(back, 'cover_calendar')).toBe(1);
  });
});

describe('a widget moved to a page with other cells keeps about its size (REP-20261012-001)', () => {
  const clockSizes = { min: { w: 1, h: 1 }, max: { w: 3, h: 3 }, default: { w: 2, h: 2 } };
  const ctx = { deviceClass: 'tablet' as const, grids: DEFAULT_GRIDS, sizesOf: () => clockSizes };
  const home: LauncherLayout = {
    version: 1,
    cover: { enabled: true },
    pages: [{ id: 'home', label: 'Principale', kind: 'widgets', placements: { tablet: {} } }],
  };
  const rectOn = (layout: LauncherLayout, pageId: string, id: string) => {
    const page = layout.pages.find((item) => item.id === pageId)!;
    return page.placements[pageClass(layout, page, ctx)]?.[id];
  };

  it('converts cells through their size on the screen', () => {
    expect(cellsForBox({ width: 320, height: 320 }, { cell: 112, gapX: 10, gapY: 48 })).toEqual({
      w: 3,
      h: 2,
    });
    expect(
      cellsForBox(boxOfCells({ w: 3, h: 2 }, { cell: 112, gapX: 10, gapY: 48 }), {
        cell: 320,
        gapX: 10,
        gapY: 0,
      })
    ).toEqual({ w: 1, h: 1 });
    expect(sizeAcrossKeys({ w: 2, h: 1 }, DEFAULT_GRIDS, 'tablet', 'tablet')).toEqual({
      w: 2,
      h: 1,
    });
    // On the reference area of the tablet: the cover's three columns and a page's small cells.
    const cover = columnsKey('tablet', COVER_COLUMNS, DEFAULT_GRIDS);
    const one = sizeAcrossKeys({ w: 1, h: 1 }, DEFAULT_GRIDS, cover, 'tablet');
    expect(one.w * one.h).toBeGreaterThan(1);
    expect(sizeAcrossKeys(one, DEFAULT_GRIDS, 'tablet', cover)).toEqual({ w: 1, h: 1 });
  });

  it('from the menu the size measured on screen wins over the reference area', () => {
    const start = ensureDeviceClass(withCoverPage(home, DEFAULT_GRIDS), ctx);
    const out = moveWidgetToPageInLayout(
      start,
      ctx,
      COVER_PAGE_ID,
      'home',
      'cover_clock',
      undefined,
      { w: 3, h: 2 }
    )!;
    expect(rectOn(out, 'home', 'cover_clock')).toMatchObject({ w: 3, h: 2 });
  });

  it('the clock of the cover is not 1 × 1 on Principale, and goes back to the free cell', () => {
    const start = ensureDeviceClass(withCoverPage(home, DEFAULT_GRIDS), ctx);
    const coverRect = rectOn(start, COVER_PAGE_ID, 'cover_clock')!;
    const out = moveWidgetToPageInLayout(start, ctx, COVER_PAGE_ID, 'home', 'cover_clock')!;
    const onHome = rectOn(out, 'home', 'cover_clock')!;
    // The cells of the cover are larger: the clock takes more of the smaller ones.
    expect(onHome.w * onHome.h).toBeGreaterThan(coverRect.w * coverRect.h);
    const enlarged = moveWidgetInLayout(out, ctx, 'home', 'cover_clock', {
      ...onHome,
      w: 3,
      h: 2,
    })!;
    const back = moveWidgetToPageInLayout(enlarged, ctx, 'home', COVER_PAGE_ID, 'cover_clock')!;
    expect(back).not.toBeNull();
    expect(rectOn(back, COVER_PAGE_ID, 'cover_clock')).toEqual(coverRect);
  });
});

describe('page overview: order of the pages (REP-20261007-028)', () => {
  const pages: LauncherLayout['pages'] = [
    { id: 'home', label: 'Casa', kind: 'widgets', placements: {} },
    { id: 'a', label: 'A', kind: 'widgets', placements: {} },
    { id: 'a2', label: 'A', kind: 'widgets', continuationOf: 'a', placements: {} },
    { id: 'b', label: 'B', kind: 'widgets', placements: {} },
  ];

  it('moves a page to a new place', () => {
    expect(movePageOrder(pages, ['home', 'a', 'a2', 'b'], 'b', 0)).toEqual([
      'b',
      'home',
      'a',
      'a2',
    ]);
  });

  it('moves a page with its continuation, wherever the drop lands', () => {
    expect(movePageOrder(pages, ['home', 'a', 'a2', 'b'], 'a', 3)).toEqual([
      'home',
      'b',
      'a',
      'a2',
    ]);
    // Dragging the continuation moves the whole family too.
    expect(movePageOrder(pages, ['home', 'a', 'a2', 'b'], 'a2', 0)).toEqual([
      'a',
      'a2',
      'home',
      'b',
    ]);
  });

  it('keeps an empty page made by the user in the pager, not an empty continuation', () => {
    const layout: LauncherLayout = { version: 1, cover: { enabled: false }, pages };
    expect(pagerEntries(layout, 'tablet', false).map((entry) => entry.key)).toEqual([
      'home',
      'a',
      'b',
    ]);
  });
});

describe('usePageDrag: a card held for a second follows the pointer and lands where it is dropped', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function renderDrag(options: Partial<Parameters<typeof usePageDrag>[0]> = {}) {
    const onDrop = vi.fn();
    const hook = renderHook(() =>
      usePageDrag({
        count: 4,
        minIndex: 1,
        getPitch: () => 300,
        getScroll: () => 0,
        scrollBy: () => undefined,
        getBounds: () => ({ left: -1000, right: 3000 }),
        onDrop,
        ...options,
      })
    );
    return { ...hook, onDrop };
  }

  it('lifts after a second, reports the place under the pointer and drops there, never before the cover', () => {
    const onLift = vi.fn();
    const { result, onDrop } = renderDrag({ onLift });
    act(() => result.current.begin(3, 1, 900, 50));
    expect(result.current.pressing).toBe(3);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 10);
    });
    expect(result.current.state).toBeNull();
    act(() => {
      vi.advanceTimersByTime(20);
    });
    // Lifted in place: the card rises where it is, then follows the pointer.
    expect(result.current.state).toEqual({ from: 3, to: 3, offset: 0 });
    expect(result.current.pressing).toBeNull();
    expect(onLift).toHaveBeenCalledWith(3);
    act(() => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 880 });
    });
    act(() => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 280 });
    });
    expect(result.current.state).toEqual({ from: 3, to: 1, offset: -620 });
    act(() => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: -500 });
    });
    expect(result.current.state?.to).toBe(1);
    act(() => {
      fireEvent.pointerUp(window, { pointerId: 1, clientX: -500 });
    });
    expect(onDrop).toHaveBeenCalledWith(3, 1);
    expect(result.current.state).toBeNull();
  });

  it('a movement beyond 8 px before the second is a scroll: nothing lifts, the tap opens', () => {
    const { result, onDrop } = renderDrag();
    act(() => result.current.begin(2, 1, 500, 50));
    act(() => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 506, clientY: 50 });
    });
    expect(result.current.pressing).toBe(2);
    act(() => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 520, clientY: 50 });
    });
    expect(result.current.pressing).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.state).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();

    // A short tap: released before the second, its click still opens the page.
    act(() => result.current.begin(2, 2, 500, 50));
    act(() => {
      vi.advanceTimersByTime(300);
      fireEvent.pointerUp(window, { pointerId: 2, clientX: 500 });
    });
    expect(result.current.justDropped()).toBe(false);
  });

  it('a card lifted and released in place absorbs the click; Esc puts a lifted card down', () => {
    const { result, onDrop } = renderDrag();
    act(() => result.current.begin(2, 1, 500, 50));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 500 });
    });
    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.justDropped()).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => result.current.begin(2, 3, 500, 50));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Lifted, a touch that would scroll is held back (Chrome on Android cancels the pointer).
    const touch = new Event('touchmove', { cancelable: true });
    window.dispatchEvent(touch);
    expect(touch.defaultPrevented).toBe(true);
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(result.current.state).toBeNull();
    act(() => {
      fireEvent.pointerUp(window, { pointerId: 3, clientX: 100 });
    });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('the cover does not lift: the hold says why and its click does not open it', () => {
    const onRefuse = vi.fn();
    const { result } = renderDrag({ canMove: (index) => index !== 0, onRefuse });
    act(() => result.current.begin(0, 1, 100, 50));
    // Held, it does not rise as a card about to lift does.
    expect(result.current.pressing).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onRefuse).toHaveBeenCalledWith(0);
    expect(result.current.state).toBeNull();
    act(() => {
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 100 });
    });
    expect(result.current.justDropped()).toBe(true);
  });

  it('vibrates once lifted; a cancelled pointer puts the card down without a drop', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      const { result, onDrop } = renderDrag();
      act(() => result.current.begin(2, 1, 500, 50));
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS - 10);
      });
      expect(vibrate).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(20);
      });
      expect(vibrate).toHaveBeenCalledWith(10);
      act(() => {
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 100 });
      });
      expect(result.current.state?.to).toBe(1);
      act(() => {
        fireEvent.pointerCancel(window, { pointerId: 1 });
      });
      expect(result.current.state).toBeNull();
      act(() => {
        fireEvent.pointerUp(window, { pointerId: 1, clientX: 100 });
      });
      expect(onDrop).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(navigator, 'vibrate');
    }
  });

  it('no press starts while a name is edited', () => {
    const { result } = renderDrag({ disabled: true });
    act(() => result.current.begin(2, 1, 500, 50));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.pressing).toBeNull();
    expect(result.current.state).toBeNull();
  });
});

describe('useWidgetDrag: the page turns at the side (REP-20261007-030)', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const start = (hasPage: (direction: -1 | 1) => boolean) => {
    const onEdge = vi.fn(() => 'altra');
    const onDrop = vi.fn<(session: DragSession) => void>();
    const hook = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => ({ left: 0, top: 0, cell: 100, gapX: 0, gapY: 0, grid: { w: 8, h: 5 } }),
        getPlacements: () => ({ a: { x: 2, y: 0, w: 2, h: 1 } }),
        sizesFor: () => undefined,
        getPagerBounds: () => ({ left: 0, right: 800 }),
        hasPage,
        onEdge,
        onDrop,
      })
    );
    act(() =>
      hook.result.current.begin({
        mode: 'move',
        widgetId: 'a',
        label: 'Sole',
        pageId: 'home',
        origin: { x: 2, y: 0, w: 2, h: 1 },
        box: { left: 200, top: 0, width: 200, height: 100 },
        // Held by its right end: the copy reaches the side well before the finger.
        clientX: 390,
        clientY: 50,
        pointerId: 1,
      })
    );
    const move = (x: number) => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: 50 });
      act(() => vi.advanceTimersByTime(20));
    };
    return { ...hook, onEdge, onDrop, move };
  };

  it('turns when the copy sticks out of the side, with the hint shown meanwhile', () => {
    const { result, onEdge, move } = start(() => true);
    move(380);
    // Finger at 150 px from the side, the copy 40 px past it, under a third of its width.
    move(150);
    expect(result.current.edgeSide).toBe(0);
    // The copy now sticks out by 120 px (> 66): the left page is about to come.
    move(70);
    expect(result.current.edgeSide).toBe(-1);
    act(() => vi.advanceTimersByTime(460));
    expect(onEdge).toHaveBeenCalledWith(-1);
    expect(result.current.edgeSide).toBe(0);
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });

  it('a release right after the page turned drops on it, with no wait for the scroll', () => {
    const { result, onEdge, onDrop, move } = start(() => true);
    move(380);
    move(70);
    act(() => vi.advanceTimersByTime(460));
    expect(onEdge).toHaveBeenCalledWith(-1);
    // The page is a target at once, even while it still scrolls into view.
    expect(result.current.session?.target).toMatchObject({ pageId: 'altra', valid: true });
    act(() => vi.advanceTimersByTime(50));
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 70, clientY: 50 });
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onDrop.mock.calls[0][0].target).toMatchObject({ pageId: 'altra', valid: true });
  });

  it('does nothing towards a side without a page of widgets (the cover)', () => {
    const { result, onEdge, move } = start((direction) => direction === 1);
    move(380);
    move(20);
    expect(result.current.edgeSide).toBe(0);
    act(() => vi.advanceTimersByTime(700));
    expect(onEdge).not.toHaveBeenCalled();
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });
});

describe('useWidgetDrag: the trash of the widget bar as drop target (REP-20261008-001)', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const start = (mode: 'move' | 'resize') => {
    const onDrop = vi.fn();
    const onRemove = vi.fn();
    const hook = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => ({
          left: 0,
          top: 100,
          cell: 100,
          gapX: 0,
          gapY: 0,
          grid: { w: 8, h: 4 },
        }),
        getPlacements: () => ({ a: { x: 0, y: 0, w: 1, h: 1 } }),
        sizesFor: () => undefined,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
        // The drop target: here a band at the top, 80 px high.
        getRemoveBounds: () => ({ left: 0, right: 800, top: 0, bottom: 80 }),
        onRemove,
      })
    );
    act(() =>
      hook.result.current.begin({
        mode,
        widgetId: 'a',
        label: 'Luce',
        pageId: 'home',
        origin: { x: 0, y: 0, w: 1, h: 1 },
        box: { left: 0, top: 100, width: 100, height: 100 },
        clientX: 50,
        clientY: 150,
        pointerId: 1,
      })
    );
    const move = (x: number, y: number) => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
      act(() => vi.advanceTimersByTime(20));
    };
    return { ...hook, onDrop, onRemove, move };
  };

  it('a widget moved over the zone lights it, and released there is removed', () => {
    const { result, onDrop, onRemove, move } = start('move');
    move(60, 160);
    move(300, 40);
    expect(result.current.session?.removing).toBe(true);
    expect(result.current.session?.target).toBeNull();
    // Back over the grid: no longer removing.
    move(300, 250);
    expect(result.current.session?.removing).toBe(false);
    move(300, 40);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 40 });
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('a short vibration when the trash lights up, once until the widget leaves it', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });
    const { result, move } = start('move');
    move(60, 160);
    vibrate.mockClear();
    move(300, 40);
    move(310, 40);
    expect(result.current.session?.removing).toBe(true);
    expect(vibrate.mock.calls.filter(([ms]) => ms === 8)).toHaveLength(1);
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });

  it('resizing never removes', () => {
    const { result, onDrop, onRemove, move } = start('resize');
    move(60, 160);
    move(300, 40);
    expect(result.current.session?.removing).toBeFalsy();
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 40 });
    expect(onRemove).not.toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalledOnce();
  });
});
