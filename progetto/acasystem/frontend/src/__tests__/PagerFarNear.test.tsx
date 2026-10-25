/**
 * Level 2 of ADR-0018 (ISSUE-109, R2b): at rest the pages next to the one shown are skipped too
 * (`data-far`), and drawn again at the first touch of the pager, while a widget is dragged and
 * while the row scrolls. Level 1 (the neighbours drawn at rest) is PagerFarPages.test.tsx, which
 * renders with `skipNear` false; this is the step on top of it, and `REST_SKIPS_NEAR` / `skipNear`
 * is the one place that takes it back. jsdom has no layout: a pager 1000 x 500 px is lent to it.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NARROW_AFTER_LANDING_MS,
  Pager,
  REST_SKIPS_NEAR,
  restWindow,
  type PagerPage,
  type PagerProps,
} from '@/templates/launcher/Pager';

const COUNT = 10;
const WIDTH = 1000;
const SETTLE = 100;
/** The neighbours stay drawn this long after the finger leaves a pager that does not scroll. */
const HOLD = 300;
/** After a swipe has landed the window narrows to the page it landed on this much later (0.9.28). */
const NARROW = NARROW_AFTER_LANDING_MS;

class Pointer extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(
    type: string,
    options: MouseEventInit & { pointerId?: number; pointerType?: string } = {}
  ) {
    super(type, options);
    this.pointerId = options.pointerId ?? 0;
    this.pointerType = options.pointerType ?? 'touch';
  }
}

const pages: PagerPage[] = Array.from({ length: COUNT }, (_, position) => ({
  key: `p${position}`,
  label: `P${position}`,
  content: <p data-testid={`probe-${position}`}>P{position}</p>,
}));

const pager = () => document.querySelector<HTMLElement>('.aca-pager')!;
const sections = () => [...document.querySelectorAll<HTMLElement>('.aca-pager__page')];
const drawn = () =>
  sections()
    .map((section, position) => (section.hasAttribute('data-far') ? -1 : position))
    .filter((position) => position >= 0);
const range = (first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, step) => first + step);

function lendLayout() {
  const writes: Array<{ left: number; drawn: number[] }> = [];
  const glides: Array<{ left: number; drawn: number[] }> = [];
  const positions = new WeakMap<Element, number>();
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(500);
  vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(function (this: Element) {
    return positions.get(this) ?? 0;
  });
  vi.spyOn(Element.prototype, 'scrollLeft', 'set').mockImplementation(function (
    this: Element,
    value: number
  ) {
    positions.set(this, value);
    if (this.classList.contains('aca-pager')) writes.push({ left: value, drawn: drawn() });
  });
  Element.prototype.scrollTo = vi.fn(function (this: Element, options?: ScrollToOptions) {
    glides.push({ left: options?.left ?? 0, drawn: drawn() });
  }) as unknown as Element['scrollTo'];
  const scrollTo = (left: number) => {
    positions.set(pager(), left);
    act(() => {
      fireEvent.scroll(pager());
    });
  };
  return { writes, glides, scrollTo };
}

function renderPager(props: Partial<PagerProps> = {}) {
  const onIndexChange = vi.fn();
  const base: PagerProps = {
    pages,
    index: 4,
    onIndexChange,
    locked: false,
    reducedMotion: false,
    skipNear: true,
  };
  const view = render(<Pager {...base} {...props} />);
  return {
    ...view,
    onIndexChange,
    update: (next: Partial<PagerProps>) => view.rerender(<Pager {...base} {...props} {...next} />),
  };
}

/** A finger (or a pen, or a mouse) on the content of a page. */
const press = (
  type = 'touch',
  target: Element = document.querySelector('[data-testid="probe-4"]')!
) =>
  act(() => {
    fireEvent.pointerDown(target, { pointerType: type, pointerId: 1, clientY: 250 });
  });
const lift = (event: 'pointerUp' | 'pointerCancel' = 'pointerUp') =>
  act(() => {
    fireEvent[event](document.body, { pointerId: 1 });
  });
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', Pointer);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, 'scrollTo');
  delete document.documentElement.dataset.acaInput;
});

