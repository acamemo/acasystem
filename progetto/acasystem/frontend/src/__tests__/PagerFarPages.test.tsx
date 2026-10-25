/**
 * The pages out of the window of the pager are skipped by the browser (ISSUE-109, R2, ADR-0018,
 * level 1): the Pager writes `data-far` on their section, the stylesheet gives their clip
 * `content-visibility: hidden`, and nothing else changes: they stay mounted, with their state,
 * their observers and their contexts. These tests fix the window (at rest, while the row scrolls,
 * while a widget is dragged, in the overview), that a page is drawn before it can be seen, and
 * that the tree is the one it was. jsdom has no layout: a pager 1000 x 500 px is lent to it.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LauncherPage } from '@/@types/launcher';
import { useMeasuredHeight } from '@/components/widgets/home/shared/useMeasuredHeight';
import { usePageNear, usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import type { GridGeometry } from '@/hooks/launcher/useWidgetDrag';
import { createLauncherSelection } from '@/hooks/launcher/useLauncherSelection';
import { LauncherUiContext, type LauncherUi } from '@/templates/launcher/LauncherUiContext';
import {
  NARROW_AFTER_LANDING_MS,
  NARROW_IDLE_TIMEOUT_MS,
  Pager,
  SETTLE_MS,
  overviewWindow,
  restWindow,
  type PagerPage,
  type PagerProps,
} from '@/templates/launcher/Pager';
import { WidgetGrid } from '@/templates/launcher/WidgetGrid';
import { GRID_GAPS, cellMetrics } from '@/utils/launcher/deviceClass';

const COUNT = 10;
const WIDTH = 1000;
/** After the last scroll event the pager waits this long to call the scroll settled. */
const SETTLE = 100;
/** After the scroll has landed the window narrows to the page it landed on this much later. */
const NARROW = NARROW_AFTER_LANDING_MS;
/** What is left of NARROW after `advanceTimersByTime(SETTLE)`: the pager calls the scroll settled earlier. */
const NARROW_LEFT = NARROW - (SETTLE - SETTLE_MS);

/** What a page reports of the contexts it is under. */
function Probe({ label }: { label: string }) {
  const near = usePageNear();
  const visible = usePageVisible();
  return <p data-testid={`probe-${label}`} data-near={near} data-visible={visible} />;
}

const pages: PagerPage[] = Array.from({ length: COUNT }, (_, position) => ({
  key: `p${position}`,
  label: `P${position}`,
  content: <Probe label={`p${position}`} />,
}));

/**
 * Pager of 1000 x `height` px; a probe of 24 x 84 px (the gap and the room under a card). The
 * scroll offset is kept, every write is recorded with the pages skipped at that moment, and so is
 * every `scrollTo`.
 */
function lendLayout(height = 500) {
  const writes: Array<{ left: number; far: number[] }> = [];
  const glides: Array<{ left: number; far: number[] }> = [];
  const positions = new WeakMap<Element, number>();
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH);
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
    if (this.classList.contains('aca-pager')) writes.push({ left: value, far: far() });
  });
  Element.prototype.scrollTo = vi.fn(function (this: Element, options?: ScrollToOptions) {
    glides.push({ left: options?.left ?? 0, far: far() });
  }) as unknown as Element['scrollTo'];
  const scrollTo = (left: number) => {
    positions.set(pager(), left);
    act(() => {
      fireEvent.scroll(pager());
    });
  };
  return { writes, glides, scrollTo };
}

const pager = () => document.querySelector<HTMLElement>('.aca-pager')!;
const sections = () => [...document.querySelectorAll<HTMLElement>('.aca-pager__page')];
/** The pages the browser skips. */
const far = () =>
  sections()
    .map((section, position) => (section.hasAttribute('data-far') ? position : -1))
    .filter((position) => position >= 0);
/** The pages drawn. */
const drawn = () =>
  sections()
    .map((section, position) => (section.hasAttribute('data-far') ? -1 : position))
    .filter((position) => position >= 0);
/** What the pager shows of its window: its own classes and the pages it skips. */
const snapshot = () => ({
  className: pager().className,
  far: far(),
  pages: sections().map((section) => section.className),
});
class TouchPointer extends MouseEvent {
  pointerId = 1;
  pointerType = 'touch';
}
const range = (first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, step) => first + step);

function renderPager(props: Partial<PagerProps> = {}) {
  const onIndexChange = vi.fn();
  const base: PagerProps = {
    pages,
    index: 4,
    onIndexChange,
    locked: false,
    reducedMotion: false,
    // These tests are about the window of level 1; the neighbours at rest are PagerFarNear.test.tsx.
    skipNear: false,
  };
  const view = render(<Pager {...base} {...props} />);
  return {
    ...view,
    onIndexChange,
    update: (next: Partial<PagerProps>) => view.rerender(<Pager {...base} {...props} {...next} />),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, 'scrollTo');
  delete document.documentElement.dataset.acaInput;
});

