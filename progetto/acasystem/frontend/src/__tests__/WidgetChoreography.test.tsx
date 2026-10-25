/**
 * Choreography of the widgets, block 3 of 0.9.28 (REP-20261023-006, with the user's answers of
 * 2026-10-23): the flat shape of a resize and the order that keeps the content away while it lasts
 * (D-M6), the «+» cells that come and go, the flight of the copy into its cell and the drop that is
 * committed when it has landed (D-M8), the removal over the trash (D-M10), the store of the widget
 * that leaves and the one that comes in. jsdom computes no animation: the browser's Web Animations
 * API is lent to the tests that need it (`lendAnimations`), as in `SheetSystemChoreography.test.tsx`;
 * the rules of the style sheets are in `MotionChoreographyBlock3.test.ts`.
 */
import { useRef } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LauncherPage } from '@/@types/launcher';
import { useEnteringIn, useExitingIn } from '@/hooks/launcher/useLauncherSelection';
import { createLauncherSelection } from '@/hooks/launcher/useLauncherSelection';
import { useLeavingItems } from '@/hooks/launcher/useLeaving';
import { SHAPE_CLEAR_MS, SHAPE_SETTLE_MS, useResizeShape } from '@/hooks/launcher/useResizeShape';
import { useWidgetDrag, type DragSession, type GridGeometry } from '@/hooks/launcher/useWidgetDrag';
import { DragGhost, FLIGHT_MS } from '@/templates/launcher/DragGhost';
import { LauncherUiContext, type LauncherUi } from '@/templates/launcher/LauncherUiContext';
import { WidgetGrid } from '@/templates/launcher/WidgetGrid';
import { WidgetHost } from '@/templates/launcher/WidgetHost';

/** The browser animates: `canAnimate` is true. */
function lendAnimations() {
  Object.defineProperty(document.documentElement, 'getAnimations', {
    configurable: true,
    value: () => [],
  });
}

function reducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

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
    run: () =>
      act(() => {
        const callbacks = [...queue.values()];
        queue.clear();
        for (const callback of callbacks) callback(performance.now());
      }),
  };
}

beforeEach(() => {
  reducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document.documentElement, 'getAnimations');
});