describe('at rest', () => {
  it('draws the page shown alone: the neighbours are skipped as the others', () => {
    lendLayout();
    renderPager({ index: 4 });
    expect(drawn()).toEqual([4]);
  });

  it('at the ends and in a short row it is the page shown alone as well', () => {
    lendLayout();
    const first = renderPager({ index: 0 });
    expect(drawn()).toEqual([0]);
    first.unmount();
    renderPager({ index: COUNT - 1 });
    expect(drawn()).toEqual([COUNT - 1]);
  });

  it('the default is the constant that switches the level, and the prop overrides it', () => {
    lendLayout();
    const view = renderPager({ skipNear: undefined });
    expect(drawn()).toEqual(REST_SKIPS_NEAR ? [4] : [3, 4, 5]);
    view.update({ skipNear: false });
    expect(drawn()).toEqual([3, 4, 5]);
    view.update({ skipNear: true });
    expect(drawn()).toEqual([4]);
  });

  it('the tree is the one it was: every page stays mounted, inert and named as before', () => {
    lendLayout();
    renderPager({ index: 4 });
    expect(document.querySelectorAll('[data-testid^="probe-"]')).toHaveLength(COUNT);
    sections().forEach((section, position) => {
      expect(section.hasAttribute('inert')).toBe(position !== 4);
      expect(section.getAttribute('aria-hidden') === 'true').toBe(position !== 4);
      expect(section).toHaveAttribute('aria-label', `P${position}`);
    });
  });

  it('restWindow: the neighbours come only with `nearDrawn`, a reach or a drag', () => {
    expect(restWindow(COUNT, 4, null, false, false)).toEqual([4, 4]);
    expect(restWindow(COUNT, 4, null, false)).toEqual([3, 5]);
    expect(restWindow(COUNT, 4, null, true, false)).toEqual([2, 6]);
    expect(restWindow(COUNT, 4, { lo: 4, hi: 5, dir: 1 }, false, false)).toEqual([3, 7]);
  });
});