describe('the window at rest and in edit mode', () => {
  it('draws the page shown and its neighbours; the others are skipped', () => {
    lendLayout();
    renderPager({ index: 4 });
    expect(drawn()).toEqual([3, 4, 5]);
    expect(far()).toEqual([0, 1, 2, 6, 7, 8, 9]);
  });

  it('at the ends the window loses the side that is not there', () => {
    lendLayout();
    const first = renderPager({ index: 0 });
    expect(drawn()).toEqual([0, 1]);
    first.unmount();
    renderPager({ index: COUNT - 1 });
    expect(drawn()).toEqual([COUNT - 2, COUNT - 1]);
  });

  it('skips nothing in a row of three pages or fewer', () => {
    lendLayout();
    renderPager({ pages: pages.slice(0, 3), index: 1 });
    expect(far()).toEqual([]);
  });

  it('is the same with or without layout (jsdom, a launcher that is covered)', () => {
    renderPager({ index: 6 });
    expect(drawn()).toEqual([5, 6, 7]);
  });

  it('the attribute is all that changes: every page stays mounted, with its contexts', () => {
    lendLayout();
    renderPager({ index: 4 });
    const probes = [...document.querySelectorAll<HTMLElement>('[data-testid^="probe-"]')];
    expect(probes).toHaveLength(COUNT);
    // The same values the pager has always provided: near is the page and its neighbours (the
    // preload of the heavy pages, ADR-0014), visible is the page shown alone.
    probes.forEach((probe, position) => {
      expect(probe.dataset.near).toBe(String(Math.abs(position - 4) <= 1));
      expect(probe.dataset.visible).toBe(String(position === 4));
    });
    const far6 = sections()[6];
    expect(far6.getAttribute('data-far')).toBe('');
    expect(far6.getAttribute('style')).not.toMatch(/visibility|display/);
  });

  it('the pages out of reach are still out of reach and out of the way of assistive technology', () => {
    lendLayout();
    renderPager({ index: 4 });
    sections().forEach((section, position) => {
      const off = position !== 4;
      expect(section.hasAttribute('inert')).toBe(off);
      expect(section.getAttribute('aria-hidden') === 'true').toBe(off);
      // The name of the page is its own, skipped or not.
      expect(section).toHaveAttribute('aria-label', `P${position}`);
    });
  });
});

