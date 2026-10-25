/**
 * Moving the cards of the page overview with the pointer (REP-20261009-003): the distance goes
 * to --aca-overview-pan, and on release the card nearest the centre (a flick counts) becomes the
 * centre. No scroll is involved, so the browser must not be left to take the gesture.
 */
import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { PAN_VAR, useOverviewPan, type OverviewPanOptions } from '@/hooks/launcher/useOverviewPan';

class Pointer extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
    super(type, options);
    this.pointerId = options.pointerId ?? 0;
    this.pointerType = 'touch';
  }
}

const PITCH = 300;

describe('moving the cards of the page overview', () => {
  let element: HTMLDivElement;
  let now = 0;
  let onSettle: Mock<(index: number) => void>;
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('PointerEvent', Pointer);
    // The frames are run by the test, and so is time.
    frames = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      delete frames[id - 1];
    });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    now = 0;
    element = document.createElement('div');
    // The cards are the children of the pager; the pan is written on each (REP-20261012-003).
    for (let card = 0; card < 5; card++) element.appendChild(document.createElement('section'));
    document.body.appendChild(element);
    onSettle = vi.fn<(index: number) => void>();
  });
  afterEach(() => {
    element.remove();
    // The guards against the click of a pan end with their timer.
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** The pan as the card at `card` reads it. */
  const pan = (card = 0) => (element.children[card] as HTMLElement).style.getPropertyValue(PAN_VAR);

  /** The hook with the centre on card `index` of 5, and the press that starts the pan. */
  const press = (index: number, extra: Partial<OverviewPanOptions> = {}) => {
    const { result } = renderHook(() =>
      useOverviewPan({
        element: { current: element },
        enabled: true,
        count: 5,
        getPitch: () => PITCH,
        getIndex: () => index,
        isBlocked: () => false,
        onSettle,
        ...extra,
      })
    );
    act(() => {
      result.current({
        pointerType: 'touch',
        pointerId: 1,
        button: 0,
        clientX: 500,
        clientY: 200,
      } as never);
    });
  };
  const move = (clientX: number, clientY = 200, at = now) => {
    now = at;
    act(() => {
      window.dispatchEvent(new Pointer('pointermove', { pointerId: 1, clientX, clientY }));
      // The frame that follows writes the pan.
      for (const frame of frames.splice(0)) frame?.(now);
    });
  };
  const lift = (clientX: number) => {
    act(() => {
      window.dispatchEvent(new Pointer('pointerup', { pointerId: 1, clientX, clientY: 200 }));
    });
  };

  it('follows the pointer once past the tolerance, from where the pan began', () => {
    press(2);
    move(504);
    // Within the 8 px of a tap: nothing moves.
    expect(element).not.toHaveAttribute('data-panning');
    move(480);
    expect(element).toHaveAttribute('data-panning');
    expect(pan()).toBe('0px');
    move(380, 200, 40);
    expect(pan()).toBe('-100px');
    lift(380);
  });

  it('tells the pan once a frame, and 0 when the cards go back to rest (the pages in view, ISSUE-109 R2)', () => {
    const onPan = vi.fn<(pan: number) => void>();
    press(2, { onPan });
    move(480);
    expect(onPan).not.toHaveBeenCalledWith(-100);
    move(380, 200, 40);
    expect(onPan).toHaveBeenLastCalledWith(-100);
    lift(380);
    expect(onPan).toHaveBeenLastCalledWith(0);
  });

  it('writes the pan on every card and none on the pager, so only the cards restyle', () => {
    press(2);
    move(480);
    move(380, 200, 40);
    for (let card = 0; card < 5; card++) expect(pan(card)).toBe('-100px');
    expect(element.style.getPropertyValue(PAN_VAR)).toBe('');
    lift(380);
    for (let card = 0; card < 5; card++) expect(pan(card)).toBe('');
  });

  it('writes nothing on the layer of the gaps, which is a child of the pager and no card (REP-20261019-002)', () => {
    // It comes first in the overview (Pager.tsx): the cards are the ones after it.
    const gaps = document.createElement('div');
    gaps.className = 'aca-pager__surface';
    element.prepend(gaps);
    press(2);
    move(480);
    move(380, 200, 40);
    expect(gaps.style.getPropertyValue(PAN_VAR)).toBe('');
    for (let card = 1; card <= 5; card++) expect(pan(card)).toBe('-100px');
    lift(380);
    expect(gaps.getAttribute('style')).toBeNull();
    for (let card = 1; card <= 5; card++) expect(pan(card)).toBe('');
  });

  it('on release the centre is the card nearest it, and the pan is cleared in the same step', () => {
    press(2);
    move(480);
    move(300, 200, 400);
    move(320, 200, 800);
    lift(320);
    // 160 px to the left of where it began: past half a card (150 px).
    expect(onSettle).toHaveBeenCalledWith(3);
    expect(element).not.toHaveAttribute('data-panning');
    expect(pan()).toBe('');
  });

  it('the pan is already cleared when the new centre is laid out, so the cards glide from the finger', () => {
    const seen: [boolean, string][] = [];
    onSettle.mockImplementation(() => seen.push([element.hasAttribute('data-panning'), pan()]));
    press(2);
    move(480);
    move(300, 200, 400);
    move(320, 200, 800);
    lift(320);
    expect(seen).toEqual([[false, '']]);
  });

  it('the overview closing in the middle of a pan leaves the cards at rest and chooses none', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useOverviewPan({
          element: { current: element },
          enabled,
          count: 5,
          getPitch: () => PITCH,
          getIndex: () => 2,
          isBlocked: () => false,
          onSettle,
        }),
      { initialProps: { enabled: true } }
    );
    act(() => {
      result.current({
        pointerType: 'touch',
        pointerId: 1,
        button: 0,
        clientX: 500,
        clientY: 200,
      } as never);
    });
    move(480);
    move(100, 200, 100);
    expect(element).toHaveAttribute('data-panning');
    rerender({ enabled: false });
    expect(element).not.toHaveAttribute('data-panning');
    expect(pan()).toBe('');
    lift(100);
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('less than half a card and slowly stays on the card it began on', () => {
    press(2);
    move(480);
    move(420, 200, 600);
    lift(420);
    expect(onSettle).not.toHaveBeenCalled();
    expect(element).not.toHaveAttribute('data-panning');
  });

  it('a quick flick turns one card, however short', () => {
    press(2);
    move(480, 200, 0);
    move(470, 200, 10);
    move(462, 200, 20);
    lift(462);
    // 18 px in 20 ms: far from half a card, but past 0.4 px per ms.
    expect(onSettle).toHaveBeenCalledWith(3);
    onSettle.mockClear();
    press(2);
    move(520, 200, 0);
    move(530, 200, 10);
    move(538, 200, 20);
    lift(538);
    expect(onSettle).toHaveBeenCalledWith(1);
  });

  it('a finger that stopped before it let go carries nothing', () => {
    press(2);
    move(480, 200, 0);
    move(430, 200, 40);
    move(420, 200, 60);
    now = 400;
    lift(420);
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('never goes past the first or the last card', () => {
    press(0);
    move(480);
    move(900, 200, 600);
    lift(900);
    expect(onSettle).not.toHaveBeenCalled();
    // Pulled past the first card it gives way only by a part of the finger (400 px -> 120 px).
    press(0);
    move(480);
    move(900, 200, 600);
    expect(parseFloat(pan())).toBeCloseTo(126);
    lift(900);
    onSettle.mockClear();
    press(4);
    move(480);
    move(0, 200, 600);
    lift(0);
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('up or down is no pan', () => {
    press(2);
    move(500, 260);
    move(300, 260, 100);
    expect(element).not.toHaveAttribute('data-panning');
    lift(300);
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('leaves the pointer to a card being dragged to a new place', () => {
    let blocked = false;
    press(2, { isBlocked: () => blocked });
    blocked = true;
    move(300);
    move(100, 200, 100);
    expect(element).not.toHaveAttribute('data-panning');
    lift(100);
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('goes back to rest when the pointer is taken in the middle of a pan', () => {
    let blocked = false;
    press(2, { isBlocked: () => blocked });
    move(480);
    move(380, 200, 40);
    expect(element).toHaveAttribute('data-panning');
    expect(pan()).toBe('-100px');
    blocked = true;
    move(300, 200, 80);
    expect(element).not.toHaveAttribute('data-panning');
    expect(pan()).toBe('');
    lift(300);
    expect(onSettle).not.toHaveBeenCalled();
  });

  it('does nothing outside the overview, and for a secondary mouse button', () => {
    const start = (enabled: boolean, pointerType: string, button: number) => {
      const { result } = renderHook(() =>
        useOverviewPan({
          element: { current: element },
          enabled,
          count: 5,
          getPitch: () => PITCH,
          getIndex: () => 2,
          isBlocked: () => false,
          onSettle,
        })
      );
      act(() => {
        result.current({ pointerType, pointerId: 1, button, clientX: 500, clientY: 200 } as never);
      });
      move(400);
      move(100, 200, 100);
    };
    start(false, 'touch', 0);
    expect(element).not.toHaveAttribute('data-panning');
    start(true, 'mouse', 2);
    expect(element).not.toHaveAttribute('data-panning');
  });

  it('a cancelled gesture goes back to rest without choosing a card', () => {
    press(2);
    move(480);
    move(100, 200, 100);
    expect(element).toHaveAttribute('data-panning');
    act(() => {
      window.dispatchEvent(new Pointer('pointercancel', { pointerId: 1 }));
    });
    expect(onSettle).not.toHaveBeenCalled();
    expect(element).not.toHaveAttribute('data-panning');
    expect(pan()).toBe('');
  });

  it('the click that ends a pan does not reach the card under the finger', () => {
    press(2);
    move(480);
    move(300, 200, 400);
    lift(300);
    const onClick = vi.fn();
    document.body.addEventListener('click', onClick);
    fireEvent.click(element);
    document.body.removeEventListener('click', onClick);
    expect(onClick).not.toHaveBeenCalled();
    // A plain tap is not swallowed (the guard of the last pan is gone after a moment).
    act(() => {
      vi.advanceTimersByTime(60);
    });
    press(2);
    lift(500);
    document.body.addEventListener('click', onClick);
    fireEvent.click(element);
    document.body.removeEventListener('click', onClick);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a tip open on a control is told that the cards move (it hides on a scroll)', () => {
    const onScroll = vi.fn();
    window.addEventListener('scroll', onScroll, true);
    press(2);
    move(480);
    window.removeEventListener('scroll', onScroll, true);
    expect(onScroll).toHaveBeenCalledTimes(1);
  });
});
