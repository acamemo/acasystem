/**
 * The pager and the restyles of the pages view (ISSUE-062, REP-20261019-002, N1-N4): what used to
 * be a rule of the stylesheet over the whole subtree of the pages is now a few elements, and the
 * behavior must be the same. jsdom has no layout, no hit test and no transitions: the DOM the
 * pager leaves (inert, attributes) and the calls it makes are read, the CSS in LagLayers and
 * PagerBands, the touch in the browser (backup/rep20261019-002, report).
 */
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Pager,
  endContentTransitions,
  type PagerPage,
  type PagerProps,
} from '@/templates/launcher/Pager';

const pages: PagerPage[] = ['Uno', 'Due', 'Tre'].map((label) => ({
  key: label,
  label,
  content: (
    <>
      <button type="button" className="control">
        {label}
      </button>
      <div className="aca-launcher-cells">
        <button type="button" className="aca-launcher-cell">
          +
        </button>
      </div>
    </>
  ),
}));

const pager = () => document.querySelector<HTMLElement>('.aca-pager')!;
const bodies = () => [...document.querySelectorAll<HTMLElement>('.aca-pager__body')];
const layers = () => [...document.querySelectorAll<HTMLElement>('.aca-launcher-cells')];
const inert = (elements: HTMLElement[]) => elements.map((node) => node.hasAttribute('inert'));

function lendLayout() {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(500);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(24);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(84);
  Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
}

/** The frames the pager asks for, run by hand. */
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

function renderPager(props: Partial<PagerProps> = {}) {
  const base: PagerProps = {
    pages,
    index: 1,
    onIndexChange: vi.fn(),
    locked: false,
    reducedMotion: false,
  };
  const view = render(<Pager {...base} {...props} />);
  return {
    ...view,
    update: (next: Partial<PagerProps>) => view.rerender(<Pager {...base} {...props} {...next} />),
  };
}

/** A transition as the browser hands it out: the element it runs on, and what it ends. */
class FakeTransition {
  finish = vi.fn();
  effect: { target: Element | null; pseudoElement: string | null };
  constructor(target: Element | null, pseudoElement: string | null = null) {
    this.effect = { target, pseudoElement };
  }
}
class FakeAnimation {
  finish = vi.fn();
  effect = { target: document.body, pseudoElement: null };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('CSSTransition', FakeTransition);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, 'scrollTo');
  Reflect.deleteProperty(Element.prototype, 'getAnimations');
});

describe('what keeps the content out of reach, without a style on the pages (N3)', () => {
  it('the body of every page is inert in the overview and while the cards go back, and only then', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    expect(inert(bodies())).toEqual([false, false, false]);

    update({ overview: true });
    expect(inert(bodies())).toEqual([true, true, true]);

    update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    expect(inert(bodies())).toEqual([true, true, true]);

    act(() => {
      vi.advanceTimersByTime(490);
    });
    expect(pager()).not.toHaveClass('is-closing');
    expect(inert(bodies())).toEqual([false, false, false]);
  });

  it('with reduced motion the content is back in reach at once', () => {
    lendLayout();
    const { update } = renderPager({ index: 1, reducedMotion: true });
    update({ overview: true });
    expect(inert(bodies())).toEqual([true, true, true]);
    update({ overview: false });
    expect(inert(bodies())).toEqual([false, false, false]);
  });

  it('the layer of the gaps is the first child in the overview and while the cards go back; the pages follow in order', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    expect([...pager().children].map((node) => node.className.split(' ')[0])).toEqual([
      'aca-pager__page',
      'aca-pager__page',
      'aca-pager__page',
    ]);

    update({ overview: true });
    const children = [...pager().children];
    expect(children.map((node) => node.className.split(' ')[0])).toEqual([
      'aca-pager__surface',
      'aca-pager__page',
      'aca-pager__page',
      'aca-pager__page',
    ]);
    // Out of reach of assistive technology, and over the area the scroll rests on (the base page).
    expect(children[0]).toHaveAttribute('aria-hidden', 'true');
    expect((children[0] as HTMLElement).style.left).toBe('100%');

    update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    expect(pager().firstElementChild).toHaveClass('aca-pager__surface');

    act(() => {
      vi.advanceTimersByTime(490);
    });
    expect(pager().querySelector('.aca-pager__surface')).toBeNull();
  });

  it('the layer follows the base page of the overview, not the page in the centre', () => {
    lendLayout();
    const { update } = renderPager({ index: 0 });
    update({ overview: true });
    expect(pager().querySelector<HTMLElement>('.aca-pager__surface')!.style.left).toBe('0%');
    update({ overview: true, index: 2 });
    expect(pager().querySelector<HTMLElement>('.aca-pager__surface')!.style.left).toBe('0%');
  });
});

