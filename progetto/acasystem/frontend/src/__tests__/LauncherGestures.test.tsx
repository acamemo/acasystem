/**
 * Simplified editing of the widgets (REP-20261008-001, increment A): the press of a second
 * that lifts a widget, the grip frame with eight dots, the trash of the widget bar as drop
 * target and the style rules that keep the selected widget above its neighbours.
 */
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RESIZE_DOTS,
  ResizeFrame,
  edgeFromPoint,
  handleName,
} from '@/components/system/edit/ResizeHandle';
import { WidgetActionBar } from '@/components/system/edit/WidgetActionBar';
import { HOLD_TOLERANCE_PX, LONG_PRESS_MS, holdTouchOnPage } from '@/hooks/launcher/gestures';
import { LONG_PRESS_MS as LONG_PRESS_OF_HOOK, useLongPress } from '@/hooks/launcher/useLongPress';
import { useWidgetDrag, type DragSession, type DragStart } from '@/hooks/launcher/useWidgetDrag';
import { DragGhost } from '@/templates/launcher/DragGhost';

class Pointer extends MouseEvent {
  pointerId: number;
  constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
    super(type, options);
    this.pointerId = options.pointerId ?? 0;
  }
}

describe('gesture timings (U1, U2)', () => {
  it('one long press of 500 ms, 14 px of tolerance (no double-tap window: the second tap has no limit)', () => {
    expect(LONG_PRESS_MS).toBe(500);
    expect(LONG_PRESS_OF_HOOK).toBe(LONG_PRESS_MS);
    expect(HOLD_TOLERANCE_PX).toBe(14);
  });
});

describe('edgeFromPoint: the side or corner taken on the grip frame', () => {
  const both = { x: true, y: true };
  const small = { left: 100, top: 100, width: 65, height: 65 };
  const large = { left: 100, top: 100, width: 230, height: 230 };

  it('on a cell of 65 px: the quarters near the corners take the corner', () => {
    expect(edgeFromPoint('n', { x: 105, y: 90 }, small, both)).toEqual({ x: -1, y: -1 });
    expect(edgeFromPoint('n', { x: 132, y: 90 }, small, both)).toEqual({ x: 0, y: -1 });
    expect(edgeFromPoint('n', { x: 160, y: 90 }, small, both)).toEqual({ x: 1, y: -1 });
    expect(edgeFromPoint('e', { x: 170, y: 132 }, small, both)).toEqual({ x: 1, y: 0 });
    expect(edgeFromPoint('s', { x: 132, y: 170 }, small, both)).toEqual({ x: 0, y: 1 });
    expect(edgeFromPoint('w', { x: 90, y: 160 }, small, both)).toEqual({ x: -1, y: 1 });
  });

  it('taken up to 32 px outside the widget it still names the nearest dot', () => {
    // Beyond the left edge on the top side: the north-west corner.
    expect(edgeFromPoint('n', { x: 68, y: 68 }, small, both)).toEqual({ x: -1, y: -1 });
    // Beyond the right edge on the bottom side: the south-east corner.
    expect(edgeFromPoint('s', { x: 197, y: 197 }, small, both)).toEqual({ x: 1, y: 1 });
  });

  it('on long sides the corner reaches at most 48 px', () => {
    expect(edgeFromPoint('n', { x: 100 + 47, y: 90 }, large, both)).toEqual({ x: -1, y: -1 });
    expect(edgeFromPoint('n', { x: 100 + 49, y: 90 }, large, both)).toEqual({ x: 0, y: -1 });
    expect(edgeFromPoint('n', { x: 330 - 47, y: 90 }, large, both)).toEqual({ x: 1, y: -1 });
    expect(edgeFromPoint('e', { x: 335, y: 100 + 60 }, large, both)).toEqual({ x: 1, y: 0 });
  });

  it('an axis that cannot be resized stays still', () => {
    expect(edgeFromPoint('n', { x: 105, y: 90 }, small, { x: false, y: true })).toEqual({
      x: 0,
      y: -1,
    });
    expect(edgeFromPoint('w', { x: 90, y: 105 }, small, { x: true, y: false })).toEqual({
      x: -1,
      y: 0,
    });
  });
});

describe('ResizeFrame: eight dots and four grip sides', () => {
  it('draws the dots clockwise from the top and the four sides, hidden from assistive technology', () => {
    const { container } = render(
      <ResizeFrame axes={{ x: true, y: true }} onPointerDown={vi.fn()} />
    );
    const frame = container.querySelector('.aca-resize-frame');
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    expect(
      Array.from(container.querySelectorAll('.aca-resize-dot')).map((dot) =>
        dot.getAttribute('data-resize-edge')
      )
    ).toEqual(RESIZE_DOTS.map(handleName));
    expect(RESIZE_DOTS.map(handleName)).toEqual(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);
    expect(
      Array.from(container.querySelectorAll('[data-resize-side]')).map((side) =>
        side.getAttribute('data-resize-side')
      )
    ).toEqual(['n', 'e', 's', 'w']);
  });

  it('a widget of fixed width has no east and west grip, and no corner dots', () => {
    const { container } = render(
      <ResizeFrame axes={{ x: false, y: true }} onPointerDown={vi.fn()} />
    );
    expect(
      Array.from(container.querySelectorAll('[data-resize-side]')).map((side) =>
        side.getAttribute('data-resize-side')
      )
    ).toEqual(['n', 's']);
    expect(
      Array.from(container.querySelectorAll('.aca-resize-dot')).map((dot) =>
        dot.getAttribute('data-resize-edge')
      )
    ).toEqual(['n', 's']);
  });

  it('a widget of one size shows the ring only', () => {
    const { container } = render(
      <ResizeFrame axes={{ x: false, y: false }} onPointerDown={vi.fn()} />
    );
    expect(container.querySelector('.aca-resize-frame')).toBeNull();
  });

  it('a pointer down on a side reports that side', () => {
    const onPointerDown = vi.fn();
    const { container } = render(
      <ResizeFrame axes={{ x: true, y: true }} onPointerDown={onPointerDown} />
    );
    fireEvent.pointerDown(container.querySelector('[data-resize-side="e"]')!);
    expect(onPointerDown).toHaveBeenCalledWith('e', expect.anything());
  });
});

