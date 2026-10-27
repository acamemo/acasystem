/**
 * Round 4 of the optimisation of the choreography of 0.9.28 (REP-20261023-006, tracing of the
 * Tab M11 of 2026-10-25, G4): the end of a drag session and the frame after `stop()` of a drop on
 * another page (S3cD). The tracing found what that frame restyles (785 elements): the drag style
 * of three grids with the inherited `pointer-events` of 85 cells, the `inert` of the gear and of
 * the bar, the lock of the pager and the icons of the cells. These tests fix that none of it is in
 * that frame any more, and that what was kept back comes at the right time. The jump of six pages
 * (J-A) is in `PagerFarPages.test.tsx`, the rules of the stylesheet in `StyleInvalidation0928.test.ts`.
 */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LauncherPage } from '@/@types/launcher';
import { WidgetActionBar, type WidgetBarDrop } from '@/components/system/edit/WidgetActionBar';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { useHeldAfterFrames } from '@/hooks/launcher/useHeldAfterFrames';
import { createLauncherSelection } from '@/hooks/launcher/useLauncherSelection';
import type { DragSession } from '@/hooks/launcher/useWidgetDrag';
import { NARROW_AFTER_LANDING_MS } from '@/templates/launcher/Pager';
import {
  LauncherDragContext,
  LauncherEdgePageContext,
  LauncherUiContext,
  type LauncherUi,
} from '@/templates/launcher/LauncherUiContext';
import { WidgetGrid } from '@/templates/launcher/WidgetGrid';