describe('useResizeShape: the order of the shape (D-M6)', () => {
  /** A host box that may run a transition of its size. */
  function ShapeHarness({ resizing, runs = false }: { resizing: boolean; runs?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const shape = useResizeShape(resizing, ref);
    return (
      <div
        ref={(element) => {
          ref.current = element;
          if (element) {
            Object.defineProperty(element, 'getAnimations', {
              configurable: true,
              value: () => (runs ? [{ transitionProperty: 'width' }] : []),
            });
          }
        }}
        data-testid="host"
        data-shaped={shape.shaped}
        data-skipped={shape.skipped}
        data-holding={shape.holding}
      />
    );
  }
  const state = () => {
    const host = screen.getByTestId('host');
    return [host.dataset.shaped, host.dataset.skipped, host.dataset.holding].join(' ');
  };

  it('holds the box while the face goes, skips the content after, and lays it out once at the end', () => {
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    const { rerender } = render(<ShapeHarness resizing={false} />);
    expect(state()).toBe('false false false');
    rerender(<ShapeHarness resizing />);
    // The face goes in 100 ms, and the box does not change size yet.
    expect(state()).toBe('true false true');
    act(() => {
      vi.advanceTimersByTime(SHAPE_CLEAR_MS - 1);
    });
    expect(state()).toBe('true false true');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    // Now the content is skipped by the browser and the box follows the cell.
    expect(state()).toBe('true true false');
    // The finger is up: the box is asked, two frames later, if its size still runs.
    rerender(<ShapeHarness resizing={false} />);
    expect(state()).toBe('true true false');
    frames.run();
    frames.run();
    // No transition of the size runs: the content is laid out again, hidden.
    expect(state()).toBe('true false false');
    // The observers measure in the next frames; then the shape goes and the face fades in.
    frames.run();
    expect(state()).toBe('true false false');
    frames.run();
    expect(state()).toBe('false false false');
  });

  it('waits for the box to reach its last size, with the content still skipped, before it wakes', () => {
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    const { rerender } = render(<ShapeHarness resizing={false} runs />);
    rerender(<ShapeHarness resizing runs />);
    act(() => {
      vi.advanceTimersByTime(SHAPE_CLEAR_MS);
    });
    expect(state()).toBe('true true false');
    rerender(<ShapeHarness resizing={false} runs />);
    frames.run();
    frames.run();
    // A size transition runs (a refused drop goes back): the content stays skipped until it ends.
    expect(state()).toBe('true true false');
    fireEvent.transitionEnd(screen.getByTestId('host'), { propertyName: 'width' });
    expect(state()).toBe('true false false');
  });

  it('does not wait for an event that never comes: the cap is the move plus two frames', () => {
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    const { rerender } = render(<ShapeHarness resizing={false} runs />);
    rerender(<ShapeHarness resizing runs />);
    act(() => {
      vi.advanceTimersByTime(SHAPE_CLEAR_MS);
    });
    rerender(<ShapeHarness resizing={false} runs />);
    frames.run();
    frames.run();
    act(() => {
      vi.advanceTimersByTime(SHAPE_SETTLE_MS);
    });
    expect(state()).toBe('true true false');
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(state()).toBe('true false false');
  });

  it('a finger lifted before the face has gone wakes the content at once: nothing was skipped', () => {
    lendAnimations();
    vi.useFakeTimers();
    manualFrames();
    const { rerender } = render(<ShapeHarness resizing={false} />);
    rerender(<ShapeHarness resizing />);
    act(() => {
      vi.advanceTimersByTime(30);
    });
    rerender(<ShapeHarness resizing={false} />);
    expect(state()).toBe('true false false');
  });

  it('a new gesture during the wake starts the shape again', () => {
    lendAnimations();
    vi.useFakeTimers();
    manualFrames();
    const { rerender } = render(<ShapeHarness resizing={false} />);
    rerender(<ShapeHarness resizing />);
    act(() => {
      vi.advanceTimersByTime(SHAPE_CLEAR_MS);
    });
    rerender(<ShapeHarness resizing={false} />);
    rerender(<ShapeHarness resizing />);
    expect(state()).toBe('true false true');
  });

  it('where nothing animates the shape is up for the gesture and goes with it, with no wait', () => {
    const { rerender } = render(<ShapeHarness resizing={false} />);
    rerender(<ShapeHarness resizing />);
    expect(state()).toBe('true false false');
    rerender(<ShapeHarness resizing={false} />);
    expect(state()).toBe('false false false');
  });

  it('with reduced motion the same: the shape only fades, the content is not skipped', () => {
    lendAnimations();
    reducedMotion(true);
    vi.useFakeTimers();
    const { rerender } = render(<ShapeHarness resizing={false} />);
    rerender(<ShapeHarness resizing />);
    act(() => {
      vi.advanceTimersByTime(SHAPE_CLEAR_MS + 50);
    });
    expect(state()).toBe('true false false');
    rerender(<ShapeHarness resizing={false} />);
    expect(state()).toBe('false false false');
  });
});

describe('the shape on the box of a widget (WidgetHost)', () => {
  const placement = { x: 0, y: 0, w: 1, h: 1 };
  const live = { x: 0, y: 0, w: 3, h: 2 };

  function hostUi(): LauncherUi {
    const definition = {
      type: 'probe',
      label: 'Sonda',
      icon: 'grid',
      sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 2 }, default: { w: 1, h: 1 } },
      matches: () => true,
      Widget: ({ size }: { size: { w: number; h: number } }) => (
        <p data-testid="content">{`${size.w}x${size.h}`}</p>
      ),
    };
    return {
      controller: {
        editMode: true,
        settingsKeyFor: () => 'k',
        settingsFor: () => ({}),
        layout: {},
        sizesFor: () => undefined,
        gridFor: () => ({ w: 4, h: 2 }),
      },
      findDefinition: () => definition,
      widgetName: () => 'Luce',
      isWidgetHidden: () => false,
      selection: createLauncherSelection(),
      takeFocusRequest: () => false,
      requestRemove,
    } as unknown as LauncherUi;
  }
  const requestRemove = vi.fn();
  function mount(props: Partial<React.ComponentProps<typeof WidgetHost>> = {}) {
    const ui = hostUi();
    const view = render(
      <LauncherUiContext.Provider value={ui}>
        <WidgetHost
          pageId="casa"
          widgetId="luce"
          rect={placement}
          placement={placement}
          selected
          {...props}
        />
      </LauncherUiContext.Provider>
    );
    const rerender = (next: Partial<React.ComponentProps<typeof WidgetHost>>) =>
      view.rerender(
        <LauncherUiContext.Provider value={ui}>
          <WidgetHost
            pageId="casa"
            widgetId="luce"
            rect={placement}
            placement={placement}
            selected
            {...next}
          />
        </LauncherUiContext.Provider>
      );
    const host = () => view.container.querySelector<HTMLElement>('.aca-launcher-widget')!;
    return { ...view, rerender, host };
  }

  it('without animation a resize is drawn live under the shape: no wait, no frozen content', () => {
    const { host, rerender } = mount();
    rerender({ dragging: 'resize', rect: live });
    expect(host()).toHaveClass('is-resizing', 'is-shaped');
    expect(host()).not.toHaveClass('is-skipped');
    expect(host().style.getPropertyValue('--aca-lw')).toBe('3');
    expect(screen.getByTestId('content')).toHaveTextContent('3x2');
    rerender({ dragging: false, rect: live, placement: live });
    expect(host()).not.toHaveClass('is-shaped');
  });

  it('with animation the box waits for the face, then follows; the content keeps its saved size while skipped', () => {
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    const { host, rerender } = mount();
    rerender({ dragging: 'resize', rect: live });
    // The first measure waits: the box is still the saved one.
    expect(host()).toHaveClass('is-shaped');
    expect(host().style.getPropertyValue('--aca-lw')).toBe('1');
    act(() => {
      vi.advanceTimersByTime(SHAPE_CLEAR_MS);
    });
    expect(host()).toHaveClass('is-skipped');
    expect(host().style.getPropertyValue('--aca-lw')).toBe('3');
    expect(host().style.getPropertyValue('--aca-lh')).toBe('2');
    // The content is not asked to lay out at each cell: it is given the saved size meanwhile.
    expect(screen.getByTestId('content')).toHaveTextContent('1x1');
    // Released on the new size: the saved size follows, the content takes it once awake.
    rerender({ dragging: false, rect: live, placement: live });
    expect(host()).toHaveClass('is-skipped');
    frames.run();
    frames.run();
    expect(host()).not.toHaveClass('is-skipped');
    expect(host()).toHaveClass('is-shaped');
    expect(screen.getByTestId('content')).toHaveTextContent('3x2');
  });

  it('a move that changes no cell leaves the face and the content alone: the shape comes at the first new cell', () => {
    lendAnimations();
    vi.useFakeTimers();
    manualFrames();
    const { host, rerender } = mount();
    // The dot has moved a few pixels (the session is born) but the size under it is the saved one.
    rerender({ dragging: 'resize', rect: placement });
    act(() => {
      vi.advanceTimersByTime(SHAPE_CLEAR_MS * 2);
    });
    expect(host()).toHaveClass('is-resizing');
    expect(host()).not.toHaveClass('is-shaped');
    expect(host()).not.toHaveClass('is-skipped');
    rerender({ dragging: false, rect: placement });
    expect(host()).not.toHaveClass('is-shaped');
    // A new cell brings the shape, and it stays to the end even if the finger comes back.
    rerender({ dragging: 'resize', rect: live });
    expect(host()).toHaveClass('is-shaped');
    rerender({ dragging: 'resize', rect: placement });
    expect(host()).toHaveClass('is-shaped');
  });

  it('a widget that leaves keeps the focus and takes no command', () => {
    const { host, rerender } = mount();
    const handle = () => host().querySelector<HTMLButtonElement>('button')!;
    handle().focus();
    fireEvent.keyDown(handle(), { key: 'Delete' });
    expect(requestRemove).toHaveBeenCalledTimes(1);
    rerender({ exiting: true });
    expect(handle()).toHaveFocus();
    fireEvent.keyDown(handle(), { key: 'Delete' });
    expect(requestRemove).toHaveBeenCalledTimes(1);
  });

  it('a refused size draws the shape in the colour of the error, and only while it is up', () => {
    const { host, rerender } = mount();
    rerender({ dragging: 'resize', rect: live, shapeInvalid: true });
    expect(host()).toHaveClass('is-shape-invalid');
    rerender({ dragging: false, rect: placement, shapeInvalid: false });
    expect(host()).not.toHaveClass('is-shape-invalid');
    // A refused size outside a resize shows nothing.
    rerender({ dragging: false, shapeInvalid: true });
    expect(host()).not.toHaveClass('is-shape-invalid');
  });

  it('leaves out of reach, and comes in at the look it comes from until `go`', () => {
    const { host, rerender } = mount();
    rerender({ exiting: true });
    expect(host()).toHaveClass('is-exiting');
    // Not inert: the focus stays where it was until the removal, and the commands are refused.
    expect(host()).not.toHaveAttribute('inert');
    rerender({
      exiting: false,
      entering: { pageId: 'casa', widgetId: 'luce', mode: 'added', go: false },
    });
    expect(host()).toHaveClass('is-entering', 'is-added');
    expect(host()).not.toHaveClass('is-go');
    rerender({ entering: { pageId: 'casa', widgetId: 'luce', mode: 'restored', go: true } });
    expect(host()).toHaveClass('is-entering', 'is-go', 'is-restored');
    rerender({ entering: null });
    expect(host()).not.toHaveClass('is-entering');
  });
});

