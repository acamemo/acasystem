/**
 * The pager in the page overview (REP-20261009-003): the pages keep their size and the scroll
 * rests on the page the overview opened on, the cards being the pages moved by transform alone.
 * Here the numbers the stylesheet reads: k and the pitch of the cards, the distance of every page
 * from the base and from the centre, and the way out (the scroll goes to the centre when the
 * cards are back in the row). jsdom has no layout: a pager 1000 x 500 px is lent to it.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOSING_SAFETY_MS,
  NARROW_AFTER_LANDING_MS,
  OVERVIEW_MS,
  Pager,
  overviewPitchOf,
  type PagerPage,
  type PagerProps,
} from '@/templates/launcher/Pager';

const pages: PagerPage[] = ['Uno', 'Due', 'Tre'].map((label) => ({
  key: label,
  label,
  content: <p>{label}</p>,
}));

/** Pager of 1000 x `height` px; a probe of 24 x 84 px (the gap and the room under a card). */
function lendLayout(height = 500) {
  const writes: number[] = [];
  const positions = new WeakMap<Element, number>();
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(height);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(24);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(84);
  vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(function (this: Element) {
    return positions.get(this) ?? 0;
  });
  vi.spyOn(Element.prototype, 'scrollLeft', 'set').mockImplementation(function (
    this: Element,
    value: number
  ) {
    positions.set(this, value);
    if (this.classList.contains('aca-pager')) writes.push(value);
  });
  const scrollTo = vi.fn();
  Element.prototype.scrollTo = scrollTo as unknown as Element['scrollTo'];
  return { writes, scrollTo };
}

const pager = () => document.querySelector<HTMLElement>('.aca-pager')!;
const varOf = (name: string) =>
  [...document.querySelectorAll<HTMLElement>('.aca-pager__page')].map((section) =>
    section.style.getPropertyValue(name)
  );

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