describe('useWidgetDrag: the press of a second (holdMs) and the tap', () => {
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const setup = () => {
    const onActivate = vi.fn<(session: DragSession) => void>();
    const onTap = vi.fn<(start: DragStart, pointer: { x: number; y: number }) => void>();
    const onDrop = vi.fn<(session: DragSession) => void>();
    const hook = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => ({
          left: 0,
          top: 0,
          cell: 100,
          gapX: 0,
          gapY: 0,
          grid: { w: 4, h: 2 },
        }),
        getPlacements: () => ({ a: { x: 0, y: 0, w: 1, h: 1 } }),
        sizesFor: () => undefined,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
        onActivate,
        onTap,
      })
    );
    const press = (extra: Partial<DragStart> = {}) =>
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
          ...extra,
        })
      );
    const move = (x: number, y: number) => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
      act(() => vi.advanceTimersByTime(20));
    };
    return { ...hook, onActivate, onTap, onDrop, press, move };
  };

  it('a widget held does not move with a few pixels before the hold time', () => {
    const { result, press, move, onActivate } = setup();
    press({ holdMs: LONG_PRESS_MS });
    expect(result.current.pressing).toEqual({ pageId: 'home', widgetId: 'a' });
    move(56, 50);
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.session).toBeNull();
    expect(onActivate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(250));
    // Lifted where it is, with a short vibration of the copy.
    expect(result.current.session?.lifted).toBe(true);
    expect(result.current.session?.pointer).toEqual({ x: 50, y: 50 });
    expect(result.current.pressing).toBeNull();
    expect(onActivate).toHaveBeenCalledOnce();
    move(250, 150);
    expect(result.current.session?.target?.rect).toEqual({ x: 2, y: 1, w: 1, h: 1 });
    expect(onActivate).toHaveBeenCalledOnce();
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });

  it('moving beyond tolerance while holding gives the press up (the page scrolls)', () => {
    const { result, press, move, onActivate } = setup();
    press({ holdMs: LONG_PRESS_MS });
    move(70, 50);
    expect(result.current.pressing).toBeNull();
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(result.current.session).toBeNull();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('a release before the hold time is a tap, never an activation', () => {
    const { result, press, onActivate, onTap, onDrop } = setup();
    press({ holdMs: LONG_PRESS_MS });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 51, clientY: 50 });
    expect(onTap).toHaveBeenCalledOnce();
    expect(onTap.mock.calls[0][1]).toEqual({ x: 51, y: 50 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(result.current.session).toBeNull();
    expect(onActivate).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('without holdMs (a selected widget) the drag starts after a few pixels, as before', () => {
    const { result, press, move, onActivate } = setup();
    press();
    move(60, 50);
    expect(result.current.session?.lifted).toBeUndefined();
    expect(onActivate).toHaveBeenCalledOnce();
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });

  it('a widget already lifted (long press out of edit mode) is dragged at once', () => {
    const { result, press, onActivate } = setup();
    press({ lifted: true });
    expect(result.current.session?.lifted).toBe(true);
    expect(onActivate).toHaveBeenCalledOnce();
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });

  it('once lifted the touch moves do not scroll the page', () => {
    const { press } = setup();
    press({ lifted: true });
    const event = new Event('touchmove', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });
});

describe('holdTouchOnPage: the touch of a long press goes on to the drag (2026-10-21)', () => {
  const move = (target: EventTarget = window) => {
    const event = new Event('touchmove', { bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const touch = { target: null, pointerId: 3, pointerType: 'touch' };
  afterEach(() => {
    // Whatever a test left, the touch ends.
    window.dispatchEvent(new Event('touchend'));
  });

  it('cancels the touch moves from the call, not before, and gives them back at the end', () => {
    expect(move()).toBe(false);
    holdTouchOnPage(touch);
    expect(move()).toBe(true);
    window.dispatchEvent(new Event('touchend'));
    expect(move()).toBe(false);
  });

  it('is on the element pressed too, which the touch follows even when it is out of the page', () => {
    const element = document.createElement('div');
    document.body.append(element);
    holdTouchOnPage({ ...touch, target: element });
    // Detached, its touch events no longer reach the window: its own listener still sees them.
    element.remove();
    expect(move(element)).toBe(true);
    element.dispatchEvent(new Event('touchcancel'));
    expect(move(element)).toBe(false);
  });

  it('a mouse has no touch to keep: nothing is registered', () => {
    const add = vi.spyOn(window, 'addEventListener');
    holdTouchOnPage({ ...touch, pointerType: 'mouse' });
    expect(add.mock.calls.filter(([type]) => type === 'touchmove')).toHaveLength(0);
    expect(move()).toBe(false);
    add.mockRestore();
  });

  it('another finger lifting does not end it; the end of the pointer or a new press does', () => {
    holdTouchOnPage(touch);
    const other = new Event('touchend');
    Object.defineProperty(other, 'touches', { value: [{}] });
    window.dispatchEvent(other);
    expect(move()).toBe(true);
    fireEvent.pointerUp(window, { pointerId: 3 });
    expect(move()).toBe(false);
    holdTouchOnPage(touch);
    expect(move()).toBe(true);
    fireEvent.pointerDown(window, { pointerId: 4 });
    expect(move()).toBe(false);
  });
});

describe('useLongPress: duration with its progressive cue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    // Ends the guard of the click that a long press leaves on the window.
    act(() => vi.advanceTimersByTime(1000));
    vi.useRealTimers();
  });

  it('reports the hold, fires at LONG_PRESS_MS and ends the cue', () => {
    const onLongPress = vi.fn();
    const onPressChange = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, onPressChange }));
    const target = document.createElement('div');
    act(() =>
      result.current.onPointerDown({
        button: 0,
        isPrimary: true,
        target,
        pointerType: 'touch',
        pointerId: 3,
        clientX: 10,
        clientY: 10,
      } as unknown as Parameters<typeof result.current.onPointerDown>[0])
    );
    expect(onPressChange).toHaveBeenLastCalledWith(expect.objectContaining({ pointerId: 3 }));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 1));
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledOnce();
    expect(onPressChange).toHaveBeenLastCalledWith(null);
  });

  it('reports where the finger is when it fires (it drifts within the tolerance), not where it began', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));
    act(() =>
      result.current.onPointerDown({
        button: 0,
        isPrimary: true,
        target: document.createElement('div'),
        pointerType: 'touch',
        pointerId: 3,
        clientX: 10,
        clientY: 10,
      } as unknown as Parameters<typeof result.current.onPointerDown>[0])
    );
    act(() =>
      result.current.onPointerMove({
        clientX: 16,
        clientY: 12,
      } as unknown as Parameters<typeof result.current.onPointerMove>[0])
    );
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onLongPress).toHaveBeenCalledWith(
      expect.objectContaining({ pointerId: 3, clientX: 16, clientY: 12 })
    );
  });

  it('the threshold stays 0.5 s (answer of 2026-10-23) and the vibration comes at the threshold, never before or for a release before it (D-M1)', () => {
    expect(LONG_PRESS_MS).toBe(500);
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      const onLongPress = vi.fn();
      const { result } = renderHook(() => useLongPress({ onLongPress }));
      const down = {
        button: 0,
        isPrimary: true,
        target: document.createElement('div'),
        pointerType: 'touch',
        pointerId: 3,
        clientX: 10,
        clientY: 10,
      } as unknown as Parameters<typeof result.current.onPointerDown>[0];
      // A release before the threshold: no vibration, no long press, nothing counted after it.
      act(() => result.current.onPointerDown(down));
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 1));
      expect(vibrate).not.toHaveBeenCalled();
      act(() => result.current.onPointerUp());
      act(() => vi.advanceTimersByTime(2 * LONG_PRESS_MS));
      expect(vibrate).not.toHaveBeenCalled();
      expect(onLongPress).not.toHaveBeenCalled();
      // Held to the threshold: one short vibration, with the long press.
      act(() => result.current.onPointerDown(down));
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 1));
      expect(vibrate).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(vibrate).toHaveBeenCalledTimes(1);
      expect(vibrate).toHaveBeenCalledWith(10);
      expect(onLongPress).toHaveBeenCalledOnce();
    } finally {
      Reflect.deleteProperty(navigator, 'vibrate');
    }
  });

  describe('the click that follows a long press (G2, REP-20261021-003)', () => {
    /** A long press on `pressed`; returns what the page sees of the clicks that come next. */
    const holdOn = (pressed: HTMLElement, pointerId = 3) => {
      const { result } = renderHook(() => useLongPress({ onLongPress: vi.fn() }));
      act(() =>
        result.current.onPointerDown({
          button: 0,
          isPrimary: true,
          target: pressed,
          pointerType: 'touch',
          pointerId,
          clientX: 10,
          clientY: 10,
        } as unknown as Parameters<typeof result.current.onPointerDown>[0])
      );
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    };
    const scene = () => {
      document.body.innerHTML =
        '<section id="page"><button id="held"></button></section><button id="other"></button>';
      const held = document.getElementById('held')!;
      const other = document.getElementById('other')!;
      const reached: string[] = [];
      for (const element of [held, other]) {
        element.addEventListener('click', () => reached.push(element.id));
      }
      return { held, other, reached, page: document.getElementById('page')! };
    };
    /** A click as the browser makes it: from the pointer that was released. */
    const clickOf = (target: Element, pointerId?: number) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      if (pointerId !== undefined) Object.assign(event, { pointerId });
      target.dispatchEvent(event);
      return event;
    };
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('swallows the click of the release of the pressed target, once', () => {
      const { held, reached } = scene();
      holdOn(held);
      expect(clickOf(held, 3).defaultPrevented).toBe(true);
      expect(reached).toEqual([]);
      // Only that one.
      clickOf(held, 3);
      expect(reached).toEqual(['held']);
    });

    it('swallows the click that lands on an ancestor of the pressed target (the pointer left it)', () => {
      const { held, page, reached } = scene();
      page.addEventListener('click', () => reached.push('page'));
      holdOn(held);
      clickOf(page, 3);
      expect(reached).toEqual([]);
    });

    it('swallows the click of the same pointer on another target (the overview put a card under the finger)', () => {
      const { held, other, reached } = scene();
      holdOn(held);
      expect(clickOf(other, 3).defaultPrevented).toBe(true);
      expect(reached).toEqual([]);
      // Only that one: the next touch is a new gesture and acts.
      fireEvent.pointerDown(other, { pointerId: 5 });
      clickOf(other, 5);
      expect(reached).toEqual(['other']);
    });

    it('lets through a click without a pointer (keyboard, script) on another target', () => {
      const { held, other, reached } = scene();
      holdOn(held);
      clickOf(other);
      expect(reached).toEqual(['other']);
    });

    it('lets through the click of another pointer', () => {
      const { held, reached } = scene();
      holdOn(held, 3);
      clickOf(held, 9);
      expect(reached).toEqual(['held']);
    });

    it('lets through the click of a new press, on the target that was held too', () => {
      const { held, reached } = scene();
      holdOn(held);
      // The finger comes up without a click (it moved), then touches the same button again.
      fireEvent.pointerDown(held, { pointerId: 4 });
      clickOf(held, 4);
      expect(reached).toEqual(['held']);
    });

    /** The finger `pointerId` comes up, as the browser reports it before the click. */
    const lift = (
      target: Element,
      pointerId = 3,
      type: 'pointerup' | 'pointercancel' = 'pointerup'
    ) =>
      act(() => {
        const event = new MouseEvent(type, { bubbles: true });
        Object.assign(event, { pointerId });
        target.dispatchEvent(event);
      });

    it.each([700, 1500, 2500, 5000])(
      'keeps guarding while the finger is down: a hold of %i ms after the press, then its release click',
      (heldMs) => {
        const { held, other, reached } = scene();
        holdOn(held);
        act(() => vi.advanceTimersByTime(heldMs));
        lift(other);
        expect(clickOf(other, 3).defaultPrevented).toBe(true);
        expect(reached).toEqual([]);
      }
    );

    it('swallows the release of a very long drag that ends over another target', () => {
      const { held, other, reached } = scene();
      holdOn(held);
      // The finger drags for seconds: moves reach the page, nothing else.
      for (let step = 0; step < 25; step++) {
        act(() => vi.advanceTimersByTime(100));
        other.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
      }
      lift(other);
      clickOf(other, 3);
      expect(reached).toEqual([]);
    });

    it('stops guarding 600 ms after the release when no click comes', () => {
      const { held, reached } = scene();
      holdOn(held);
      act(() => vi.advanceTimersByTime(3000));
      lift(held);
      act(() => vi.advanceTimersByTime(599));
      act(() => vi.advanceTimersByTime(1));
      clickOf(held, 3);
      expect(reached).toEqual(['held']);
    });

    it('a pointercancel of the same finger also starts the short window', () => {
      const { held, reached } = scene();
      holdOn(held);
      lift(held, 3, 'pointercancel');
      act(() => vi.advanceTimersByTime(600));
      clickOf(held, 3);
      expect(reached).toEqual(['held']);
    });

    it('the lift of another finger does not start the window: the held one is still down', () => {
      const { held, other, reached } = scene();
      holdOn(held);
      lift(other, 9);
      act(() => vi.advanceTimersByTime(5000));
      clickOf(other, 3);
      expect(reached).toEqual([]);
    });

    it('a click without a pointer after a long hold keeps the rule of the target', () => {
      const { held, other, reached } = scene();
      holdOn(held);
      act(() => vi.advanceTimersByTime(5000));
      clickOf(other);
      expect(reached).toEqual(['other']);
    });

    it('still swallows the release when the pressed target went from the page (the overview redraws it)', () => {
      const { held, other, reached } = scene();
      holdOn(held);
      held.remove();
      clickOf(other, 3);
      expect(reached).toEqual([]);
    });
  });
});