describe('the store of the widget that leaves and the one that comes in', () => {
  it('keeps each answer per page and redraws only the page concerned', () => {
    const store = createLauncherSelection();
    const exiting = renderHook(() => useExitingIn(store, 'casa'));
    const entering = renderHook(() => useEnteringIn(store, 'casa'));
    expect(exiting.result.current).toBeNull();
    expect(entering.result.current).toBeNull();
    act(() => store.setExiting({ pageId: 'altra', widgetId: 'a' }));
    expect(exiting.result.current).toBeNull();
    act(() => store.setExiting({ pageId: 'casa', widgetId: 'b' }));
    expect(exiting.result.current).toBe('b');
    const marker = { pageId: 'casa', widgetId: 'c', mode: 'added' as const, go: false };
    act(() => store.setEntering(marker));
    // The same object until it changes: useSyncExternalStore needs a stable answer.
    expect(entering.result.current).toBe(marker);
    act(() => store.setEntering({ ...marker, go: true }));
    expect(entering.result.current?.go).toBe(true);
    act(() => store.setEntering(null));
    expect(entering.result.current).toBeNull();
  });
});

describe('the list that keeps what leaves also tells what came', () => {
  type Item = { id: string };
  const flags = (entries: ReturnType<typeof useLeavingItems<Item>>) =>
    entries.map((entry) => [entry.item.id, entry.leaving, entry.entering]);

  it('the first items are not entering; those that come after are, where the browser animates', () => {
    lendAnimations();
    const { result, rerender } = renderHook(
      ({ items }: { items: Item[] }) => useLeavingItems(items, 160),
      { initialProps: { items: [{ id: 'a' }, { id: 'b' }] } }
    );
    expect(flags(result.current)).toEqual([
      ['a', false, false],
      ['b', false, false],
    ]);
    rerender({ items: [{ id: 'b' }, { id: 'c' }] });
    expect(flags(result.current)).toEqual([
      ['a', true, false],
      ['b', false, false],
      ['c', false, true],
    ]);
  });

  it('where nothing animates nothing is entering or leaving', () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: Item[] }) => useLeavingItems(items, 160),
      { initialProps: { items: [{ id: 'a' }] } }
    );
    rerender({ items: [{ id: 'b' }] });
    expect(flags(result.current)).toEqual([['b', false, false]]);
  });
});