describe('a press on the layer of the gaps is a press on the pager (N3)', () => {
  it('the band under a bar reaches nobody, the gap between the cards does, as for the pager itself', () => {
    lendLayout();
    const onPointerDown = vi.fn();
    const { update } = renderPager({
      index: 1,
      onPointerDown,
      style: { paddingTop: '40px', paddingBottom: '20px' },
    });
    update({ overview: true, onPointerDown });
    vi.spyOn(pager(), 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 200,
      left: 0,
      right: 1000,
      width: 1000,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const gaps = pager().querySelector<HTMLElement>('.aca-pager__surface')!;
    fireEvent.pointerDown(gaps, { clientX: 500, clientY: 10, pointerId: 1 });
    fireEvent.pointerDown(gaps, { clientX: 500, clientY: 190, pointerId: 1 });
    expect(onPointerDown).not.toHaveBeenCalled();
    fireEvent.pointerDown(gaps, { clientX: 500, clientY: 100, pointerId: 1 });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});

describe('the free cells are out of reach with the view, by an inert on their layer (N4)', () => {
  it('inert in the overview, while the cards go back and while the pages settle; free at rest', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    expect(inert(layers())).toEqual([false, false, false]);

    update({ overview: true });
    expect(inert(layers())).toEqual([true, true, true]);

    update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    expect(inert(layers())).toEqual([true, true, true]);

    // The cards are back: the content is in reach, the cells wait for the pages to settle.
    act(() => {
      vi.advanceTimersByTime(470);
    });
    expect(pager()).toHaveClass('is-settling');
    expect(inert(bodies())).toEqual([false, false, false]);
    expect(inert(layers())).toEqual([true, true, true]);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(pager()).not.toHaveClass('is-settling');
    expect(inert(layers())).toEqual([false, false, false]);
  });

  it('the cells come back one frame after the closing ends, not after an idle period (ISSUE-109, R8)', () => {
    lendLayout();
    // An idle callback that would run late: the settling must not ask for it.
    const idle = vi.fn(() => 1);
    vi.stubGlobal('requestIdleCallback', idle);
    const frames = manualFrames();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    update({ overview: false });
    frames.run();
    act(() => {
      vi.advanceTimersByTime(470);
    });
    expect(pager()).not.toHaveClass('is-closing');
    expect(pager()).toHaveClass('is-settling');
    expect(inert(layers())).toEqual([true, true, true]);

    // The next frame: the class and the last inert go in the same commit.
    expect(frames.pending()).toBe(1);
    frames.run();
    expect(pager()).not.toHaveClass('is-settling');
    expect(inert(layers())).toEqual([false, false, false]);
    expect(idle).not.toHaveBeenCalled();
  });

  it('without animation frames the settling ends within a frame of time', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    update({ overview: false });
    vi.stubGlobal('requestAnimationFrame', undefined);
    act(() => {
      vi.advanceTimersByTime(470);
    });
    expect(pager()).toHaveClass('is-settling');
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(pager()).not.toHaveClass('is-settling');
    expect(inert(layers())).toEqual([false, false, false]);
  });

  it('the overview that opens again during the settling leaves no frame behind', () => {
    lendLayout();
    const frames = manualFrames();
    const { update, unmount } = renderPager({ index: 1 });
    update({ overview: true });
    update({ overview: false });
    frames.run();
    act(() => {
      vi.advanceTimersByTime(470);
    });
    expect(pager()).toHaveClass('is-settling');
    update({ overview: true });
    expect(pager()).not.toHaveClass('is-settling');
    expect(frames.pending()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('the layer carries no inline style: nothing of the view is written on it', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    for (const layer of layers()) expect(layer.getAttribute('style')).toBeNull();
  });
});

describe('the content of the pages does not transition while the cards go back (N1)', () => {
  const hand = (animations: unknown[]) => {
    const calls = vi.fn(() => animations);
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: calls,
    });
    return calls;
  };

  it('endContentTransitions ends the transitions inside the clip and no other', () => {
    lendLayout();
    renderPager();
    const clip = document.querySelector('.aca-pager__clip')!;
    const inside = new FakeTransition(clip.querySelector('.control'));
    const card = new FakeTransition(document.querySelector('.aca-pager__page'));
    const body = new FakeTransition(document.querySelector('.aca-pager__body'));
    const shadow = new FakeTransition(clip.querySelector('.control'), '::after');
    const animation = new FakeAnimation();
    const asked = hand([inside, card, body, shadow, animation]);
    endContentTransitions(pager());
    expect(asked).toHaveBeenCalledWith({ subtree: true });
    expect(inside.finish).toHaveBeenCalledOnce();
    // The cards (pages and bodies), the pseudo-elements and the animations: as the rule left them.
    expect(card.finish).not.toHaveBeenCalled();
    expect(body.finish).not.toHaveBeenCalled();
    expect(shadow.finish).not.toHaveBeenCalled();
    expect(animation.finish).not.toHaveBeenCalled();
  });

  it('does nothing where the browser has no transitions to hand out', () => {
    lendLayout();
    renderPager();
    vi.stubGlobal('CSSTransition', undefined);
    expect(() => endContentTransitions(pager())).not.toThrow();
    Reflect.deleteProperty(Element.prototype, 'getAnimations');
    vi.stubGlobal('CSSTransition', FakeTransition);
    expect(() => endContentTransitions(pager())).not.toThrow();
  });

  it('the first frame of the closing ends them, before it is drawn; nothing is asked for before or after', () => {
    lendLayout();
    const frames = manualFrames();
    const { update } = renderPager({ index: 1 });
    const mine = new FakeTransition(document.querySelector('.control'));
    const asked = hand([mine]);
    update({ overview: true });
    // Opening: the stylesheet rule never applied there either.
    expect(frames.pending()).toBe(0);

    update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    expect(asked).not.toHaveBeenCalled();
    expect(frames.pending()).toBe(1);
    frames.run();
    expect(asked).toHaveBeenCalledOnce();
    expect(mine.finish).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(490);
    });
    // The closing has ended; the one frame left is the settling's (R8), and it asks for no more.
    expect(pager()).toHaveClass('is-settling');
    expect(frames.pending()).toBe(1);
    frames.run();
    expect(pager()).not.toHaveClass('is-settling');
    expect(frames.pending()).toBe(0);
  });

  it('a pager that goes before the frame asks for nothing', () => {
    lendLayout();
    const frames = manualFrames();
    const { update, unmount } = renderPager({ index: 1 });
    update({ overview: true });
    update({ overview: false });
    expect(frames.pending()).toBe(1);
    unmount();
    expect(frames.pending()).toBe(0);
  });

  it('with reduced motion there is no closing and no frame', () => {
    lendLayout();
    const frames = manualFrames();
    const { update } = renderPager({ index: 1, reducedMotion: true });
    update({ overview: true });
    update({ overview: false });
    expect(frames.pending()).toBe(0);
  });
});