describe('WidgetActionBar: the trash as drop target (U3, U5)', () => {
  const bar = (drop: 'none' | 'ready' | 'armed') =>
    render(
      <WidgetActionBar
        hidden={false}
        name="Luce"
        changed={false}
        onDone={vi.fn()}
        onUndo={vi.fn()}
        onRemove={vi.fn()}
        drop={drop}
      />
    );

  it('while a widget is moved only the «Rimuovi» pill stays; with the finger over it, it is armed', () => {
    const { container, rerender } = bar('ready');
    const toolbar = container.querySelector<HTMLElement>('.aca-widget-actions')!;
    expect(toolbar.dataset.drop).toBe('ready');
    expect(toolbar.querySelector('.aca-widget-actions--drop')).not.toBeNull();
    expect(toolbar.querySelector('[data-widget-action="remove"]')).toHaveTextContent('Rimuovi');
    // «Annulla» and «Fine» stay in the row, fading out in place: the group keeps its width (D-M14).
    expect(toolbar.querySelector('.aca-widget-actions__rest')).toHaveAttribute('inert');
    expect(toolbar.querySelector('[data-widget-action="done"]')).not.toHaveAttribute('hidden');
    rerender(
      <WidgetActionBar
        hidden={false}
        name="Luce"
        changed={false}
        onDone={vi.fn()}
        onUndo={vi.fn()}
        onRemove={vi.fn()}
        drop="armed"
      />
    );
    expect(toolbar.dataset.drop).toBe('armed');
    expect(toolbar.querySelector('.aca-widget-actions--drop')).toHaveClass('is-armed');
  });

  it('at rest the trash is an icon, Annulla and Fine are shown', () => {
    const { container } = bar('none');
    const toolbar = container.querySelector<HTMLElement>('.aca-widget-actions')!;
    expect(toolbar.querySelector('[data-widget-action="remove"]')).not.toHaveTextContent('Rimuovi');
    expect(toolbar.querySelector('[data-widget-action="done"]')).not.toHaveAttribute('hidden');
    expect(toolbar.querySelector('.aca-widget-actions__rest')).not.toHaveAttribute('inert');
  });
});