describe('the pager in the page overview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
  });

  it('measures k and the pitch of the cards once, for its area', () => {
    lendLayout(500);
    renderPager();
    // (500 - 84) / 500 is more than 0.72: a card is 72 % of its page, plus the 24 px gap.
    expect(pager().style.getPropertyValue('--aca-overview-k')).toBe('0.7200');
    expect(pager().style.getPropertyValue('--aca-overview-pitch')).toBe('744.00px');
    expect(overviewPitchOf(pager())).toBe(744);
  });

  it('a low area keeps the room under the card: the card shrinks', () => {
    lendLayout(200);
    renderPager();
    // (200 - 84) / 200 = 0.58.
    expect(pager().style.getPropertyValue('--aca-overview-k')).toBe('0.5800');
    expect(overviewPitchOf(pager())).toBeCloseTo(604, 1);
  });

  it('does not count the bands the pager reaches under (REP-20261009-006)', () => {
    // 200 px of client box, 40 + 20 of them the padding under the bars: the pages have 140 px.
    lendLayout(200);
    renderPager({ style: { paddingTop: '40px', paddingBottom: '20px' } });
    // (140 - 84) / 140 = 0.4, not the 0.58 of a pager without bands.
    expect(pager().style.getPropertyValue('--aca-overview-k')).toBe('0.4000');
  });

  it('reserves the room of the controls, the space above the card and that of the «Annulla» pill', () => {
    lendLayout(200);
    const probes: string[] = [];
    const append = Element.prototype.appendChild;
    vi.spyOn(Element.prototype, 'appendChild').mockImplementation(function <T extends Node>(
      this: Element,
      node: T
    ) {
      if (node instanceof HTMLElement && node.style.cssText.includes('--aca-card-footer')) {
        probes.push(node.style.height);
      }
      return append.call(this, node) as T;
    });
    renderPager();
    // The pill comes down from the top in the overview and the status bar no longer leaves the
    // top band empty for it (REP-20261013-002, ADR-0013): its room is part of the reserve, and so
    // is the room of the bar of the pages, which lies over the area (ADR-0016).
    expect(probes[0]).toBe(
      'calc(var(--aca-card-footer) + var(--aca-space-2) + 2 * var(--aca-space-4) + var(--aca-undo-room) + var(--aca-overview-foot, 0px))'
    );
  });

  it('a press on the padding under a bar reaches nobody; the gap between the cards does', () => {
    lendLayout(200);
    const onPointerDown = vi.fn();
    renderPager({
      overview: true,
      onPointerDown,
      style: { paddingTop: '40px', paddingBottom: '20px' },
    });
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
    fireEvent.pointerDown(pager(), { clientX: 500, clientY: 10, pointerId: 1 });
    fireEvent.pointerDown(pager(), { clientX: 500, clientY: 190, pointerId: 1 });
    expect(onPointerDown).not.toHaveBeenCalled();
    fireEvent.pointerDown(pager(), { clientX: 500, clientY: 100, pointerId: 1 });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });

  it('no size yet: no pitch (the stylesheet has its own)', () => {
    renderPager();
    expect(pager().style.getPropertyValue('--aca-overview-k')).toBe('');
    expect(overviewPitchOf(pager())).toBe(0);
  });

  it('every page says how far it is from the base and from the centre', () => {
    lendLayout();
    renderPager({ index: 1 });
    expect(varOf('--aca-o')).toEqual(['-1', '0', '1']);
    expect(varOf('--aca-d')).toEqual(['-1', '0', '1']);
  });

  it('in the overview the scroll rests on the page it opened on, whatever the centre', () => {
    const { writes, scrollTo } = lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    expect(pager()).toHaveClass('is-overview');
    expect(writes.at(-1)).toBe(1000);
    // The centre moves to the third card: the cards move, the scroll does not.
    update({ overview: true, index: 2 });
    expect(varOf('--aca-d')).toEqual(['-2', '-1', '0']);
    expect(varOf('--aca-o')).toEqual(['-1', '0', '1']);
    expect(writes.every((left) => left === 1000 || left === 0)).toBe(true);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('a scroll in the overview (a focus, the browser) is put back on the base page', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    pager().scrollLeft = 123;
    fireEvent.scroll(pager());
    expect(pager().scrollLeft).toBe(1000);
  });

  it('leaving: the cards glide to their places, then the scroll goes to the centre', () => {
    const { writes, scrollTo } = lendLayout();
    const onIndexChange = vi.fn();
    const { update } = renderPager({ index: 1, onIndexChange });
    update({ overview: true });
    update({ overview: true, index: 2 });
    update({ overview: false, index: 2 });
    // Closing: no longer the overview (its controls go), the transforms stay until they glide.
    expect(pager()).toHaveClass('is-closing');
    expect(pager()).not.toHaveClass('is-overview');
    expect(varOf('--aca-o')).toEqual(['-1', '0', '1']);
    expect(writes.at(-1)).toBe(1000);
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(pager()).toHaveClass('is-closing');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Back in the row, in one step: the base is the centre, and the scroll is there at once.
    expect(pager()).not.toHaveClass('is-closing');
    expect(varOf('--aca-o')).toEqual(['-2', '-1', '0']);
    expect(writes.at(-1)).toBe(2000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('the end of the transition of a page ends the closing at once', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    // The transitions of the widgets inside bubble up: they say nothing.
    const widget = document.createElement('span');
    document.querySelector('.aca-pager__body')!.appendChild(widget);
    const ended = (target: Element, propertyName: string) => {
      const event = new Event('transitionend', { bubbles: true });
      Object.assign(event, { propertyName });
      act(() => {
        target.dispatchEvent(event);
      });
    };
    ended(widget, 'translate');
    expect(pager()).toHaveClass('is-closing');
    ended(document.querySelectorAll('.aca-pager__page')[1], 'translate');
    expect(pager()).not.toHaveClass('is-closing');
  });

  it('with reduced motion the overview closes at once', () => {
    const { writes } = lendLayout();
    const { update } = renderPager({ index: 1, reducedMotion: true });
    update({ overview: true });
    update({ overview: false });
    expect(pager()).not.toHaveClass('is-closing');
    expect(pager()).not.toHaveClass('is-overview');
    expect(writes.at(-1)).toBe(1000);
  });

  it('a page added or removed in the overview keeps the scroll and the base', () => {
    const { writes } = lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    const more = [...pages, { key: 'Quattro', label: 'Quattro', content: <p>Quattro</p> }];
    update({ overview: true, pages: more });
    expect(varOf('--aca-o')).toEqual(['-1', '0', '1', '2']);
    update({ overview: true, pages: pages.slice(0, 2) });
    expect(varOf('--aca-o')).toEqual(['-1', '0']);
    expect(writes.at(-1)).toBe(1000);
    // The last page removed while the base is the last: the base follows the pages.
    update({ overview: true, pages: pages.slice(0, 1) });
    expect(varOf('--aca-o')).toEqual(['0']);
    expect(writes.at(-1)).toBe(0);
  });

  it('only a page that is added comes in; one moved by a new order does not', () => {
    lendLayout();
    // The marks are for the first style of a page: they are read as the pages are put in the DOM.
    const placed: Record<string, boolean> = {};
    const note = (node: Node) => {
      if (node instanceof HTMLElement && node.classList.contains('aca-pager__page')) {
        placed[node.getAttribute('aria-label')!] = node.classList.contains('is-new');
      }
    };
    const insertBefore = Element.prototype.insertBefore;
    const appendChild = Element.prototype.appendChild;
    vi.spyOn(Element.prototype, 'insertBefore').mockImplementation(function <T extends Node>(
      this: Element,
      node: T,
      child: Node | null
    ) {
      note(node);
      return insertBefore.call(this, node, child) as T;
    });
    vi.spyOn(Element.prototype, 'appendChild').mockImplementation(function <T extends Node>(
      this: Element,
      node: T
    ) {
      note(node);
      return appendChild.call(this, node) as T;
    });
    const { update } = renderPager({ index: 1, overview: true });
    // On the first render they are all new.
    expect(Object.values(placed).every(Boolean)).toBe(true);
    for (const key of Object.keys(placed)) delete placed[key];
    update({ overview: true, pages: [pages[1], pages[0], pages[2]] });
    expect(Object.keys(placed).length).toBeGreaterThan(0);
    expect(Object.values(placed).every((isNew) => !isNew)).toBe(true);
    for (const key of Object.keys(placed)) delete placed[key];
    const four = { key: 'Quattro', label: 'Quattro', content: <p>Quattro</p> };
    update({ overview: true, pages: [pages[1], pages[0], pages[2], four] });
    expect(placed.Quattro).toBe(true);
    expect(placed.Uno ?? false).toBe(false);
    // The page is committed hidden and comes in two frames later, after the block of the commit
    // that added it (D-M24, D-M25): the mark stays until then, and does not stay after.
    expect(document.querySelectorAll('.aca-pager__page.is-new')).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(document.querySelectorAll('.aca-pager__page.is-new')).toHaveLength(0);
  });

  it('a page that React moves in the DOM glides from where it was; the others do not twice', () => {
    lendLayout();
    const animate = vi.fn();
    let running = 0;
    Object.assign(Element.prototype, {
      animate,
      getAnimations: () => new Array(running).fill(null),
    });
    try {
      const { update } = renderPager({ index: 1, overview: true });
      // A new centre is not a new order: the cards glide by their own transition.
      update({ overview: true, index: 2 });
      expect(animate).not.toHaveBeenCalled();
      update({ overview: true, index: 1 });
      // Uno and Due change places, the centre stays on the second place: 744 px between two
      // cards, Uno was one card to the left of the centre, Due on it.
      update({ overview: true, index: 1, pages: [pages[1], pages[0], pages[2]] });
      expect(animate).toHaveBeenCalledTimes(2);
      expect(animate.mock.calls.map(([frames]) => frames.translate)).toEqual(
        expect.arrayContaining([
          ['-744px', '0px'],
          ['744px', '0px'],
        ])
      );
      animate.mockClear();
      // A page whose transition is running does not get a second animation.
      running = 1;
      update({ overview: true, index: 1, pages: pages });
      expect(animate).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(Element.prototype, 'animate');
      Reflect.deleteProperty(Element.prototype, 'getAnimations');
    }
  });

  describe('focus on a card', () => {
    const focusOn = (name: string, byKeyboard: boolean) => {
      const matches = Element.prototype.matches;
      vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
        this: Element,
        selector: string
      ) {
        return selector === ':focus-visible' ? byKeyboard : matches.call(this, selector);
      });
      act(() => {
        screen.getByRole('button', { name }).focus();
      });
    };

    it('reached with the keyboard it comes to the centre', () => {
      lendLayout();
      const onIndexChange = vi.fn();
      renderPager({ index: 0, overview: true, onIndexChange });
      focusOn('Apri Tre', true);
      expect(onIndexChange).toHaveBeenCalledWith(2);
    });

    it('reached by a press it does not: the tap that follows must find it under the finger', () => {
      lendLayout();
      const onIndexChange = vi.fn();
      renderPager({ index: 0, overview: true, onIndexChange });
      focusOn('Apri Tre', false);
      expect(onIndexChange).not.toHaveBeenCalled();
    });

    it('on the card in the centre it changes nothing', () => {
      lendLayout();
      const onIndexChange = vi.fn();
      renderPager({ index: 1, overview: true, onIndexChange });
      focusOn('Apri Due', true);
      expect(onIndexChange).not.toHaveBeenCalled();
    });
  });

  it('a press on the pager reaches the handler of the screen too', () => {
    lendLayout();
    const onPointerDown = vi.fn();
    renderPager({ overview: true, onPointerDown });
    fireEvent.pointerDown(pager());
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });

  describe('moving the cards with the pointer', () => {
    class Pointer extends MouseEvent {
      pointerId: number;
      pointerType = 'touch';
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    const swipe = () => {
      fireEvent.pointerDown(pager(), { pointerId: 1, clientX: 500, clientY: 200 });
      act(() => {
        window.dispatchEvent(
          new Pointer('pointermove', { pointerId: 1, clientX: 480, clientY: 200 })
        );
        window.dispatchEvent(
          new Pointer('pointermove', { pointerId: 1, clientX: 100, clientY: 200 })
        );
      });
    };
    afterEach(() => {
      act(() => {
        window.dispatchEvent(new Pointer('pointercancel', { pointerId: 1 }));
      });
      vi.unstubAllGlobals();
    });

    it('a swipe moves them', () => {
      vi.stubGlobal('PointerEvent', Pointer);
      lendLayout();
      renderPager({ index: 1, overview: true });
      swipe();
      expect(pager()).toHaveAttribute('data-panning');
    });

    it('a name being edited (the pager is locked) holds them still', () => {
      vi.stubGlobal('PointerEvent', Pointer);
      lendLayout();
      const onIndexChange = vi.fn();
      renderPager({ index: 1, overview: true, locked: true, onIndexChange });
      swipe();
      act(() => {
        window.dispatchEvent(new Pointer('pointerup', { pointerId: 1, clientX: 100 }));
      });
      expect(pager()).not.toHaveAttribute('data-panning');
      // The pan is written on the sections, not on the pager (REP-20261012-003).
      for (const page of pager().querySelectorAll<HTMLElement>('.aca-pager__page')) {
        expect(page.style.getPropertyValue('--aca-overview-pan')).toBe('');
      }
      expect(onIndexChange).not.toHaveBeenCalled();
    });
  });
});