describe('the «+» cells of a page come and go (D-M6)', () => {
  const page: LauncherPage = {
    id: 'casa',
    label: 'Casa',
    kind: 'widgets',
    placements: { phoneLandscape: {} },
  };
  function gridWith(columns: number) {
    const ui = {
      controller: {
        editMode: false,
        classFor: () => 'phoneLandscape',
        gridFor: () => ({ w: columns, h: 1 }),
      },
      registerGrid: () => () => undefined,
      isWidgetHidden: () => false,
      selection: createLauncherSelection(),
    } as unknown as LauncherUi;
    return (
      <LauncherUiContext.Provider value={ui}>
        <WidgetGrid page={page} />
      </LauncherUiContext.Provider>
    );
  }
  const cells = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-launcher-cell]'));

  it('a cell that goes stays inert and fades, then is gone; one that comes enters', () => {
    lendAnimations();
    vi.useFakeTimers();
    const { container, rerender } = render(gridWith(4));
    // The cells a page is drawn with do not animate.
    expect(cells(container)).toHaveLength(4);
    expect(container.querySelector('.is-entering')).toBeNull();
    rerender(gridWith(2));
    const all = cells(container);
    expect(all).toHaveLength(4);
    const leaving = all.filter((cell) => cell.classList.contains('is-leaving'));
    expect(leaving.map((cell) => cell.dataset.launcherCell)).toEqual(['2,0', '3,0']);
    for (const cell of leaving) {
      expect(cell).toHaveAttribute('inert');
      expect(cell).toHaveAttribute('aria-hidden', 'true');
      expect(cell).toHaveAttribute('tabindex', '-1');
    }
    // The cells that stay are not touched.
    expect(all.slice(0, 2).every((cell) => !cell.classList.contains('is-leaving'))).toBe(true);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(cells(container)).toHaveLength(2);
    // A cell that comes back enters with the animation of a cell that comes.
    rerender(gridWith(3));
    const back = cells(container);
    expect(back).toHaveLength(3);
    expect(back[2]).toHaveClass('is-entering');
    expect(back[0]).not.toHaveClass('is-entering');
  });

  it('a cell that comes back while it still leaves is a cell again, not a second one', () => {
    lendAnimations();
    vi.useFakeTimers();
    const { container, rerender } = render(gridWith(4));
    rerender(gridWith(2));
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender(gridWith(4));
    // The same four cells, none leaving: the opacity returns by the transition of the cell.
    expect(cells(container)).toHaveLength(4);
    expect(container.querySelector('.is-leaving')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(cells(container)).toHaveLength(4);
  });

  it('only one tab stop and no focus on a cell that goes', () => {
    lendAnimations();
    vi.useFakeTimers();
    const { container, rerender } = render(gridWith(3));
    rerender(gridWith(1));
    const stops = cells(container).filter((cell) => cell.getAttribute('tabindex') === '0');
    expect(stops.map((cell) => cell.dataset.launcherCell)).toEqual(['0,0']);
  });

  it('where nothing animates the cells come and go at once, as they always did', () => {
    const { container, rerender } = render(gridWith(4));
    rerender(gridWith(2));
    expect(cells(container)).toHaveLength(2);
    expect(container.querySelector('.is-leaving, .is-entering')).toBeNull();
  });
});