describe('the window while the row scrolls', () => {
  it('a swipe to the next page draws the pages ahead from its first scroll event, with one to spare', () => {
    // The pages are drawn while the scroll runs, which the compositor carries, and not after the
    // landing, where the cost fell on the landing of the indicator (REP-20261023-006, 0.9.28).
    const { scrollTo } = lendLayout();
    const { onIndexChange } = renderPager({ index: 4 });
    expect(drawn()).toEqual([3, 4, 5]);
    for (const page of [4.002, 4.05, 4.4, 4.75, 4.98, 5]) {
      scrollTo(page * WIDTH);
      expect(drawn()).toEqual(range(3, 7));
    }
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('the overshoot of the snap is no turn: the window keeps its direction (0.9.28, M1)', () => {
    // The last scroll events of the landing come back by a hair (5.003, 4.998, 5): the window used
    // to turn with them and swap its spare page twice, two restyles after each landing.
    const { scrollTo } = lendLayout();
    renderPager({ index: 4 });
    const seen: number[][] = [];
    for (const page of [4.002, 4.4, 4.9, 5.003, 4.998, 5.001, 4.999, 5]) {
      scrollTo(page * WIDTH);
      seen.push(drawn());
    }
    // Past the page (5.003) the window has its spare page ahead, and it keeps it to the last event.
    expect(seen[3]).toEqual(range(3, 8));
    expect(seen.slice(3).every((window) => String(window) === String(seen[3]))).toBe(true);
  });

  it('a turn of the finger still turns the window: further than a tenth of a page, or away from a page', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 4 });
    for (const page of [4.002, 4.4, 4.9, 5.003]) scrollTo(page * WIDTH);
    const forward = drawn();
    // 0.3 of a page back in one event: a turn.
    scrollTo(4.7 * WIDTH);
    expect(drawn()).not.toEqual(forward);
    expect(drawn()).toEqual(range(2, 7));
    // A small step back away from a page (4.55 to 4.52): a turn too, the position is not at a page.
    scrollTo(4.55 * WIDTH);
    scrollTo(4.52 * WIDTH);
    expect(drawn()).toEqual(range(2, 7));
  });

  it('a swipe back draws the pages behind it the same way', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 4 });
    for (const page of [3.998, 3.9, 3.5, 3.1, 3]) {
      scrollTo(page * WIDTH);
      expect(drawn()).toEqual(range(1, 5));
    }
  });

  it('the landing writes no data-far and no class on the pager: the window narrows later, on its own (the cause of 0.9.28)', () => {
    // 0.9.28 moved the window to the page it landed on in the landing itself, 48 ms after the
    // commit of the index: unlocking a page there cost 95-117 ms inside the landing of the
    // indicator. The pages are drawn by the gesture now; from the stop of the scroll until
    // NARROW_AFTER_LANDING_MS nothing is written.
    const { scrollTo } = lendLayout();
    vi.stubGlobal('PointerEvent', TouchPointer);
    const { onIndexChange, update } = renderPager({ index: 4 });
    act(() => {
      fireEvent(
        pager(),
        new TouchPointer('pointerdown', { clientX: 800, clientY: 200, bubbles: true })
      );
    });
    for (const page of [4.01, 4.2, 4.5, 4.8]) {
      scrollTo(page * WIDTH);
      act(() => {
        vi.advanceTimersByTime(16);
      });
    }
    scrollTo(5 * WIDTH);
    act(() => {
      window.dispatchEvent(new TouchPointer('pointerup'));
    });
    const widened = snapshot();
    const watch = new MutationObserver(() => undefined);
    watch.observe(pager(), { attributes: true, attributeFilter: ['class'] });
    watch.observe(pager(), { attributes: true, subtree: true, attributeFilter: ['data-far'] });
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(onIndexChange).toHaveBeenCalledWith(5);
    update({ index: 5 });
    expect(far()).toEqual(widened.far);
    expect(pager().className).toBe(widened.className);
    act(() => {
      vi.advanceTimersByTime(NARROW_LEFT - 1);
    });
    // Nothing was written, not even to be written back: the observer has no record.
    expect(watch.takeRecords()).toEqual([]);
    expect(drawn()).toEqual(range(3, 7));
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(drawn()).toEqual([4, 5, 6]);
    watch.disconnect();
  });

  it('a page is drawn with a page to spare before the position can show it, in a fling', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 2 });
    for (const page of [2.04, 3.2, 4.5, 5.9, 7.3, 8.8, 9]) {
      scrollTo(page * WIDTH);
      const shown = [Math.floor(page + 0.001), Math.ceil(page - 0.001)];
      for (const position of shown) expect(drawn()).toContain(position);
      // Beyond the pages the window held (1..3 at rest on 2), one more than the one it reaches,
      // the way it goes.
      if (shown[1] > 3) expect(drawn()).toContain(Math.min(COUNT - 1, shown[1] + 1));
    }
  });

  it('a page is drawn with a page to spare in a fling to the left', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 8 });
    for (const page of [7.96, 6.8, 5.1, 3.7, 2.2, 0.9, 0]) {
      scrollTo(page * WIDTH);
      for (const position of [Math.floor(page + 0.001), Math.ceil(page - 0.001)]) {
        expect(drawn()).toContain(position);
      }
      if (Math.floor(page + 0.001) < 7) {
        expect(drawn()).toContain(Math.max(0, Math.floor(page + 0.001) - 1));
      }
    }
  });

  it('narrows after the scroll has landed, once the indicator has: the page it stops on and its neighbours', () => {
    const { scrollTo } = lendLayout();
    const { onIndexChange, update } = renderPager({ index: 4 });
    scrollTo(5 * WIDTH);
    expect(drawn()).toEqual(range(3, 7));
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(onIndexChange).toHaveBeenCalledWith(5);
    // The commit of the index changes no window: what the swipe drew stays...
    update({ index: 5 });
    expect(drawn()).toEqual(range(3, 7));
    act(() => {
      vi.advanceTimersByTime(NARROW_LEFT - 1);
    });
    expect(drawn()).toEqual(range(3, 7));
    // ...and the page left behind is skipped when nothing moves.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(drawn()).toEqual([4, 5, 6]);
  });

  it('narrows at an idle moment of the main thread, with a limit', () => {
    const idle: Array<() => void> = [];
    const request = vi.fn((task: () => void, options?: { timeout: number }) => {
      void options;
      idle.push(task);
      return idle.length;
    });
    vi.stubGlobal('requestIdleCallback', request);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const { scrollTo } = lendLayout();
    const { update } = renderPager({ index: 4 });
    scrollTo(5 * WIDTH);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    update({ index: 5 });
    expect(request).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(NARROW);
    });
    // Asked for once the landing of the indicator is over, and not run until the thread is idle.
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]).toEqual({ timeout: NARROW_IDLE_TIMEOUT_MS });
    expect(drawn()).toEqual(range(3, 7));
    act(() => {
      idle[0]();
    });
    expect(drawn()).toEqual([4, 5, 6]);
  });

  it('a gesture that begins while the narrowing waits cancels it, and the next landing asks again', () => {
    const { scrollTo } = lendLayout();
    const { update } = renderPager({ index: 4 });
    scrollTo(5 * WIDTH);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    update({ index: 5 });
    act(() => {
      vi.advanceTimersByTime(NARROW_LEFT - 10);
    });
    scrollTo(5 * WIDTH + 50);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // The first narrowing would have fallen here: the gesture is not over.
    expect(drawn()).toContain(7);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(drawn()).toContain(7);
    act(() => {
      vi.advanceTimersByTime(NARROW);
    });
    expect(drawn()).toEqual([4, 5, 6]);
  });

  it('a gesture that begins before the window has narrowed finds the pages ahead drawn', () => {
    const { scrollTo } = lendLayout();
    const { update } = renderPager({ index: 4 });
    scrollTo(5 * WIDTH);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    update({ index: 5 });
    // The pages 6 and 7 are there from the first swipe, before the second begins.
    expect(drawn()).toContain(6);
    expect(drawn()).toContain(7);
    scrollTo(5 * WIDTH + 50);
    expect(drawn()).toContain(6);
    expect(drawn()).toContain(7);
  });

  it('a scroll that lands on a page the window did not hold never has it skipped', () => {
    const { scrollTo } = lendLayout();
    const { onIndexChange, update } = renderPager({ index: 4 });
    scrollTo(5.5 * WIDTH);
    scrollTo(6 * WIDTH);
    expect(drawn()).toContain(6);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(onIndexChange).toHaveBeenCalledWith(6);
    update({ index: 6 });
    expect(drawn()).toContain(6);
    act(() => {
      vi.advanceTimersByTime(NARROW);
    });
    expect(drawn()).toEqual([5, 6, 7]);
  });

  it('a scroll that comes back to the page it left draws that page and its neighbours', () => {
    const { scrollTo } = lendLayout();
    const { onIndexChange } = renderPager({ index: 4 });
    scrollTo(4 * WIDTH + 300);
    scrollTo(4 * WIDTH);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(drawn()).toEqual(expect.arrayContaining([3, 4, 5]));
    act(() => {
      vi.advanceTimersByTime(NARROW);
    });
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('a scroll event on the page it rests on does nothing', () => {
    const { scrollTo } = lendLayout();
    renderPager({ index: 4 });
    scrollTo(4 * WIDTH);
    expect(drawn()).toEqual([3, 4, 5]);
  });
});