describe('the pager after a commit (REP-20261012-003)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // The observer reports the size once, as in a browser: the effects take it from there.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {}
        observe() {
          this.callback();
        }
        disconnect() {}
      }
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
  });

  it('opening and closing the overview reads neither the width nor the computed style', () => {
    lendLayout();
    const { update } = renderPager({ index: 1 });
    const width = vi.spyOn(Element.prototype, 'clientWidth', 'get');
    const style = vi.spyOn(window, 'getComputedStyle');
    // The mount has measured; from here on the effects have what they need.
    width.mockClear();
    style.mockClear();
    update({ overview: true });
    update({ overview: true, index: 2 });
    update({ overview: false, index: 2 });
    act(() => {
      vi.advanceTimersByTime(480);
    });
    expect(pager()).not.toHaveClass('is-closing');
    expect(width).not.toHaveBeenCalled();
    expect(style).not.toHaveBeenCalled();
  });

  it('closes on the page it opened on without writing the scroll again', () => {
    const { writes } = lendLayout();
    const { update } = renderPager({ index: 1 });
    const mounted = [...writes];
    expect(mounted.at(-1)).toBe(1000);
    update({ overview: true });
    update({ overview: false });
    act(() => {
      vi.advanceTimersByTime(480);
    });
    expect(pager()).not.toHaveClass('is-closing');
    // The scroll never left the page: a write would force the style of the whole pager.
    expect(writes).toEqual(mounted);
  });

  it('closes on another page: the scroll goes there', () => {
    const { writes } = lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    update({ overview: true, index: 2 });
    update({ overview: false, index: 2 });
    act(() => {
      vi.advanceTimersByTime(480);
    });
    expect(writes.at(-1)).toBe(2000);
  });

  it('an index that comes back during the glide glides back too', () => {
    const { scrollTo } = lendLayout();
    const { update } = renderPager({ index: 1 });
    scrollTo.mockClear();
    // The mocked glide sends no scroll event: the scroll has not moved when the index returns.
    update({ index: 2 });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 2000, behavior: 'smooth' });
    update({ index: 1 });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 1000, behavior: 'smooth' });
  });

  it('a swipe that settled on a page is not scrolled to again', () => {
    const { writes, scrollTo } = lendLayout();
    const onIndexChange = vi.fn();
    const { update } = renderPager({ index: 1, onIndexChange });
    writes.length = 0;
    pager().scrollLeft = 2000;
    writes.length = 0;
    fireEvent.scroll(pager());
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(onIndexChange).toHaveBeenCalledWith(2);
    update({ index: 2, onIndexChange });
    // The scroll rests on the page the swipe chose: nothing to write, nothing to glide to.
    expect(writes).toEqual([]);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('the overview that opens during a swipe puts the scroll back on the page it opened on', () => {
    const { writes } = lendLayout();
    const onIndexChange = vi.fn();
    const { update } = renderPager({ index: 1, onIndexChange });
    pager().scrollLeft = 2000;
    fireEvent.scroll(pager());
    act(() => {
      vi.advanceTimersByTime(40);
    });
    // The scroll has not settled: the overview cannot take it for the page it rests on.
    writes.length = 0;
    update({ overview: true, index: 1, onIndexChange });
    expect(writes).toEqual([1000]);
    expect(pager().scrollLeft).toBe(1000);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(pager().scrollLeft).toBe(1000);
  });
});