describe('DragGhost over the trash', () => {
  it('shrinks around the finger and says that a release removes the widget', () => {
    const session: DragSession = {
      mode: 'move',
      edge: { x: 1, y: 1 },
      widgetId: 'a',
      label: 'Luce',
      sourcePageId: 'home',
      origin: { x: 0, y: 0, w: 1, h: 1 },
      box: { width: 100, height: 100 },
      offset: { x: 30, y: 40 },
      start: { x: 30, y: 40 },
      pointer: { x: 300, y: 700 },
      target: null,
      removing: true,
    };
    const { container } = render(<DragGhost session={session} />);
    const ghost = container.querySelector<HTMLElement>('.aca-drag-ghost')!;
    expect(ghost).toHaveClass('is-removing');
    expect(ghost.style.getPropertyValue('--aca-grab-x')).toBe('30px');
    expect(ghost).toHaveTextContent('Rilascia per rimuovere');
  });

  it('lifted by the press of a second the copy takes over from the held widget (is-lifting)', () => {
    const session: DragSession = {
      mode: 'move',
      edge: { x: 1, y: 1 },
      widgetId: 'a',
      label: 'Luce',
      sourcePageId: 'home',
      origin: { x: 0, y: 0, w: 1, h: 1 },
      box: { width: 100, height: 100 },
      offset: { x: 30, y: 40 },
      start: { x: 30, y: 40 },
      pointer: { x: 30, y: 40 },
      target: null,
      lifted: true,
    };
    const { container } = render(<DragGhost session={session} />);
    expect(container.querySelector('.aca-drag-ghost')).toHaveClass('is-lifting');
  });
});