describe('a glide to a far page, and a jump', () => {
  it('a tap on a far dot lands at once: the pages in between are never drawn (ISSUE-109, R10)', () => {
    const { writes, glides, scrollTo } = lendLayout();
    const { update } = renderPager({ index: 1 });
    writes.length = 0;
    update({ index: 7, dotJump: { current: 7 } });
    // No glide, so nothing on the way: the page it lands on and its neighbours are in the window of
    // the commit that changes the index, before the offset is written.
    expect(glides).toHaveLength(0);
    expect(writes).toHaveLength(1);
    expect(writes[0].left).toBe(7 * WIDTH);
    expect(writes[0].far).toEqual(range(0, 5).concat(9));
    expect(drawn()).toEqual([6, 7, 8]);
    // The scroll event of the write widens nothing, and the stop changes nothing.
    scrollTo(7 * WIDTH);
    expect(drawn()).toEqual([6, 7, 8]);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(drawn()).toEqual([6, 7, 8]);
  });

  it('two pages away is already a jump; one page away is still a glide', () => {
    const { glides, writes } = lendLayout();
    const { update } = renderPager({ index: 4 });
    writes.length = 0;
    update({ index: 6, dotJump: { current: 6 } });
    expect(glides).toHaveLength(0);
    expect(writes.at(-1)?.left).toBe(6 * WIDTH);
    update({ index: 7, dotJump: { current: 7 } });
    expect(glides).toHaveLength(1);
    expect(glides[0].left).toBe(7 * WIDTH);
  });

  it('only a dot jumps: the same index from the edge of a drag, or «Annulla», glides the whole way', () => {
    const { glides, writes } = lendLayout();
    const { update } = renderPager({ index: 4, dragging: true, locked: true });
    writes.length = 0;
    // A page with no widgets in between: the edge of the drag turns two pages at once.
    update({ index: 6, dragging: true, locked: true });
    expect(writes).toHaveLength(0);
    expect(glides).toHaveLength(1);
    expect(glides[0].left).toBe(6 * WIDTH);
    // The page in between is drawn before the glide starts.
    expect(glides[0].far).not.toContain(5);
    update({ index: 1, dragging: false, locked: false });
    expect(glides).toHaveLength(2);
    expect(glides[1].far).toEqual(expect.not.arrayContaining([2, 3, 4, 5]));
  });

  it('the request of a dot is for one index alone: it is taken, and another index is not a jump', () => {
    const { glides, writes } = lendLayout();
    const dotJump = { current: 3 as number | null };
    const { update } = renderPager({ index: 4, dotJump });
    writes.length = 0;
    // The request is for the page 8; the index that arrives is the 9th page (a swipe settled).
    dotJump.current = 8;
    update({ index: 6, dotJump });
    expect(glides).toHaveLength(1);
    expect(dotJump.current).toBeNull();
    // Taken: the next index from outside is not a jump even if it is the one asked before.
    update({ index: 9, dotJump });
    expect(writes).toHaveLength(0);
    expect(glides).toHaveLength(2);
  });

  it('a tap on the dot next to the page glides, and the next one while it glides glides too', () => {
    const { glides, writes } = lendLayout();
    const { update } = renderPager({ index: 1 });
    writes.length = 0;
    update({ index: 2 });
    // The glide has not stopped: the scroll rests, for the pager, where it is going.
    update({ index: 3 });
    expect(writes).toHaveLength(0);
    expect(glides.map(({ left }) => left)).toEqual([2 * WIDTH, 3 * WIDTH]);
    expect(drawn()).toEqual(range(0, 4));
  });

  it('a glide to the page next to it draws nothing more: the page is in the window, and the window moves when it has landed', () => {
    const { glides } = lendLayout();
    const { update } = renderPager({ index: 4 });
    const before = { className: pager().className, far: far() };
    update({ index: 5 });
    expect(glides).toHaveLength(1);
    expect({ className: pager().className, far: far() }).toEqual(before);
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('a glide to the page next to it draws the page past it as the scroll goes there, and narrows when it has landed', () => {
    const { scrollTo } = lendLayout();
    const { update } = renderPager({ index: 4 });
    update({ index: 5 });
    // Going to a known page, the glide needs no page ahead of the one it reaches.
    for (const page of [4.2, 4.7, 5]) {
      scrollTo(page * WIDTH);
      expect(drawn()).toEqual(range(3, 6));
    }
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(drawn()).toEqual(range(3, 6));
    act(() => {
      vi.advanceTimersByTime(NARROW);
    });
    expect(drawn()).toEqual([4, 5, 6]);
    // A swipe on the page it stopped on, to either side, finds the neighbours drawn.
    scrollTo(5 * WIDTH + 80);
    expect(drawn()).toEqual(expect.arrayContaining([4, 5, 6]));
    scrollTo(5 * WIDTH - 80);
    expect(drawn()).toEqual(expect.arrayContaining([4, 5, 6]));
  });

  it.each([
    ['the keyboard', () => (document.documentElement.dataset.acaInput = 'keyboard'), false],
    ['reduced motion', () => undefined, true],
  ])(
    '%s lands at once: the page it lands on is drawn when the scroll is written',
    (_name, prepare, reducedMotion) => {
      const { writes, glides } = lendLayout();
      prepare();
      const { update } = renderPager({ index: 1, reducedMotion });
      writes.length = 0;
      update({ index: 7 });
      expect(glides).toHaveLength(0);
      expect(writes).toHaveLength(1);
      expect(writes[0].left).toBe(7 * WIDTH);
      // In the same commit as the index, before the offset is written: no page on the way.
      expect(writes[0].far).toEqual(range(0, 5).concat(9));
      expect(drawn()).toEqual([6, 7, 8]);
    }
  );

  it('a jump, as the row opens and the pages change, leaves nothing drawn behind it', () => {
    const { writes } = lendLayout();
    const { update } = renderPager({ index: 1, pages: pages.slice(0, 8) });
    writes.length = 0;
    // The pages change with the index (a page removed): it lands at once.
    update({ index: 6, pages: pages.slice(0, 7) });
    expect(writes.at(-1)?.left).toBe(6 * WIDTH);
    expect(drawn()).toEqual([5, 6]);
  });
});

describe('the window while a widget is dragged', () => {
  it('keeps two pages on each side from the start of the drag', () => {
    lendLayout();
    const { update } = renderPager({ index: 4 });
    expect(drawn()).toEqual([3, 4, 5]);
    update({ dragging: true, locked: true });
    expect(drawn()).toEqual(range(2, 6));
  });

  it('turning a page at the edge draws no page in the middle of the gesture', () => {
    const { glides } = lendLayout();
    const { update } = renderPager({ index: 4, dragging: true, locked: true });
    update({ index: 5, dragging: true, locked: true });
    // The page it turns to was drawn since the start of the drag, and so is the glide's whole way.
    expect(glides).toHaveLength(1);
    expect(glides[0].far).not.toContain(5);
    expect(glides[0].far).not.toContain(6);
    expect(drawn()).toEqual(range(3, 7));
  });

  it('is back to the neighbours after the drag ends, later and at a moment of quiet, not in the commit that ends it (W3)', () => {
    lendLayout();
    vi.useFakeTimers();
    const { update } = renderPager({ index: 4, dragging: true, locked: true });
    update({ index: 4, dragging: false, locked: false });
    // The commit that ends the session writes no `data-far` (tracing of 2026-10-25) ...
    expect(drawn()).toEqual(range(2, 6));
    act(() => {
      vi.advanceTimersByTime(NARROW - 1);
    });
    expect(drawn()).toEqual(range(2, 6));
    // ... the window narrows once the time of quiet has passed.
    act(() => {
      vi.advanceTimersByTime(NARROW_IDLE_TIMEOUT_MS + 50);
    });
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('a drag taken up again before the window narrows keeps it (W3)', () => {
    lendLayout();
    vi.useFakeTimers();
    const { update } = renderPager({ index: 4, dragging: true, locked: true });
    update({ index: 4, dragging: false, locked: false });
    act(() => {
      vi.advanceTimersByTime(NARROW - 50);
    });
    update({ index: 4, dragging: true, locked: true });
    act(() => {
      vi.advanceTimersByTime(NARROW + NARROW_IDLE_TIMEOUT_MS + 50);
    });
    expect(drawn()).toEqual(range(2, 6));
    update({ index: 4, dragging: false, locked: false });
    act(() => {
      vi.advanceTimersByTime(NARROW + NARROW_IDLE_TIMEOUT_MS + 50);
    });
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('a held pager without a dragged widget (the Casa 3D page, a name being edited) keeps the usual window', () => {
    lendLayout();
    renderPager({ index: 4, locked: true });
    expect(drawn()).toEqual([3, 4, 5]);
  });
});

describe('the window in the overview', () => {
  it('draws the cards in view and one more on each side (five of ten)', () => {
    lendLayout();
    const { update } = renderPager({ index: 4 });
    update({ overview: true });
    expect(drawn()).toEqual(range(2, 6));
    expect(far()).toEqual([0, 1, 7, 8, 9]);
  });

  it('at the ends of the row the window loses the side that is not there', () => {
    lendLayout();
    const { update } = renderPager({ index: 0 });
    update({ overview: true });
    expect(drawn()).toEqual([0, 1, 2]);
  });

  it('the cards are in reach and named while skipped, as they were', () => {
    lendLayout();
    const { update } = renderPager({ index: 4 });
    update({ overview: true });
    sections().forEach((section, position) => {
      expect(section).not.toHaveAttribute('aria-hidden');
      expect(section).not.toHaveAttribute('inert');
      expect(section.querySelector('.aca-pager__open')).toHaveAttribute(
        'aria-label',
        `Apri P${position}`
      );
    });
    // The skipped ones are the cards the clip of which is skipped, not their opener or footer.
    expect(far()).toEqual([0, 1, 7, 8, 9]);
    expect(sections()[9].querySelector('.aca-pager__body > .aca-pager__clip')).not.toBeNull();
  });

  it('nothing is skipped until the cards are measured', () => {
    // No layout: no measure, no window (the stylesheet could not tell what is in view).
    const { update } = renderPager({ index: 4 });
    update({ overview: true });
    expect(far()).toEqual([]);
  });

  it('a card dragged to a new place takes the cards in view with it', () => {
    lendLayout();
    const { update } = renderPager({ index: 4, overview: true });
    expect(drawn()).toEqual(range(2, 6));
    // Card 4 two places to the right: 5 and 6 step aside, 3 and 6 are in view.
    update({ overview: true, cardDrag: { from: 4, to: 6, offset: 2 * 744 } });
    expect(drawn()).toEqual(range(2, 7));
    update({ overview: true, cardDrag: null });
    expect(drawn()).toEqual(range(2, 6));
  });

  it('follows the centre when a card is chosen', () => {
    lendLayout();
    const { update } = renderPager({ index: 4, overview: true });
    update({ index: 7, overview: true });
    expect(drawn()).toEqual(range(5, 9));
  });

  it('keeps the window of the overview while the cards go back, and the usual one when they have', () => {
    lendLayout();
    const { update } = renderPager({ index: 4, overview: true });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    update({ index: 4, overview: false });
    // Closing: the cards are still cards.
    expect(drawn()).toEqual(range(2, 6));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(drawn()).toEqual([3, 4, 5]);
  });

  it('overviewWindow and restWindow are the same numbers the page shows', () => {
    const frame = { width: 1000, k: 0.72, pitch: 744 };
    expect(overviewWindow(10, 4, frame, 0, null)).toEqual([2, 6]);
    // Half a pitch to the left: the card 3 (1.5 pitches away) leaves the view, the 6 is not yet in.
    expect(overviewWindow(10, 4, frame, -372, null)).toEqual([3, 6]);
    // A whole pitch: 4, 5 and 6 are in view.
    expect(overviewWindow(10, 4, frame, -744, null)).toEqual([3, 7]);
    expect(overviewWindow(10, 4, null, 0, null)).toEqual([0, 9]);
    expect(restWindow(10, 4, null, false)).toEqual([3, 5]);
    expect(restWindow(10, 4, { lo: 4, hi: 5, dir: 1 }, false)).toEqual([3, 7]);
    expect(restWindow(10, 4, { lo: 3, hi: 4, dir: -1 }, false)).toEqual([1, 5]);
    expect(restWindow(10, 0, null, true)).toEqual([0, 2]);
  });
});

describe('the pan of the cards', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    pointerType = 'touch';
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 1;
    }
  }

  it('draws the cards that come into view as the finger goes, and goes back to rest with it', () => {
    lendLayout();
    vi.stubGlobal('PointerEvent', Pointer);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);
    renderPager({ index: 4, overview: true });
    expect(drawn()).toEqual(range(2, 6));
    const move = (clientX: number) => {
      act(() => {
        window.dispatchEvent(new Pointer('pointermove', { pointerId: 1, clientX, clientY: 200 }));
        for (const frame of frames.splice(0)) frame(0);
      });
    };
    act(() => {
      fireEvent(
        pager(),
        new Pointer('pointerdown', { pointerId: 1, clientX: 800, clientY: 200, bubbles: true })
      );
    });
    move(780);
    // The pan began at 780: a whole pitch to the left of it, the cards 4, 5 and 6 are in view and
    // the 7 is the one more.
    move(780 - 744);
    expect(drawn()).toEqual(range(3, 7));
    // Back to rest where it began.
    move(780);
    expect(drawn()).toEqual(range(2, 6));
    act(() => {
      window.dispatchEvent(new Pointer('pointercancel', { pointerId: 1 }));
    });
    expect(drawn()).toEqual(range(2, 6));
  });
});

describe('what is measured in a page that was skipped', () => {
  /** A widget that measures itself (calendar, tasks, the category widget) and says what it saw. */
  function Measured({ label }: { label: string }) {
    const [ref, height] = useMeasuredHeight<HTMLDivElement>();
    return (
      <div ref={ref} data-testid={`measured-${label}`}>
        {height ?? 'unmeasured'}
      </div>
    );
  }
  const measuredPages: PagerPage[] = pages.map((page, position) => ({
    ...page,
    content: <Measured label={`p${position}`} />,
  }));

  class FakeObserver {
    static all: FakeObserver[] = [];
    observed = new Set<Element>();
    disconnected = false;
    constructor(public callback: ResizeObserverCallback) {
      FakeObserver.all.push(this);
    }
    observe(element: Element) {
      this.observed.add(element);
    }
    unobserve(element: Element) {
      this.observed.delete(element);
    }
    disconnect() {
      this.disconnected = true;
      this.observed.clear();
    }
    /** The element changed size: the callback hears of it, as in the frame it is drawn again. */
    report(element: Element, height: number) {
      this.callback(
        [{ target: element, contentRect: { height } } as unknown as ResizeObserverEntry],
        this as unknown as ResizeObserver
      );
    }
  }
  const observerOf = (testId: string) =>
    FakeObserver.all.find((observer) =>
      [...observer.observed].some((element) => element.getAttribute('data-testid') === testId)
    )!;

  beforeEach(() => {
    FakeObserver.all = [];
    vi.stubGlobal('ResizeObserver', FakeObserver);
  });

  it('the observers of a skipped page are not disconnected, nor made again, as the window moves', () => {
    const { scrollTo } = lendLayout();
    renderPager({ pages: measuredPages, index: 4 });
    const observer = observerOf('measured-p7');
    const observed = [...observer.observed];
    scrollTo(4 * WIDTH + 50);
    scrollTo(5 * WIDTH);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    expect(observerOf('measured-p7')).toBe(observer);
    expect(observer.disconnected).toBe(false);
    expect([...observer.observed]).toEqual(observed);
  });

  it('a page is drawn, and told its new size, as the scroll goes next to it, before it can be seen', () => {
    const { scrollTo } = lendLayout();
    const { update } = renderPager({ pages: measuredPages, index: 4 });
    // The page 6 starts skipped: the browser does not tell it that the pager has changed size.
    expect(far()).toContain(6);
    scrollTo(5 * WIDTH);
    act(() => {
      vi.advanceTimersByTime(SETTLE);
    });
    update({ pages: measuredPages, index: 5 });
    // It is drawn since the swipe began (the window follows the scroll from its first event), the
    // page 5 being the one shown: the observer of its widget can report, and the widget measures
    // before a swipe gets there.
    expect(drawn()).toContain(6);
    act(() => {
      observerOf('measured-p6').report(
        document.querySelector('[data-testid="measured-p6"]')!,
        321.4
      );
    });
    expect(document.querySelector('[data-testid="measured-p6"]')).toHaveTextContent('321');
    expect(drawn()).toContain(5);
  });

  it('the pager measures itself, the cards and the position again when it changes size', () => {
    lendLayout();
    renderPager({ pages: measuredPages, index: 4 });
    const own = FakeObserver.all.find((observer) =>
      [...observer.observed].some((element) => element.classList.contains('aca-pager'))
    )!;
    expect(own).toBeDefined();
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(800);
    act(() => {
      own.callback([], own as unknown as ResizeObserver);
    });
    // The window stays where it is, and the offset is written for the new width.
    expect(drawn()).toEqual([3, 4, 5]);
    expect(pager().scrollLeft).toBe(4 * 800);
  });
});

describe('the geometry of a grid on a page that is skipped', () => {
  const page: LauncherPage = {
    id: 'lontana',
    label: 'Lontana',
    kind: 'widgets',
    placements: { phoneLandscape: {} },
  };
  const rectOf = (left: number, top = 0) =>
    ({
      x: left,
      y: top,
      left,
      top,
      width: 500,
      height: 300,
      right: left + 500,
      bottom: top + 300,
      toJSON: () => ({}),
    }) as DOMRect;

  it('is read as on any other: skipping a page leaves its grid, its box and its registration', () => {
    const measures = new Map<string, () => GridGeometry | null>();
    const ui = {
      controller: {
        editMode: true,
        classFor: () => 'phoneLandscape',
        gridFor: () => ({ w: 4, h: 2 }),
      },
      registerGrid: (pageId: string, fn: () => GridGeometry | null) => {
        measures.set(pageId, fn);
        return () => measures.delete(pageId);
      },
      isWidgetHidden: () => false,
      selection: createLauncherSelection(),
    } as unknown as LauncherUi;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.classList.contains('aca-pager__page')) return rectOf(0, 0);
      if (this.classList.contains('aca-launcher-grid')) return rectOf(10, 40);
      return rectOf(0, 0);
    });
    lendLayout();
    const gridPages: PagerPage[] = pages.map((entry, position) => ({
      ...entry,
      content: <WidgetGrid page={{ ...page, id: `page-${position}` }} />,
    }));
    render(
      <LauncherUiContext.Provider value={ui}>
        <Pager
          pages={gridPages}
          index={4}
          onIndexChange={vi.fn()}
          locked={false}
          reducedMotion={false}
        />
      </LauncherUiContext.Provider>
    );
    // «Sposta qui» and the drop from the tray read the grid of a page of the overview that the
    // window had skipped: the grid is registered, and its rectangle is the one of the page drawn.
    expect(far()).toContain(8);
    const skipped = measures.get('page-8')?.();
    const shown = measures.get('page-4')?.();
    expect(skipped).not.toBeNull();
    expect(skipped).toEqual(shown);
    expect(skipped?.left).toBe(10);
    expect(skipped?.top).toBe(40);
    // The read did not draw the page: the attribute is the pager's alone.
    expect(far()).toContain(8);
  });
});