describe('the first touch of the pager', () => {
  it('draws the neighbours in the commit of the press, before the finger has moved', () => {
    lendLayout();
    renderPager({ index: 4 });
    press('touch');
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('a pen does as a finger; a mouse, which cannot swipe the row, does not', () => {
    lendLayout();
    renderPager({ index: 4 });
    press('mouse');
    expect(drawn()).toEqual([4]);
    press('pen');
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('a press on the page itself in the bands under the bars does nothing', () => {
    lendLayout();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 500,
      left: 0,
      right: 1000,
      width: 1000,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    renderPager({ index: 4, style: { paddingTop: '60px', paddingBottom: '60px' } });
    act(() => {
      fireEvent.pointerDown(pager(), { pointerType: 'touch', pointerId: 1, clientY: 20 });
    });
    expect(drawn()).toEqual([4]);
    act(() => {
      fireEvent.pointerDown(pager(), { pointerType: 'touch', pointerId: 1, clientY: 250 });
    });
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('the neighbours go when the finger is up and nothing scrolls, after the hold', () => {
    lendLayout();
    renderPager({ index: 4 });
    press();
    lift();
    wait(HOLD - 20);
    expect(drawn()).toEqual([3, 4, 5]);
    wait(40);
    expect(drawn()).toEqual([4]);
  });

  it('a pointer that is cancelled lets go as a pointer that is up', () => {
    lendLayout();
    renderPager({ index: 4 });
    press();
    lift('pointerCancel');
    wait(HOLD + 10);
    expect(drawn()).toEqual([4]);
  });

  it('a finger that stays on the pager keeps them, however long', () => {
    lendLayout();
    renderPager({ index: 4 });
    press();
    wait(5000);
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('a second touch within the hold keeps them and starts the hold again', () => {
    lendLayout();
    renderPager({ index: 4 });
    press();
    lift();
    wait(HOLD - 50);
    press();
    wait(HOLD + 100);
    expect(drawn()).toEqual([3, 4, 5]);
    lift();
    wait(HOLD + 10);
    expect(drawn()).toEqual([4]);
  });

  it('a swipe keeps them until the scroll stops, and the stop is what lets them go', () => {
    const { scrollTo } = lendLayout();
    const { onIndexChange, update } = renderPager({ index: 4 });
    press();
    scrollTo(4 * WIDTH + 200);
    // The browser takes the gesture: the pointer is cancelled, the scroll goes on.
    lift('pointerCancel');
    scrollTo(4 * WIDTH + 600);
    wait(60);
    // The swipe draws the pages ahead of it from its first scroll event, with one to spare.
    expect(drawn()).toEqual(range(3, 7));
    scrollTo(5 * WIDTH);
    wait(SETTLE);
    expect(onIndexChange).toHaveBeenCalledWith(5);
    update({ index: 5 });
    // The landing keeps what the swipe drew; the window narrows to the page later (0.9.28).
    expect(drawn()).toEqual(range(3, 7));
    wait(NARROW);
    expect(drawn()).toEqual([5]);
  });

  it('the hold is not what ends a scroll that is still running', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 4 });
    press();
    lift();
    // A long glide: an event every 50 ms, longer than the hold.
    for (let step = 1; step <= 10; step++) {
      scrollTo(4 * WIDTH + step * 40);
      wait(50);
    }
    expect(drawn()).toEqual(range(3, 7));
  });

  it('a scroll that stops with the finger still down keeps the neighbours', () => {
    const { scrollTo } = lendLayout();
    const { update } = renderPager({ index: 4 });
    press();
    scrollTo(5 * WIDTH);
    wait(SETTLE);
    update({ index: 5 });
    wait(NARROW);
    expect(drawn()).toEqual([4, 5, 6]);
    lift();
    wait(HOLD + 10);
    expect(drawn()).toEqual([5]);
  });

  it('a press in the overview draws nothing more (the overview has its own window)', () => {
    lendLayout();
    renderPager({ index: 4, overview: true });
    const before = drawn();
    press('touch', pager());
    expect(drawn()).toEqual(before);
  });

  it('the listeners of the finger go when it is up and when the pager goes away', () => {
    lendLayout();
    const added = vi.spyOn(window, 'addEventListener');
    const removed = vi.spyOn(window, 'removeEventListener');
    const view = renderPager({ index: 4 });
    press();
    const taken = added.mock.calls.filter(
      ([type]) => type === 'pointerup' || type === 'pointercancel'
    );
    expect(taken).toHaveLength(2);
    lift();
    expect(
      removed.mock.calls.filter(([type]) => type === 'pointerup' || type === 'pointercancel')
    ).toHaveLength(2);
    press();
    view.unmount();
    expect(
      removed.mock.calls.filter(([type]) => type === 'pointerup' || type === 'pointercancel')
    ).toHaveLength(4);
    // The hold that was running does not write to the pager that is gone.
    expect(() => vi.advanceTimersByTime(HOLD * 2)).not.toThrow();
  });

  it('with the level off a touch changes nothing', () => {
    lendLayout();
    renderPager({ index: 4, skipNear: false });
    expect(drawn()).toEqual([3, 4, 5]);
    press();
    expect(drawn()).toEqual([3, 4, 5]);
    lift();
    wait(HOLD + 10);
    expect(drawn()).toEqual([3, 4, 5]);
  });
});

describe('a widget dragged to the edge, with or without a touch on the pager', () => {
  it('two pages on each side from the start of the drag, as in level 1', () => {
    lendLayout();
    const { update } = renderPager({ index: 4 });
    expect(drawn()).toEqual([4]);
    update({ dragging: true, locked: true });
    expect(drawn()).toEqual(range(2, 6));
  });

  it('turning a page at the edge draws no page in the middle of the gesture', () => {
    const { glides } = lendLayout();
    const { update } = renderPager({ index: 4, dragging: true, locked: true });
    update({ index: 5, dragging: true, locked: true });
    expect(glides).toHaveLength(1);
    // The page it turns to, and its neighbour, were drawn since the start of the drag.
    expect(glides[0].drawn).toEqual(expect.arrayContaining([5, 6]));
  });

  it('after the drop the pages go back to the page shown alone, later and at a moment of quiet (W3)', () => {
    lendLayout();
    const { update } = renderPager({ index: 4, dragging: true, locked: true });
    update({ index: 4, dragging: false, locked: false });
    // The commit that ends the session writes no `data-far`: the window narrows after the quiet.
    expect(drawn()).toEqual([2, 3, 4, 5, 6]);
    wait(NARROW + 1000);
    expect(drawn()).toEqual([4]);
  });
});

describe('the scroll and the jumps', () => {
  it('the first scroll event draws the neighbours even without a touch (a trackpad, a wheel)', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 4 });
    scrollTo(4 * WIDTH + 50);
    expect(drawn()).toEqual(range(3, 7));
  });

  it('a tap on a far dot lands at once, on the page alone; nothing on the way is drawn (ISSUE-109, R10)', () => {
    const { writes, glides } = lendLayout();
    const { update } = renderPager({ index: 1 });
    writes.length = 0;
    update({ index: 7, dotJump: { current: 7 } });
    expect(glides).toHaveLength(0);
    expect(writes).toHaveLength(1);
    expect(writes[0].left).toBe(7 * WIDTH);
    expect(writes[0].drawn).toEqual([7]);
    expect(drawn()).toEqual([7]);
  });

  it('a glide to the page next to it draws the two pages and their neighbours, and is alone at the stop', () => {
    const { glides, scrollTo } = lendLayout();
    const { update } = renderPager({ index: 1 });
    update({ index: 2 });
    expect(glides).toHaveLength(1);
    expect(glides[0].drawn).toEqual(range(0, 3));
    for (const page of [1.3, 1.8, 2]) scrollTo(page * WIDTH);
    wait(SETTLE);
    // The landing keeps the way of the glide drawn; the window narrows to the page later.
    expect(drawn()).toEqual(range(0, 3));
    wait(NARROW);
    expect(drawn()).toEqual([2]);
  });

  it('a jump (the keyboard, reduced motion) draws the page it lands on before the offset is written', () => {
    const { writes } = lendLayout();
    document.documentElement.dataset.acaInput = 'keyboard';
    const { update } = renderPager({ index: 1 });
    writes.length = 0;
    update({ index: 7 });
    expect(writes).toHaveLength(1);
    expect(writes[0].drawn).toEqual([7]);
    expect(drawn()).toEqual([7]);
  });

  it('a scroll that comes back to the page it left ends on that page alone', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 4 });
    scrollTo(4 * WIDTH + 300);
    scrollTo(4 * WIDTH);
    wait(SETTLE);
    wait(NARROW);
    expect(drawn()).toEqual([4]);
  });
});