describe('style of the selection, the dots and the hold', () => {
  const css: Record<string, string> = {};
  beforeAll(async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    for (const [key, path] of Object.entries({
      edit: 'src/components/system/edit/edit.css',
      launcher: 'src/templates/launcher/launcher.css',
    })) {
      css[key] = fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    }
  });
  const rule = (file: string, selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css[file])?.[1] ?? '';
  };

  it('the selected widget is above its neighbours, with a named layer', () => {
    expect(rule('launcher', '.aca-launcher-widget.is-selected')).toMatch(
      /z-index:\s*var\(--aca-layer-handle\);/
    );
    expect(css.edit).not.toMatch(/z-index:\s*\d/);
  });

  it('a widget in use leaves the touch to its commands: no selection, callout or picture drag (G1)', () => {
    const own = rule('launcher', '.aca-launcher-widget:not(.is-editing)');
    expect(own).toMatch(/user-select:\s*none;/);
    expect(own).toMatch(/-webkit-touch-callout:\s*none;/);
    expect(rule('launcher', '.aca-launcher-widget:not(.is-editing) :is(img, a)')).toMatch(
      /-webkit-user-drag:\s*none;/
    );
    // A field in a widget keeps selection and paste.
    expect(
      rule(
        'launcher',
        ".aca-launcher-widget:not(.is-editing) :is(input:not([type='range']), textarea)"
      )
    ).toMatch(/user-select:\s*text;/);
  });

  it('ring and dots share one colour token', () => {
    expect(rule('launcher', '.aca-launcher-grid')).toMatch(/--aca-selection:\s*var\(--aca-blue\);/);
    expect(rule('launcher', '.aca-launcher-widget.is-selected::after')).toMatch(
      /border:\s*2px solid var\(--aca-selection\);/
    );
    expect(rule('edit', '.aca-resize-dot')).toMatch(/background:\s*var\(--aca-selection\);/);
  });

  it('the dots have reduced-motion and forced-colors rules', () => {
    expect(css.edit).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.aca-resize-dot \{\s*transition: opacity 120ms linear;/
    );
    expect(css.edit).toMatch(
      /@media \(forced-colors: active\) \{\s*\.aca-resize-dot \{[^}]*background: Highlight;/
    );
  });

  describe('the page overview moves by transform alone (REP-20261009-003)', () => {
    const cards = '.aca-pager:is(.is-overview, .is-closing)';
    const timing = 'var(--aca-overview-ms) var(--aca-overview-ease)';

    it('has one time and one curve, both literal', () => {
      expect(css.launcher).toMatch(/--aca-overview-ms:\s*360ms;/);
      expect(css.launcher).toMatch(/--aca-overview-ease:\s*cubic-bezier\(0\.23, 1, 0\.32, 1\);/);
      // Every part that moves with the overview takes both from the tokens, and only those.
      const page = rule('launcher', `${cards} > .aca-pager__page`);
      // The cards come after the empty cells, by --aca-card-delay (D-M3, D-M25); a card that comes
      // in (a page added) fades in the time of a small entrance (D-M24), from the tokens.
      expect(page).toContain(`translate ${timing} var(--aca-card-delay)`);
      const entering =
        'opacity var(--aca-dur-enter-sm, 240ms) var(--aca-motion-ease-out, var(--aca-overview-ease))';
      expect(page).toContain(entering);
      const body = rule('launcher', `${cards} > .aca-pager__page > .aca-pager__body`);
      for (const property of ['scale', 'translate']) {
        expect(body).toContain(`${property} ${timing} var(--aca-card-delay)`);
      }
      expect(body).toContain(`opacity ${timing}`);
      // Radius and shadow are not animated (REP-20261012-003): see the shadow shapes below.
      expect(/transition:([^;]*);/.exec(body)?.[1]).not.toMatch(/border-radius|box-shadow/);
      const own = `${page}\n${body}`.split(entering).join('').split(timing).join('');
      expect(own).not.toMatch(/\d+ms/);
      expect(own).not.toMatch(/cubic-bezier|ease-(?:in|out)|linear/);
    });

    it('never changes the box of a page: no width, padding or spacer, only transforms', () => {
      const page = rule('launcher', `${cards} > .aca-pager__page`);
      expect(page).not.toMatch(/flex-basis|\bwidth:|\bheight:|padding|margin|\bgap\b/);
      expect(page).toMatch(/\btranslate:\s*calc\(/);
      expect(page).toMatch(/\btransform:\s*translateX\(calc\(var\(--aca-o, 0\) \* -100%\)\);/);
      // Pages are a full pager wide, in the row and in the overview.
      expect(rule('launcher', '.aca-pager__page')).toMatch(/flex:\s*0 0 100%;/);
      expect(css.launcher).not.toMatch(/transition:[^;]*(?:flex-basis|padding)/);
      // No pseudo-element of the pager or of a page: the only ones are the shadow shapes of the body
      // (REP-20261012-003), which sit out of the flow and only fade.
      const pseudos = [...css.launcher.matchAll(/(\.aca-pager[^{,]*)::(?:before|after)/g)];
      expect(pseudos.length).toBeGreaterThan(0);
      for (const [, selector] of pseudos) expect(selector.trim()).toMatch(/\.aca-pager__body$/);
      // The layer of the gaps (REP-20261019-002, N3) is an element out of the flow: no room.
      expect(rule('launcher', '.aca-pager__surface')).toMatch(/position:\s*absolute;/);
      // The card is the body scaled; the rest of the page does not scale.
      expect(rule('launcher', `${cards} > .aca-pager__page > .aca-pager__body`)).toMatch(
        /\bscale:\s*var\(--aca-overview-k, 0\.72\);/
      );
    });

    it('a page in the row is cancelled out: transform and translate, the same distance', () => {
      const away = rule('launcher', '.aca-pager__page:not(.is-current)');
      expect(away).toMatch(/transform:\s*translateX\(calc\(var\(--aca-o, 0\) \* -100%\)\);/);
      expect(away).toMatch(/\btranslate:\s*calc\(var\(--aca-o, 0\) \* 100%\);/);
    });

    it('the browser does not scroll the cards: the pointer moves them', () => {
      const locked = rule('launcher', cards);
      expect(locked).toMatch(/overflow-x:\s*hidden;/);
      expect(locked).toMatch(/scroll-snap-type:\s*none;/);
      // The touch action is not on the pager (Blink hands it to every element below, and a change
      // restyled them all): a layer under the pages carries it for the gaps, and the opener and
      // the controls carry their own (REP-20261019-002, N3).
      expect(locked).not.toMatch(/touch-action/);
      expect(rule('launcher', '.aca-pager__surface')).toMatch(/touch-action:\s*none;/);
      expect(rule('launcher', '.aca-pager__open')).toMatch(/touch-action:\s*none;/);
      expect(rule('launcher', '.aca-pager__footer')).toMatch(/touch-action:\s*none;/);
      // The boxes of the pages overlap: only the opener and the controls take the pointer. The
      // page says so in every state, so the overview does not change it.
      expect(rule('launcher', '.aca-pager__page')).toMatch(/pointer-events:\s*none;/);
      expect(rule('launcher', `${cards} > .aca-pager__page`)).not.toMatch(/pointer-events/);
      expect(rule('launcher', '.aca-pager__open')).toMatch(/pointer-events:\s*auto;/);
      expect(rule('launcher', '.aca-pager__footer')).toMatch(/pointer-events:\s*auto;/);
      // While the cards follow the pointer they have no transition: no lag.
      expect(rule('launcher', '.aca-pager[data-panning] > .aca-pager__page')).toMatch(
        /transition:\s*none;/
      );
    });

    it('closing goes back to the places of the pages in the row, at their own size', () => {
      expect(rule('launcher', '.aca-pager.is-closing > .aca-pager__page')).toMatch(
        /translate:\s*calc\(var\(--aca-d, 0\) \* 100%\);/
      );
      expect(
        rule('launcher', '.aca-pager.is-closing > .aca-pager__page > .aca-pager__body')
      ).toMatch(/scale:\s*1;/);
    });

    it('with reduced motion the cards go and come without a transition', () => {
      expect(css.launcher).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{\s*\.aca-pager__body,\s*\.aca-pager:is\(\.is-overview, \.is-closing\) > \.aca-pager__page,\s*\.aca-pager:is\(\.is-overview, \.is-closing\) > \.aca-pager__page > \.aca-pager__body \{\s*transition: none;/
      );
    });

    it('the controls under a card come last, five gaps after T0, once the body is clear of them (D-M3)', () => {
      // Hidden by default and shown with the overview: a footer that React moves in the DOM does
      // not start from nothing again (the arrows, D-M24), as it did with @starting-style.
      expect(rule('launcher', '.aca-pager__footer')).toMatch(/\bopacity:\s*0;/);
      const shown = rule('launcher', '.aca-pager.is-overview .aca-pager__footer');
      expect(shown).toMatch(/\bopacity:\s*1;/);
      expect(shown).toMatch(
        /transition:\s*opacity var\(--aca-dur-fade-in, 180ms\) var\(--aca-motion-ease-out, ease-out\)\s*calc\(var\(--aca-stagger, 40ms\) \* 5\);/
      );
      expect(css.launcher).not.toMatch(/\.aca-pager__footer[^{]*\{[^}]*@starting-style/);
    });
  });

  it('the page overview hides the grip frame and the dots', () => {
    expect(
      rule('launcher', '.aca-pager.is-overview :is(.aca-resize-frame, .aca-resize-dot)')
    ).toMatch(/display:\s*none/);
  });

  it('the dots of a selected stack rise above the bottom dot', () => {
    expect(rule('launcher', '.aca-launcher-widget.is-selected .aca-stack__dots')).toMatch(
      /bottom:\s*calc\(var\(--aca-space-1\) \+ 0\.5rem\)/
    );
  });

  it("in edit mode the finger on a widget is the widget's at once, selected or not (G5)", () => {
    expect(rule('launcher', '.aca-launcher-widget__handle')).toMatch(/touch-action:\s*none;/);
    expect(rule('launcher', '.aca-launcher-widget__handle')).not.toMatch(/pan-x/);
  });

  it('the hold lasts --aca-hold-ms and is still with reduced motion', () => {
    // On :root, since the floating copy is drawn outside the shell (REP-20261009-004).
    expect(css.launcher).toMatch(
      /:root \{\s*--aca-hold-ms:\s*500ms;\s*--aca-hold-delay:\s*60ms;\s*--aca-hold-scale:\s*0\.9;\s*\}/
    );
    // The cue waits a tap's time, then shrinks evenly until the end of the hold.
    expect(pressingRule()).toMatch(
      /scale calc\(var\(--aca-hold-ms\) - var\(--aca-hold-delay\)\) linear var\(--aca-hold-delay\)/
    );
    expect(css.launcher).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-launcher-widget\.is-pressing\s*> :is\(\.aca-launcher-widget__frame, \.aca-launcher-widget__bare\) \{\s*scale: 1;/
    );
  });

  // The picture shrinks, not the box: the handle that takes the touch keeps its size, so a slow
  // tap near the edge still ends on it (REP-20261009-004).
  const pressingRule = () =>
    /\.aca-launcher-widget\.is-pressing\s*> :is\(\.aca-launcher-widget__frame, \.aca-launcher-widget__bare\) \{([^}]*)\}/.exec(
      css.launcher
    )?.[1] ?? '';

  it('a held widget only shrinks: no shift, growth, shadow, tilt or shake', () => {
    const pressing = pressingRule();
    expect(pressing).toMatch(/scale:\s*var\(--aca-hold-scale, 0\.9\);/);
    expect(pressing).not.toMatch(/box-shadow:|rotate|animation|transform/);
    // The box itself is not scaled by the press.
    expect(css.launcher).not.toMatch(/\.aca-launcher-widget\.is-pressing \{/);
    // Placed with `translate`, so the scale of the press turns around the centre of the box.
    // (the rule is shared by the widget, the free cell and the drop preview; the last closes it)
    const placed = rule('launcher', '.aca-launcher-drop.aca-m');
    expect(placed).toMatch(/\btranslate:\s*calc\(var\(--aca-lx\)/);
    expect(placed).not.toMatch(/\btransform:/);
    expect(rule('launcher', '.aca-launcher-widget')).toMatch(/\btranslate 240ms/);
    // Nothing wiggles in edit mode (2026-10-23), and the shake of the selected one is gone too.
    expect(css.launcher).not.toMatch(/aca-wiggle/);
    expect(css.launcher).not.toMatch(/is-selected:has\(> \.aca-launcher-widget__handle:active\)/);
  });

  it('a card held in the page overview shows nothing until it lifts, then grows by 5 %; the page held on its empty part does not shrink until the long press (0.9.28, D-M2)', () => {
    // No rule for a card being held: the press is counted (usePageDrag), the card does not change.
    expect(css.launcher).not.toMatch(/\.is-pressing\s*>\s*\.aca-pager__body/);
    expect(css.launcher).not.toMatch(/\.aca-pager__page\.is-pressing/);
    // Lifted, it grows to --aca-scale-lift (1.05, within the 10 % of the user's answer), not beyond.
    expect(
      rule('launcher', '.aca-pager.is-overview > .aca-pager__page.is-lifted > .aca-pager__body')
    ).toMatch(/scale:\s*calc\(var\(--aca-overview-k, 0\.72\) \* var\(--aca-scale-lift, 1\.05\)\);/);
    // No rule of the pager shrinks the current page for the length of a press.
    expect(css.launcher).not.toMatch(/\.aca-pager\.is-pressing/);
  });

  it('a pressed «+» cell goes down to 0.93 by `scale` alone: no rotation, no dip, no keyframes; it dims only with reduced motion (0.9.28, D-M4)', () => {
    const pressed = rule('launcher', '.aca-launcher-cell.aca-m.is-pressed');
    expect(pressed).toMatch(/scale:\s*var\(--aca-scale-press, 0\.93\);/);
    expect(pressed).toMatch(/scale var\(--aca-dur-press, 120ms\)/);
    expect(pressed).not.toMatch(/rotate|translate|animation|transform|width|height|margin/);
    // It comes back more slowly than it went (180 against 120 ms), on a transition: no snap.
    expect(css.launcher).toMatch(
      /\.aca-launcher-cell\.aca-m \{\s*transition:[^}]*scale var\(--aca-dur-press-out, 180ms\)/
    );
    // The tap cue of the first 0.9.28 is gone: no animation, no rotation of the «+», no :active scale.
    expect(css.launcher).not.toMatch(/aca-cell-tap|is-tapped|rotate:\s*90deg/);
    expect(css.launcher).not.toMatch(/\.aca-launcher-cell\.aca-m:active/);
    // Reduced: no scale, the cell only dims.
    expect(css.launcher).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-launcher-cell\.aca-m\.is-pressed \{\s*scale: 1;\s*transition: opacity var\(--aca-dur-reduced, 120ms\) linear;/
    );
    expect(css.launcher).toMatch(/\.aca-launcher-cell\.aca-m\.is-pressed \{\s*opacity: 0\.7;/);
  });

  it('the copy is born at the size of the widget and grows by 4 % in 150 ms, keeping still: no shake, no held scale; still if reduced (block 3, D-M9)', () => {
    // Born at scale 1 (the top-level @starting-style), not at the held 0.9 of before: no jump.
    expect(css.launcher).toMatch(
      /@starting-style\s*\{\s*\.aca-drag-ghost__copy,\s*\.aca-drag-ghost__frame\.aca-m--card\s*\{\s*scale: 1;/
    );
    const base =
      /\.aca-drag-ghost__copy,\s*\.aca-drag-ghost__frame\.aca-m--card \{\s*scale: var\(--aca-scale-drag, 1\.04\);[^}]*\}/.exec(
        css.launcher
      );
    expect(base?.[0]).toMatch(/scale var\(--aca-dur-lift, 150ms\)/);
    // Its shadow is a layer that fades in with it, never a box-shadow in a transition (D-M17).
    expect(base?.[0]).not.toMatch(/box-shadow/);
    expect(css.launcher).not.toMatch(/is-lifting/);
    expect(rule('launcher', '.aca-drag-ghost__copy::before')).toMatch(
      /box-shadow: 0\.6rem 1rem 1\.6rem rgb\(5 5 5 \/ 18%\);/
    );
    expect(rule('launcher', '.aca-drag-ghost__copy::before')).toMatch(/transition: opacity/);
    // The card of the overview does not shake either: lifted, it grows by 5 % and keeps still.
    expect(css.launcher).not.toMatch(/aca-hold-shake/);
    expect(
      rule('launcher', '.aca-pager.is-overview > .aca-pager__page.is-lifted > .aca-pager__body')
    ).not.toMatch(/animation|rotate/);
    expect(css.launcher).not.toMatch(/rotate:\s*1\.5deg/);
    expect(css.launcher).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-drag-ghost\.is-removing :is\([^)]*\) \{\s*scale: 1;\s*transition: none;/
    );
  });

  it('every eased motion of the launcher has a literal fallback for its curve', () => {
    // --aca-ease-* live on .aca-m only; the copy and the widgets sit outside it.
    expect(css.launcher).not.toMatch(/var\(--aca-ease-(?:out|in-out)\)/);
  });

  it('a card of the page overview is moved by the pointer, selects no text, and is still with reduced motion', () => {
    expect(rule('launcher', '.aca-pager__open')).toMatch(/touch-action:\s*none;/);
    expect(rule('launcher', '.aca-pager__open')).toMatch(/user-select:\s*none;/);
    expect(css.launcher).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-pager\.is-overview > \.aca-pager__page\.is-lifted > \.aca-pager__body \{\s*scale: var\(--aca-overview-k, 0\.72\);\s*transition: none;/
    );
  });

  it('no rule of the removed zone, knobs or move controls is left', () => {
    expect(css.edit).not.toMatch(/aca-remove-zone|aca-widget-knob|aca-resize-band/);
    expect(css.edit).not.toMatch(/aca-widget-position/);
  });
});