describe('a grid on a page the pager resized while it was skipped (ISSUE-109, review of R10)', () => {
  const page: LauncherPage = {
    id: 'lontana',
    label: 'Lontana',
    kind: 'widgets',
    placements: { phoneLandscape: {} },
  };
  class FakeObserver {
    static all: FakeObserver[] = [];
    constructor(public callback: ResizeObserverCallback) {
      FakeObserver.all.push(this);
    }
    observe(element: Element) {
      this.target = element;
    }
    unobserve() {}
    disconnect() {}
    target: Element | null = null;
  }
  const ui = {
    controller: {
      editMode: false,
      classFor: () => 'phoneLandscape',
      gridFor: () => ({ w: 4, h: 2 }),
    },
    registerGrid: () => () => undefined,
    isWidgetHidden: () => false,
    selection: createLauncherSelection(),
  } as unknown as LauncherUi;
  const gridPages: PagerPage[] = pages.map((entry, position) => ({
    ...entry,
    content: <WidgetGrid page={{ ...page, id: `page-${position}` }} />,
  }));
  /** What the grid of a page says its cell is (the width of the area decides it, see below). */
  const cellOf = (position: number) =>
    sections()
      [position].querySelector<HTMLElement>('.aca-launcher-grid')!
      .style.getPropertyValue('--aca-cell');

  let areaWidth = 500;
  beforeEach(() => {
    FakeObserver.all = [];
    areaWidth = 500;
    vi.stubGlobal('ResizeObserver', FakeObserver);
    lendLayout();
    // The area of a grid is as wide as `areaWidth` and 300 px high; the other boxes are small.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      return this.classList.contains('aca-launcher-page') ? areaWidth : 24;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const area = this.classList.contains('aca-launcher-page');
      return { width: area ? areaWidth : 24, height: area ? 300 : 84 } as DOMRect;
    });
  });

  const renderGrids = (index: number) =>
    render(
      <LauncherUiContext.Provider value={ui}>
        <Pager
          pages={gridPages}
          index={index}
          onIndexChange={vi.fn()}
          locked={false}
          reducedMotion={false}
          skipNear={false}
        />
      </LauncherUiContext.Provider>
    );
  const cellFor = (width: number) =>
    `${cellMetrics(width, 300, { w: 4, h: 2 }, GRID_GAPS.phoneLandscape, 1, true).cell}px`;

  it('measures again in the commit that draws it, not a frame later when its observer reports', () => {
    const view = renderGrids(1);
    expect(far()).toContain(6);
    expect(cellOf(6)).toBe(cellFor(500));
    // The pager changes size: its observer is notified, the one of the skipped grid is not.
    areaWidth = 800;
    const own = FakeObserver.all.find((observer) =>
      observer.target?.classList.contains('aca-pager')
    )!;
    act(() => {
      own.callback([], own as unknown as ResizeObserver);
    });
    expect(cellOf(6)).toBe(cellFor(500));
    expect(cellFor(800)).not.toBe(cellFor(500));
    // A jump to it, the one thing that shows a page with no page of margin: the first commit that
    // draws it already has the measure of the new size.
    view.rerender(
      <LauncherUiContext.Provider value={ui}>
        <Pager
          pages={gridPages}
          index={6}
          onIndexChange={vi.fn()}
          locked={false}
          reducedMotion={false}
          skipNear={false}
          dotJump={{ current: 6 }}
        />
      </LauncherUiContext.Provider>
    );
    expect(far()).not.toContain(6);
    expect(cellOf(6)).toBe(cellFor(800));
  });

  it('reads nothing when the pager has not changed size since the grid measured', () => {
    const view = renderGrids(1);
    const reads = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    reads.mockClear();
    view.rerender(
      <LauncherUiContext.Provider value={ui}>
        <Pager
          pages={gridPages}
          index={6}
          onIndexChange={vi.fn()}
          locked={false}
          reducedMotion={false}
          skipNear={false}
          dotJump={{ current: 6 }}
        />
      </LauncherUiContext.Provider>
    );
    const areas = reads.mock.contexts.filter((element) =>
      (element as HTMLElement).classList.contains('aca-launcher-page')
    );
    expect(areas).toHaveLength(0);
  });
});