/**
 * The closing is tied to the transition that really runs (ISSUE-109, R1): the safety timer counts
 * from the first card transition or from the first frame after the commit, whichever comes first,
 * and not from the state change, so a long task between the two cannot cut the glide short. A cap
 * from the state change is the last resort.
 */
describe('the closing of the overview follows the real transition (ISSUE-109, R1)', () => {
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
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  const fire = (target: Element, type: string, propertyName: string) => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { propertyName });
    act(() => {
      target.dispatchEvent(event);
    });
  };
  const sections = () => [...document.querySelectorAll<HTMLElement>('.aca-pager__page')];
  const bodyOf = (position: number) =>
    sections()[position].querySelector<HTMLElement>('.aca-pager__body')!;
  const open = (props: Partial<PagerProps> = {}) => {
    lendLayout();
    const frames = manualFrames();
    const view = renderPager({ index: 1, ...props });
    view.update({ overview: true });
    view.update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    return { ...view, frames };
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
  });

  it('the timer counts from the first frame after the commit, not from the state change', () => {
    const { frames } = open();
    // A long task between the commit and the first frame: the old timer would have run out here.
    tick(300);
    expect(pager()).toHaveClass('is-closing');
    frames.run();
    tick(CLOSING_SAFETY_MS - 20);
    expect(pager()).toHaveClass('is-closing');
    tick(20);
    expect(pager()).not.toHaveClass('is-closing');
  });

  it('the first transition of a page starts the clock before the frame', () => {
    const { frames } = open();
    tick(300);
    fire(sections()[0], 'transitionrun', 'translate');
    tick(CLOSING_SAFETY_MS - 20);
    expect(pager()).toHaveClass('is-closing');
    tick(20);
    expect(pager()).not.toHaveClass('is-closing');
    // The closing frame was not asked for again; the one left is the settling's (R8).
    expect(frames.pending()).toBe(1);
    frames.run();
    expect(pager()).not.toHaveClass('is-settling');
    expect(frames.pending()).toBe(0);
  });

  it('so does the scale of a body, which runs even where no page translates', () => {
    open();
    tick(300);
    fire(bodyOf(1), 'transitionstart', 'scale');
    tick(CLOSING_SAFETY_MS + 20);
    expect(pager()).not.toHaveClass('is-closing');
  });

  it('a transition of a widget inside, or another property of a body, does not start it', () => {
    open();
    const widget = document.createElement('span');
    bodyOf(1).appendChild(widget);
    fire(widget, 'transitionrun', 'opacity');
    fire(bodyOf(1), 'transitionrun', 'translate');
    // Nothing started the clock and no frame came: only the cap closes it.
    tick(1070);
    expect(pager()).toHaveClass('is-closing');
    tick(20);
    expect(pager()).not.toHaveClass('is-closing');
  });

  it('with neither a frame nor a transition the cap, three glides from the state change, closes it', () => {
    const { frames } = open();
    expect(frames.pending()).toBe(1);
    tick(3 * OVERVIEW_MS - 1);
    expect(pager()).toHaveClass('is-closing');
    tick(1);
    expect(pager()).not.toHaveClass('is-closing');
    expect(pager()).toHaveClass('is-settling');
  });

  it('a pager of one page, or a centre with no neighbours, closes within the glide of its first frame', () => {
    const { frames } = open({ pages: pages.slice(0, 1), index: 0 });
    // No page has a translate to run and none will end: the frame is what starts the clock.
    tick(16);
    frames.run();
    tick(CLOSING_SAFETY_MS - 1);
    expect(pager()).toHaveClass('is-closing');
    tick(1);
    expect(pager()).not.toHaveClass('is-closing');
  });

  it('the end of the scale of the body in the centre ends the closing at once; that of a side card does not', () => {
    open();
    fire(bodyOf(0), 'transitionend', 'scale');
    expect(pager()).toHaveClass('is-closing');
    fire(bodyOf(1), 'transitionend', 'translate');
    expect(pager()).toHaveClass('is-closing');
    fire(bodyOf(1), 'transitionend', 'scale');
    expect(pager()).not.toHaveClass('is-closing');
  });

  it('«Fine» right after the opening is not left in the closing', () => {
    lendLayout();
    const frames = manualFrames();
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    // The opening has had no frame yet when the closing begins.
    update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    frames.run();
    tick(CLOSING_SAFETY_MS);
    expect(pager()).not.toHaveClass('is-closing');
    expect(pager()).not.toHaveClass('is-overview');
  });

  it('the overview that opens again during the closing leaves no timer behind', () => {
    const { update, frames, unmount } = open();
    frames.run();
    update({ overview: true });
    expect(pager()).not.toHaveClass('is-closing');
    expect(pager()).toHaveClass('is-overview');
    tick(3 * OVERVIEW_MS);
    expect(pager()).toHaveClass('is-overview');
    expect(pager()).not.toHaveClass('is-settling');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the probe of the size of the cards is not repeated when nothing changed (0.9.28, K4)', () => {
  let observers: Array<() => void> = [];
  beforeEach(() => {
    vi.useFakeTimers();
    observers = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {}
        observe() {
          observers.push(this.callback);
          this.callback();
        }
        disconnect() {}
      }
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.querySelectorAll('style[data-probe-test]').forEach((node) => node.remove());
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
  });

  /** Counts the probes the pager adds to itself. */
  function countProbes() {
    const probes = { count: 0 };
    const append = Element.prototype.appendChild;
    vi.spyOn(Element.prototype, 'appendChild').mockImplementation(function <T extends Node>(
      this: Element,
      node: T
    ) {
      if (node instanceof HTMLElement && node.style.cssText.includes('--aca-card-footer')) {
        probes.count += 1;
      }
      return append.call(this, node) as T;
    });
    return probes;
  }
  const tokens = (gap: string) => {
    const style = document.createElement('style');
    style.setAttribute('data-probe-test', '');
    style.textContent = `.aca-pager { --aca-card-gap: ${gap}; --aca-undo-room: 0px; }`;
    document.head.appendChild(style);
    return style;
  };

  it('a second report of the same size and the same variables adds no probe and keeps k and the pitch', () => {
    lendLayout(500);
    tokens('24px');
    const probes = countProbes();
    renderPager();
    expect(probes.count).toBe(1);
    expect(pager().style.getPropertyValue('--aca-overview-k')).toBe('0.7200');
    // The observer fires on a return from Sistema with the size it had.
    act(() => {
      for (const callback of observers) callback();
      for (const callback of observers) callback();
    });
    expect(probes.count).toBe(1);
    expect(pager().style.getPropertyValue('--aca-overview-k')).toBe('0.7200');
    expect(pager().style.getPropertyValue('--aca-overview-pitch')).toBe('744.00px');
  });

  it('a new height needs no probe (k is computed again), a new width or a new token does', () => {
    lendLayout(500);
    const gap = tokens('24px');
    const probes = countProbes();
    renderPager();
    expect(probes.count).toBe(1);
    // The area gets lower: the share a card keeps changes, what the probe measures does not.
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(200);
    act(() => {
      for (const callback of observers) callback();
    });
    expect(probes.count).toBe(1);
    expect(pager().style.getPropertyValue('--aca-overview-k')).toBe('0.5800');
    // A new width: the probe is read again (a gap in % or in vw would follow it).
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1100);
    act(() => {
      for (const callback of observers) callback();
    });
    expect(probes.count).toBe(2);
    // A token changed (a density, a theme): the probe is read again under the new value.
    gap.textContent = '.aca-pager { --aca-card-gap: 32px; --aca-undo-room: 0px; }';
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(32);
    act(() => {
      for (const callback of observers) callback();
    });
    expect(probes.count).toBe(3);
    // k 0.58 of 1100 px plus the new gap of 32 px.
    expect(pager().style.getPropertyValue('--aca-overview-pitch')).toBe('670.00px');
  });
});