describe('the flight of the copy after the release (D-M8, D-M10)', () => {
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
    vi.unstubAllGlobals();
  });

  const grid = { w: 4, h: 2 };
  const free = { min: { w: 1, h: 1 }, max: { w: 4, h: 2 }, default: { w: 1, h: 1 } };
  // 4 × 2 cells of 100 px, no gap, at the origin of the screen (jsdom is 1024 × 768).
  const geometry: GridGeometry = { left: 0, top: 0, cell: 100, gapX: 0, gapY: 0, grid };

  function setup(options: { geometryOnce?: () => GridGeometry | null } = {}) {
    const onDrop = vi.fn<(session: DragSession, flying?: boolean) => void>();
    const onLanded = vi.fn<(session: DragSession) => void>();
    const onRemove = vi.fn<(session: DragSession) => void>();
    const hook = renderHook(() =>
      useWidgetDrag({
        getGeometry: options.geometryOnce ?? (() => geometry),
        getPlacements: () => ({ a: { x: 0, y: 0, w: 1, h: 1 } }),
        sizesFor: () => free,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
        onLanded,
        getRemoveBounds: () => ({ left: 0, right: 800, top: 700, bottom: 768 }),
        onRemove,
      })
    );
    act(() =>
      hook.result.current.begin({
        mode: 'move',
        widgetId: 'a',
        label: 'Luce',
        pageId: 'home',
        origin: { x: 0, y: 0, w: 1, h: 1 },
        box: { left: 0, top: 0, width: 100, height: 100 },
        clientX: 50,
        clientY: 50,
        pointerId: 1,
        lifted: true,
      })
    );
    const move = (x: number, y: number) => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
      act(() => vi.advanceTimersByTime(20));
    };
    return { ...hook, onDrop, onLanded, onRemove, move };
  }

  it('lands in its cell: the drop is committed at the release, before the flight, and the copy lands later (K6b, 2026-10-25)', () => {
    lendAnimations();
    const { result, onDrop, onLanded, move } = setup();
    move(60, 50);
    move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    // Committed at once, flagged as flying (the widget stays hidden in its cell); the session
    // stays, with a flight to the centre of cell (2, 1).
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onDrop.mock.calls[0][1]).toBe(true);
    expect(onDrop.mock.calls[0][0].target).toMatchObject({
      valid: true,
      rect: { x: 2, y: 1, w: 1, h: 1 },
    });
    expect(onLanded).not.toHaveBeenCalled();
    const flight = result.current.session?.flight;
    expect(flight).toEqual({ kind: 'land', x: 200, y: 100, scale: 1 });
    expect(result.current.session?.target?.rect).toEqual({ x: 2, y: 1, w: 1, h: 1 });
    act(() => result.current.flightEnded());
    // The end of the flight commits nothing: it only says the copy has landed (first beat of the
    // landing, W2) ...
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onLanded).toHaveBeenCalledOnce();
    // ... and the session ends in a task of its own, after the next frames (second beat).
    expect(result.current.session?.flight?.kind).toBe('land');
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.session).toBeNull();
    expect(onLanded).toHaveBeenCalledOnce();
  });

  it('a landing leaves the session to the second beat: the swap alone comes first (W2)', () => {
    lendAnimations();
    const { result, onLanded, move } = setup();
    move(60, 50);
    move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    let rendersAtSwap = 0;
    act(() => {
      result.current.flightEnded();
      rendersAtSwap = onLanded.mock.calls.length;
    });
    // The swap ran inside flushSync, within the call; the session did not change with it.
    expect(rendersAtSwap).toBe(1);
    expect(result.current.session?.flight?.kind).toBe('land');
    // Not in the frame of the swap, and not before the next one has been drawn.
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.session).not.toBeNull();
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.session).toBeNull();
  });

  it('the end of the edit mode between the two beats ends the session at once and commits nothing twice (W2)', () => {
    lendAnimations();
    const { result, onDrop, onLanded, move } = setup();
    move(60, 50);
    move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    act(() => result.current.flightEnded());
    act(() => result.current.cancel());
    expect(result.current.session).toBeNull();
    act(() => vi.advanceTimersByTime(100));
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onLanded).toHaveBeenCalledOnce();
  });

  it('a second end of the flight commits nothing twice', () => {
    lendAnimations();
    const { result, onDrop, onLanded, move } = setup();
    move(60, 50);
    move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    act(() => result.current.flightEnded());
    act(() => result.current.flightEnded());
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onLanded).toHaveBeenCalledOnce();
  });

  it('scales the copy to the size of the cell it flies to', () => {
    lendAnimations();
    const { result, move } = (() => {
      const hook = setup({
        // The target page has cells of 50 px: the copy of 100 px comes down to half.
        geometryOnce: () => ({ ...geometry, cell: 50 }),
      });
      return hook;
    })();
    move(60, 50);
    move(70, 60);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 70, clientY: 60 });
    expect(result.current.session?.flight?.kind).toBe('land');
    expect(result.current.session?.flight?.scale).toBeLessThan(1);
  });

  it('a drop that has no target goes back to the cell it left, and is handed to onDrop after', () => {
    lendAnimations();
    // The grid reports nothing at the release (the computation of the target), then itself.
    let silent = false;
    const { result, onDrop, move } = setup({
      geometryOnce: () => {
        if (silent) {
          silent = false;
          return null;
        }
        return geometry;
      },
    });
    move(60, 50);
    move(250, 150);
    silent = true;
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    expect(result.current.session?.flight).toEqual({ kind: 'return', x: 0, y: 0, scale: 1 });
    // A refused drop shows no target while it goes back.
    expect(result.current.session?.target).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
    act(() => result.current.flightEnded());
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onDrop.mock.calls[0][0].target).toBeNull();
  });

  it('over the trash the copy shrinks away where it is, and the removal comes after', () => {
    lendAnimations();
    const { result, onDrop, onRemove, move } = setup();
    move(60, 50);
    move(300, 740);
    expect(result.current.session?.removing).toBe(true);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 740 });
    expect(result.current.session?.flight?.kind).toBe('remove');
    expect(onRemove).not.toHaveBeenCalled();
    act(() => result.current.flightEnded());
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
  });

  it('listens to nothing once released, and a new press during the flight does not start', () => {
    lendAnimations();
    const { result, onDrop, move } = setup();
    move(60, 50);
    move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    // A late move of the same pointer is not followed.
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(20));
    expect(result.current.session?.pointer).toEqual({ x: 250, y: 150 });
    act(() =>
      result.current.begin({
        mode: 'move',
        widgetId: 'b',
        label: 'Altro',
        pageId: 'home',
        origin: { x: 1, y: 0, w: 1, h: 1 },
        box: { left: 100, top: 0, width: 100, height: 100 },
        clientX: 150,
        clientY: 50,
        pointerId: 2,
        lifted: true,
      })
    );
    expect(result.current.session?.widgetId).toBe('a');
    act(() => result.current.flightEnded());
    expect(onDrop).toHaveBeenCalledOnce();
  });

  it('a gesture cancelled before the release puts the copy down without a drop', () => {
    lendAnimations();
    const { result, onDrop, move } = setup();
    move(60, 50);
    move(250, 150);
    act(() => result.current.cancel());
    expect(result.current.session).toBeNull();
    act(() => result.current.flightEnded());
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('the end of edit mode during the flight lets the widget show, once, without the flight; the drop was committed at the release', () => {
    lendAnimations();
    const { result, onDrop, onLanded, move } = setup();
    move(60, 50);
    move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onLanded).not.toHaveBeenCalled();
    act(() => result.current.cancel());
    expect(result.current.session).toBeNull();
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onLanded).toHaveBeenCalledOnce();
    act(() => result.current.flightEnded());
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onLanded).toHaveBeenCalledOnce();
  });

  it('does not fly where nothing animates, with reduced motion, or to a cell off the screen', () => {
    // jsdom: no Web Animations API.
    const first = setup();
    first.move(60, 50);
    first.move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    expect(first.onDrop).toHaveBeenCalledOnce();
    expect(first.result.current.session).toBeNull();
    first.unmount();

    lendAnimations();
    reducedMotion(true);
    const second = setup();
    second.move(60, 50);
    second.move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    expect(second.onDrop).toHaveBeenCalledOnce();
    second.unmount();

    reducedMotion(false);
    // Another page than the one on view: its cells rest off the screen.
    const third = setup({ geometryOnce: () => ({ ...geometry, left: 5000 }) });
    third.move(60, 50);
    third.move(250, 150);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 150 });
    expect(third.onDrop).toHaveBeenCalledOnce();
    expect(third.result.current.session).toBeNull();
  });

  it('a resize and a tray widget are committed at once: only a moved widget flies', () => {
    lendAnimations();
    const onDrop = vi.fn<(session: DragSession) => void>();
    const { result } = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => geometry,
        getPlacements: () => ({ a: { x: 0, y: 0, w: 1, h: 1 } }),
        sizesFor: () => free,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
      })
    );
    act(() =>
      result.current.begin({
        mode: 'resize',
        edge: { x: 1, y: 1 },
        widgetId: 'a',
        label: 'Luce',
        pageId: 'home',
        origin: { x: 0, y: 0, w: 1, h: 1 },
        box: { left: 0, top: 0, width: 100, height: 100 },
        clientX: 100,
        clientY: 100,
        pointerId: 1,
      })
    );
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 200, clientY: 100 });
    expect(onDrop).toHaveBeenCalledOnce();
    expect(result.current.session).toBeNull();
  });
});