describe('the stylesheet', () => {
  let css = '';
  beforeAll(async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    css = fs
      .readFileSync('src/templates/launcher/launcher.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('skips the clip of the pages out of the window, and nothing else', () => {
    // Two uses of it in the app: the pages out of the window, and, since the block of the widgets of
    // 0.9.28 (REP-20261023-006, D-M6), the content of a widget under its resize shape (never a page).
    // The attribute of the window has the one rule that keys on it.
    expect(css.match(/content-visibility/g)).toHaveLength(2);
    expect(css).toMatch(
      /\.aca-launcher-widget\.is-skipped\s*>\s*:is\([^)]*\)\s*\{[^}]*content-visibility: hidden;/
    );
    expect(css.match(/\[data-far\]/g)).toHaveLength(1);
    expect(css).toMatch(
      /\.aca-pager__page\[data-far\] > \.aca-pager__body > \.aca-pager__clip \{\s*content-visibility: hidden;\s*\}/
    );
  });

  it('does not change what a page looks like: no display, visibility or opacity on the skipped ones', () => {
    const body = css.match(/\[data-far\][^{]*\{([^}]*)\}/)?.[1].trim();
    expect(body).toBe('content-visibility: hidden;');
  });
});

/** The page is drawn again when the effect that watches the attribute runs: nothing remounts. */
describe('nothing remounts as the window moves', () => {
  it('a counter inside a page that is skipped and drawn again keeps its value and its mount', () => {
    const { scrollTo } = lendLayout();
    const mounts = vi.fn();
    function Counter() {
      const [count] = useState(7);
      useEffect(() => {
        mounts();
      }, []);
      return <output data-testid="counter">{count}</output>;
    }
    const counting = pages.map((entry, position) =>
      position === 7 ? { ...entry, content: <Counter /> } : entry
    );
    renderPager({ pages: counting, index: 4 });
    expect(far()).toContain(7);
    // A scroll that goes past the window (not a swipe to the next page) draws it, and back.
    scrollTo(5.4 * WIDTH);
    expect(drawn()).toContain(7);
    scrollTo(4 * WIDTH);
    act(() => {
      vi.advanceTimersByTime(SETTLE + NARROW);
    });
    expect(far()).toContain(7);
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-testid="counter"]')).toHaveTextContent('7');
  });
});