describe('the pages out of sight are marked by an attribute of their own (0.9.28, K2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lendLayout();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
  });
  const quiet = () =>
    [...document.querySelectorAll<HTMLElement>('.aca-pager__page')].map((page) =>
      page.hasAttribute('data-quiet')
    );
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  /** Two frames of the page, and some margin (afterNextFrame). */
  const FRAMES_MS = 40;

  it('at rest it is on the pages that are not the current one, and on no other', () => {
    renderPager({ index: 1 });
    expect(quiet()).toEqual([true, false, true]);
  });

  it('it follows the current page: the new one loses it two frames later, the one left gets it after the landing (J1)', () => {
    const { update } = renderPager({ index: 1 });
    update({ index: 2 });
    // Outside a scene the new page keeps it in the commit that makes it current (J1, tracing of
    // 2026-10-25: that write restyled 216 elements more in the commit of the jump) and the page
    // just left is off screen: it is marked later, not in the commit of the move.
    expect(quiet()).toEqual([true, false, true]);
    tick(FRAMES_MS);
    expect(quiet()).toEqual([true, false, false]);
    tick(NARROW_AFTER_LANDING_MS);
    expect(quiet()).toEqual([true, true, false]);
  });

  it('a jump cancelled by another jump before the frame leaves no page quiet as the current one (J1)', () => {
    const { update } = renderPager({ index: 1 });
    update({ index: 2 });
    update({ index: 0 });
    // Page 0 arrives and keeps it for the frames; page 2, which never lost it, is the one left.
    expect(quiet()).toEqual([true, true, false]);
    tick(FRAMES_MS);
    expect(quiet()).toEqual([false, true, false]);
    tick(NARROW_AFTER_LANDING_MS);
    expect(quiet()).toEqual([false, true, true]);
  });

  it('the page the pages view closes on loses it in the commit that makes it current, as in «Fine» (J1)', () => {
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    tick(OVERVIEW_MS + 400);
    // The page in the centre of the cards is current in a scene: it never has the attribute.
    update({ overview: true, index: 2 });
    expect(quiet()[2]).toBe(false);
    update({ overview: false, index: 2 });
    expect(quiet()[2]).toBe(false);
    tick(CLOSING_SAFETY_MS + 20);
    tick(FRAMES_MS);
    expect(quiet()[2]).toBe(false);
    expect(quiet()[0]).toBe(true);
  });

  it('the pages view closing on another card in one move: the new page loses it in that commit (J1)', () => {
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    tick(OVERVIEW_MS + 400);
    update({ overview: false, index: 2 });
    expect(pager()).toHaveClass('is-closing');
    expect(quiet()[2]).toBe(false);
  });

  it('the pages that are not the current one keep it in the pages view and while the cards come in, go back or settle', () => {
    const { update } = renderPager({ index: 1 });
    update({ overview: true });
    expect(pager()).toHaveClass('is-overview', 'is-entering');
    expect(quiet()).toEqual([true, false, true]);
    tick(OVERVIEW_MS + 400);
    expect(pager()).not.toHaveClass('is-entering');
    expect(quiet()).toEqual([true, false, true]);
    update({ overview: false });
    expect(pager()).toHaveClass('is-closing');
    expect(quiet()).toEqual([true, false, true]);
    tick(CLOSING_SAFETY_MS + 20);
    expect(pager()).toHaveClass('is-settling');
    expect(quiet()).toEqual([true, false, true]);
    tick(100);
    expect(pager()).not.toHaveClass('is-settling');
    expect(quiet()).toEqual([true, false, true]);
  });

  it('in the wait of a staged scene it is the same: it does not depend on the classes of the pager', () => {
    const { update } = renderPager({ index: 1 });
    update({ overview: true, staged: true });
    expect(pager()).not.toHaveClass('is-overview');
    expect(quiet()).toEqual([true, false, true]);
    update({ overview: true, staged: false });
    expect(quiet()).toEqual([true, false, true]);
    update({ overview: false, staged: true });
    expect(pager()).toHaveClass('is-overview');
    expect(quiet()).toEqual([true, false, true]);
  });

  it('a whole scene (opening, «Fine», settling) writes the attribute on no page', () => {
    const { update } = renderPager({ index: 1 });
    const writes: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) writes.push(record.attributeName ?? '');
    });
    observer.observe(pager(), { attributes: true, attributeFilter: ['data-quiet'], subtree: true });
    update({ overview: true });
    tick(OVERVIEW_MS + 400);
    update({ overview: false });
    tick(CLOSING_SAFETY_MS + 20);
    tick(100);
    writes.push(...observer.takeRecords().map((record) => record.attributeName ?? ''));
    observer.disconnect();
    // Not at the passage to the page view, not at the end of is-entering, not at is-closing, not
    // at the end of is-settling (G2 tracing: each write on nine pages restyled 900-1100 elements).
    expect(writes).toHaveLength(0);
  });

  it('it is written only when the current page changes: the commit of the move writes none, the new one loses it later, the one left gets it later still', () => {
    const { update } = renderPager({ index: 1 });
    const writes: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) writes.push(record.attributeName ?? '');
    });
    observer.observe(pager(), { attributes: true, attributeFilter: ['data-quiet'], subtree: true });
    update({ index: 2 });
    writes.push(...observer.takeRecords().map((record) => record.attributeName ?? ''));
    // The commit of the move writes no attribute: the new page keeps it, the one left is marked
    // later (J1, tracing of 2026-10-25) ...
    expect(writes).toHaveLength(0);
    expect(quiet()).toEqual([true, false, true]);
    // ... the new page loses it in a task of its own, two frames on ...
    tick(FRAMES_MS);
    writes.push(...observer.takeRecords().map((record) => record.attributeName ?? ''));
    expect(writes).toHaveLength(1);
    expect(quiet()).toEqual([true, false, false]);
    // ... and the page left gets it once the landing is over.
    tick(NARROW_AFTER_LANDING_MS);
    writes.push(...observer.takeRecords().map((record) => record.attributeName ?? ''));
    observer.disconnect();
    expect(writes).toHaveLength(2);
    expect(quiet()).toEqual([true, true, false]);
  });
});