describe('the copy on screen (DragGhost)', () => {
  const session: DragSession = {
    mode: 'move',
    edge: { x: 1, y: 1 },
    widgetId: 'luce',
    label: 'Luce',
    sourcePageId: 'home',
    origin: { x: 0, y: 0, w: 1, h: 1 },
    box: { width: 100, height: 100 },
    offset: { x: 30, y: 40 },
    start: { x: 30, y: 40 },
    pointer: { x: 300, y: 400 },
    target: null,
    lifted: true,
  };
  const ghost = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('.aca-drag-ghost')!;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('follows the pointer until it is released', () => {
    const { container } = render(<DragGhost session={session} />);
    expect(ghost(container).style.transform).toBe('translate3d(270px, 360px, 0)');
    expect(ghost(container)).not.toHaveClass('is-flying');
  });

  it('flies to its cell with a transform and a scale, and says when it has landed', () => {
    const onEnd = vi.fn();
    const flying: DragSession = {
      ...session,
      flight: { kind: 'land', x: 200, y: 100, scale: 0.8 },
    };
    const { container } = render(<DragGhost session={flying} onFlightEnd={onEnd} />);
    expect(ghost(container)).toHaveClass('is-flying', 'is-flying--land');
    expect(ghost(container).style.transform).toBe('translate3d(200px, 100px, 0)');
    expect(ghost(container).style.scale).toBe('0.8');
    act(() => {
      vi.advanceTimersByTime(FLIGHT_MS.land - 1);
    });
    expect(onEnd).not.toHaveBeenCalled();
    // The end of the transform ends it before the cap.
    fireEvent.transitionEnd(ghost(container), { propertyName: 'transform' });
    expect(onEnd).toHaveBeenCalledOnce();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('a flight that sends no event ends with its time and two frames', () => {
    const onEnd = vi.fn();
    const back: DragSession = { ...session, flight: { kind: 'return', x: 0, y: 0, scale: 1 } };
    render(<DragGhost session={back} onFlightEnd={onEnd} />);
    act(() => {
      vi.advanceTimersByTime(FLIGHT_MS.return);
    });
    expect(onEnd).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('the cap counts from the start of the transition too: a late transitionrun does not end the flight at the old cap (0.9.28, K6a)', () => {
    const onEnd = vi.fn();
    const flying: DragSession = {
      ...session,
      flight: { kind: 'land', x: 200, y: 100, scale: 0.8 },
    };
    const { container } = render(<DragGhost session={flying} onFlightEnd={onEnd} />);
    // The transition is born a restyle after the effect that listens for it.
    act(() => {
      vi.advanceTimersByTime(60);
    });
    fireEvent(
      ghost(container),
      Object.assign(new Event('transitionrun', { bubbles: true }), { propertyName: 'transform' })
    );
    // Past the cap counted from the effect (time + two frames): the copy is still flying.
    act(() => {
      vi.advanceTimersByTime(FLIGHT_MS.land + 40 - 60 + 20);
    });
    expect(onEnd).not.toHaveBeenCalled();
    // Landed: the end of the transform commits the release, once.
    fireEvent.transitionEnd(ghost(container), { propertyName: 'transform' });
    expect(onEnd).toHaveBeenCalledOnce();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('a transition that was born and sends no end still ends, at the cap counted from its start', () => {
    const onEnd = vi.fn();
    const flying: DragSession = {
      ...session,
      flight: { kind: 'land', x: 200, y: 100, scale: 0.8 },
    };
    const { container } = render(<DragGhost session={flying} onFlightEnd={onEnd} />);
    fireEvent(
      ghost(container),
      Object.assign(new Event('transitionrun', { bubbles: true }), { propertyName: 'scale' })
    );
    act(() => {
      vi.advanceTimersByTime(FLIGHT_MS.land + 40);
    });
    expect(onEnd).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(110);
    });
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('over the trash it stays where the finger is and shrinks away; the hint goes too', () => {
    const onEnd = vi.fn();
    const away: DragSession = {
      ...session,
      removing: true,
      flight: { kind: 'remove', x: 0, y: 0, scale: 1 },
    };
    const { container } = render(<DragGhost session={away} onFlightEnd={onEnd} />);
    expect(ghost(container)).toHaveClass('is-flying--remove', 'is-removing');
    expect(ghost(container).style.transform).toBe('translate3d(270px, 360px, 0)');
    expect(ghost(container).style.scale).toBe('');
    act(() => {
      vi.advanceTimersByTime(FLIGHT_MS.remove + 40);
    });
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('gives no hint while it flies to a cell', () => {
    const flying: DragSession = { ...session, flight: { kind: 'land', x: 200, y: 100, scale: 1 } };
    const { container } = render(<DragGhost session={flying} />);
    expect(container.querySelector('.aca-drag-ghost__hint')).toBeNull();
  });
});