/** The frames the page asks for, run by hand. */
function manualFrames() {
  const queue = new Map<number, FrameRequestCallback>();
  let next = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    queue.set(next, callback);
    return next++;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    queue.delete(id);
  });
  return {
    pending: () => queue.size,
    /** One frame: what was asked for before it runs, what it asks for waits for the next. */
    run: () =>
      act(() => {
        const callbacks = [...queue.values()];
        queue.clear();
        for (const callback of callbacks) callback(performance.now());
      }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const page: LauncherPage = {
  id: 'casa',
  label: 'Casa',
  kind: 'widgets',
  placements: { phoneLandscape: {} },
};

const session = (patch: Partial<DragSession> = {}) =>
  ({
    mode: 'move',
    widgetId: 'luce',
    label: 'Luce',
    sourcePageId: 'altra',
    pointer: { x: 10, y: 10 },
    target: null,
    ...patch,
  }) as unknown as DragSession;

interface GridOptions {
  drag?: DragSession | null;
  onScreen?: boolean;
  edgePageId?: string | null;
  editMode?: boolean;
  selected?: boolean;
  justDropped?: () => boolean;
}

/** One grid of a page, as the pager draws it, with the contexts a drag session gives it. */
function setupGrid(first: GridOptions = {}) {
  const selection = createLauncherSelection();
  const openAddWidget = vi.fn();
  const moveSelectedTo = vi.fn();
  let options: GridOptions = first;
  const ui = (): LauncherUi =>
    ({
      controller: {
        editMode: options.editMode ?? false,
        classFor: () => 'phoneLandscape',
        gridFor: () => ({ w: 4, h: 1 }),
      },
      registerGrid: () => () => undefined,
      isWidgetHidden: () => false,
      selection,
      widgetName: () => 'Luce',
      openAddWidget,
      moveSelectedTo,
      clearSelection: () => undefined,
      justDropped: options.justDropped ?? (() => false),
    }) as unknown as LauncherUi;
  const tree = () => (
    <LauncherUiContext.Provider value={ui()}>
      <PageVisibilityContext.Provider value={options.onScreen ?? true}>
        <LauncherEdgePageContext.Provider value={options.edgePageId ?? null}>
          <LauncherDragContext.Provider value={options.drag ?? null}>
            <WidgetGrid page={page} />
          </LauncherDragContext.Provider>
        </LauncherEdgePageContext.Provider>
      </PageVisibilityContext.Provider>
    </LauncherUiContext.Provider>
  );
  const view = render(tree());
  if (first.selected) {
    act(() => selection.setSelected({ pageId: page.id, widgetId: 'luce' }));
  }
  return {
    ...view,
    openAddWidget,
    moveSelectedTo,
    grid: () => view.container.querySelector<HTMLElement>('.aca-launcher-grid')!,
    cells: () => [...view.container.querySelectorAll<HTMLElement>('[data-launcher-cell]')],
    change: (next: GridOptions) => {
      options = { ...options, ...next };
      view.rerender(tree());
    },
  };
}

/** Every value the class of the grid took, from the first to the last. */
function watchClass(grid: HTMLElement) {
  const watch = new MutationObserver(() => undefined);
  watch.observe(grid, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  return () => {
    const records = watch.takeRecords();
    watch.disconnect();
    return [...records.map((record) => record.oldValue ?? ''), grid.className];
  };
}

describe('the drag style of a grid that is not on screen when the session ends (W-A)', () => {
  it('the grid on screen loses it in the commit that ends the session, as ever', () => {
    const { grid, change } = setupGrid({ drag: session(), onScreen: true });
    expect(grid()).toHaveClass('is-dragging');
    change({ drag: null });
    expect(grid()).not.toHaveClass('is-dragging');
    // Nothing is waiting for it: it is not drawn again later.
    act(() => {
      vi.advanceTimersByTime(NARROW_AFTER_LANDING_MS * 3);
    });
    expect(grid()).not.toHaveClass('is-dragging');
  });

  it('a grid off screen keeps it in that commit and loses it at the quiet moment of the window (W3)', () => {
    const { grid, change } = setupGrid({
      drag: session(),
      onScreen: false,
      edgePageId: page.id,
    });
    expect(grid()).toHaveClass('is-dragging');
    change({ drag: null, edgePageId: null });
    expect(grid()).toHaveClass('is-dragging');
    act(() => {
      vi.advanceTimersByTime(NARROW_AFTER_LANDING_MS - 1);
    });
    expect(grid()).toHaveClass('is-dragging');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(grid()).not.toHaveClass('is-dragging');
  });

  it('the first pointerdown takes it off at once', () => {
    const { grid, change } = setupGrid({ drag: session(), onScreen: false, edgePageId: page.id });
    change({ drag: null, edgePageId: null });
    expect(grid()).toHaveClass('is-dragging');
    fireEvent.pointerDown(document.body, { pointerId: 1 });
    expect(grid()).not.toHaveClass('is-dragging');
  });

  it('the page coming on screen takes it off in the commit that shows it', () => {
    const { grid, change } = setupGrid({ drag: session(), onScreen: false, edgePageId: page.id });
    change({ drag: null, edgePageId: null });
    expect(grid()).toHaveClass('is-dragging');
    change({ onScreen: true });
    expect(grid()).not.toHaveClass('is-dragging');
  });

  it('a new drag before the quiet moment keeps it, with no gap, and the wait starts again when it ends', () => {
    const { grid, change } = setupGrid({ drag: session(), onScreen: false, edgePageId: page.id });
    const stop = watchClass(grid());
    change({ drag: null, edgePageId: null });
    act(() => {
      vi.advanceTimersByTime(NARROW_AFTER_LANDING_MS - 50);
    });
    // The new drag does not arm this page: the class stays, and the time does not take it off.
    change({ drag: session() });
    act(() => {
      vi.advanceTimersByTime(NARROW_AFTER_LANDING_MS * 3);
    });
    expect(grid()).toHaveClass('is-dragging');
    change({ drag: null });
    expect(grid()).toHaveClass('is-dragging');
    act(() => {
      vi.advanceTimersByTime(NARROW_AFTER_LANDING_MS);
    });
    expect(grid()).not.toHaveClass('is-dragging');
    // The class went off once, at the end.
    const seen = stop();
    expect(seen.filter((value) => !value.includes('is-dragging'))).toEqual([seen.at(-1)]);
  });

  it('a new drag that arms the page takes the class over with no gap', () => {
    const { grid, change } = setupGrid({ drag: session(), onScreen: false, edgePageId: page.id });
    const stop = watchClass(grid());
    change({ drag: null, edgePageId: null });
    change({ drag: session(), edgePageId: page.id });
    expect(grid()).toHaveClass('is-dragging');
    // It is the drag's now: the quiet moment of the first one does not take it off.
    act(() => {
      vi.advanceTimersByTime(NARROW_AFTER_LANDING_MS * 3);
    });
    expect(grid()).toHaveClass('is-dragging');
    change({ drag: null, edgePageId: null });
    expect(grid()).toHaveClass('is-dragging');
    act(() => {
      vi.advanceTimersByTime(NARROW_AFTER_LANDING_MS);
    });
    expect(grid()).not.toHaveClass('is-dragging');
    const seen = stop();
    expect(seen.filter((value) => !value.includes('is-dragging'))).toEqual([seen.at(-1)]);
  });

  it('a grid that the session never reached does not keep a class it never had', () => {
    const { grid, change } = setupGrid({ drag: session(), onScreen: false });
    expect(grid()).not.toHaveClass('is-dragging');
    change({ drag: null });
    expect(grid()).not.toHaveClass('is-dragging');
  });
});

describe('the cells show where the widget goes from the release of a drop that lands (W-I)', () => {
  const labels = (cells: HTMLElement[]) => cells.map((cell) => cell.getAttribute('aria-label'));

  it('a widget selected and nothing dragged: «Sposta qui», as ever', () => {
    const { cells } = setupGrid({ editMode: true, selected: true });
    expect(labels(cells())[0]).toMatch(/^Sposta Luce qui/);
  });

  it('while it is dragged the cells still offer to add', () => {
    const { cells } = setupGrid({ editMode: true, selected: true, drag: session() });
    expect(labels(cells())[0]).toMatch(/^Aggiungi un widget/);
  });

  it('in the flight of a landing the cells already show the move, so no icon is swapped at the second beat', () => {
    const { cells, change } = setupGrid({ editMode: true, selected: true, drag: session() });
    const before = cells();
    change({ drag: session({ flight: { kind: 'land', x: 0, y: 0, scale: 1 } }) });
    expect(labels(cells())[0]).toMatch(/^Sposta Luce qui/);
    const icons = cells().map((cell) => cell.innerHTML);
    // The second beat: the session ends; the cells are the same nodes and nothing changes in them.
    change({ drag: null });
    expect(cells()).toEqual(before);
    expect(cells().map((cell) => cell.innerHTML)).toEqual(icons);
    expect(labels(cells())[0]).toMatch(/^Sposta Luce qui/);
  });

  it('the flight of a refusal or of a removal does not change them', () => {
    const { cells, change } = setupGrid({ editMode: true, selected: true, drag: session() });
    change({ drag: session({ flight: { kind: 'return', x: 0, y: 0, scale: 1 } }) });
    expect(labels(cells())[0]).toMatch(/^Aggiungi un widget/);
    change({ drag: session({ flight: { kind: 'remove', x: 0, y: 0, scale: 1 } }) });
    expect(labels(cells())[0]).toMatch(/^Aggiungi un widget/);
  });
});

describe('the cells take no press while a widget is dragged, and right after (W-P)', () => {
  it('a press and a click on a free cell act when nothing is dragged', () => {
    const { cells, openAddWidget } = setupGrid({});
    fireEvent.pointerDown(cells()[0], { pointerId: 1, button: 0, isPrimary: true });
    expect(cells()[0]).toHaveClass('is-pressed');
    fireEvent.click(cells()[0]);
    expect(openAddWidget).toHaveBeenCalledOnce();
  });

  it('during a drag, and during its flight, a press and a click do nothing', () => {
    const { cells, change, openAddWidget } = setupGrid({ drag: session() });
    fireEvent.pointerDown(cells()[0], { pointerId: 1, button: 0, isPrimary: true });
    expect(cells()[0]).not.toHaveClass('is-pressed');
    fireEvent.click(cells()[0]);
    change({ drag: session({ flight: { kind: 'land', x: 0, y: 0, scale: 1 } }) });
    fireEvent.pointerDown(cells()[1], { pointerId: 1, button: 0, isPrimary: true });
    fireEvent.click(cells()[1]);
    expect(openAddWidget).not.toHaveBeenCalled();
    expect(cells().some((cell) => cell.classList.contains('is-pressed'))).toBe(false);
  });

  it('right after a drop (the release click) it does nothing, nor in a move to a cell', () => {
    let just = true;
    const { cells, change, openAddWidget, moveSelectedTo } = setupGrid({
      drag: session(),
      editMode: true,
      justDropped: () => just,
    });
    change({ drag: null });
    fireEvent.click(cells()[0]);
    expect(openAddWidget).not.toHaveBeenCalled();
    expect(moveSelectedTo).not.toHaveBeenCalled();
    just = false;
    fireEvent.click(cells()[0]);
    expect(openAddWidget).toHaveBeenCalledOnce();
  });
});

describe('the bar of the widget keeps «Annulla» and «Fine» out of reach two frames after the drop (W-B)', () => {
  const bar = (drop: WidgetBarDrop) => (
    <WidgetActionBar
      hidden={false}
      name="Luce"
      changed
      onDone={() => undefined}
      onUndo={() => undefined}
      onRemove={() => undefined}
      drop={drop}
    />
  );
  const rest = () => document.querySelector<HTMLElement>('.aca-widget-actions__rest')!;
  const group = () => document.querySelector<HTMLElement>('.aca-page-overview__group')!;

  it('the group is out of reach as the drop begins, in the same render', () => {
    manualFrames();
    const { rerender } = render(bar('none'));
    expect(rest()).not.toHaveAttribute('inert');
    rerender(bar('ready'));
    expect(rest()).toHaveAttribute('inert');
    expect(group()).toHaveClass('aca-widget-actions--drop');
  });

  it('at the end the look changes at once and the reach comes back after two frames', () => {
    const frames = manualFrames();
    const { rerender } = render(bar('ready'));
    rerender(bar('none'));
    // The class of the bar goes in that commit; `inert` is still there ...
    expect(group()).not.toHaveClass('aca-widget-actions--drop');
    expect(rest()).toHaveAttribute('inert');
    // ... and goes with the second frame, not the first.
    frames.run();
    expect(rest()).toHaveAttribute('inert');
    frames.run();
    expect(rest()).not.toHaveAttribute('inert');
    // «Annulla» takes a press again.
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeEnabled();
  });

  it('a new drop before the frames keeps it out of reach and cancels the wait', () => {
    const frames = manualFrames();
    const { rerender } = render(bar('ready'));
    rerender(bar('none'));
    frames.run();
    rerender(bar('ready'));
    frames.run();
    frames.run();
    expect(rest()).toHaveAttribute('inert');
    rerender(bar('none'));
    frames.run();
    frames.run();
    expect(rest()).not.toHaveAttribute('inert');
  });
});

describe('useHeldAfterFrames: what a session ended holds for two frames (W-B, W-L)', () => {
  it('is true with the session in the same render, and false two frames after it', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ active }) => useHeldAfterFrames(active), {
      initialProps: { active: false },
    });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(true);
    rerender({ active: false });
    // The commit that ends the session changes nothing of what is held.
    expect(result.current).toBe(true);
    frames.run();
    expect(result.current).toBe(true);
    frames.run();
    expect(result.current).toBe(false);
  });

  it('a session taken up again before the frames holds it, and the old wait does not end it', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ active }) => useHeldAfterFrames(active), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    frames.run();
    rerender({ active: true });
    frames.run();
    frames.run();
    expect(result.current).toBe(true);
    rerender({ active: false });
    frames.run();
    frames.run();
    expect(result.current).toBe(false);
  });
});
