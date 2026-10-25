/**
 * The pages view as a staged scene (REP-20261023-006, D-M25, blocco 1 della 0.9.28): the state is
 * committed first, with what moves still at its old look, and the class of movement comes two
 * frames later, after the block of the commit. Here the hook that stages it (useStagedScene,
 * useHeld) and what the pager does in the wait: the classes that give the look, the closing that
 * runs no clock while nothing moves, the card that comes in (D-M24) and the one that leaves, and the
 * flag that tells a long press to wait (D-M18). jsdom has no layout: a pager 1000 x 500 px is lent.
 */
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageOverviewBar } from '@/components/system/edit/PageOverviewBar';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import {
  isStaged,
  useHeld,
  useStaged,
  useStagedScene,
  type Stage,
} from '@/hooks/launcher/useStagedScene';
import { HeldByStage } from '@/templates/launcher/HeldByStage';
import { FlashingPageIndicator } from '@/templates/launcher/FlashingPageIndicator';
import {
  CLOSING_CARD_DELAY_MS,
  CLOSING_SAFETY_MS,
  OPENING_CARD_DELAY_MS,
  OVERVIEW_MS,
  Pager,
  type PagerPage,
  type PagerProps,
} from '@/templates/launcher/Pager';

// `flushSync` is watched, not replaced: the end of a wait must not ask for it.
const flushSync = vi.hoisted(() => vi.fn());
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  flushSync.mockImplementation(actual.flushSync);
  return { ...actual, flushSync };
});

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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(Element.prototype, 'scrollTo');
});

/** The host of a scene and what hangs on it in one: the wait as the pager and the bars see it. */
function useBoth(value: boolean, enabled: boolean, stageClosing = true, stageOpening = true) {
  const stage = useStagedScene(value, enabled, stageClosing, stageOpening);
  return { stage, staged: useStaged(stage) };
}

describe('useStagedScene: the movement comes two frames after the commit (D-M25)', () => {
  it('is true from the commit of a change until the second frame, and not before', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ value, enabled }) => useBoth(value, enabled), {
      initialProps: { value: false, enabled: true },
    });
    expect(result.current.staged).toBe(false);
    expect(frames.pending()).toBe(0);
    rerender({ value: true, enabled: true });
    // The commit that carries the new state is the one that starts the wait.
    expect(result.current.staged).toBe(true);
    frames.run();
    // The first frame has drawn the result of the commit: the movement does not start in it.
    expect(result.current.staged).toBe(true);
    frames.run();
    expect(result.current.staged).toBe(false);
    expect(frames.pending()).toBe(0);
  });

  it('with the wait on the closing too, a change inside the wait starts it again', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ value }) => useBoth(value, true), {
      initialProps: { value: true },
    });
    rerender({ value: false });
    expect(result.current.staged).toBe(true);
    frames.run();
    // Fine and a new press inside the wait: two frames from the last change, not from the first.
    rerender({ value: true });
    expect(result.current.staged).toBe(true);
    frames.run();
    expect(result.current.staged).toBe(true);
    frames.run();
    expect(result.current.staged).toBe(false);
  });

  it('«Fine» does not wait (0.9.28, choice of 2026-10-24): the closing starts in the commit of the tap, the opening still waits two frames', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ value }) => useBoth(value, true, false), {
      initialProps: { value: false },
    });
    rerender({ value: true });
    expect(result.current.staged).toBe(true);
    frames.run();
    expect(result.current.staged).toBe(true);
    frames.run();
    expect(result.current.staged).toBe(false);
    // Fine: no wait, so no frame is asked for and nothing is held.
    rerender({ value: false });
    expect(result.current.staged).toBe(false);
    expect(isStaged(result.current.stage)).toBe(false);
    expect(frames.pending()).toBe(0);
  });

  it('the opening does not wait either (0.9.28, choice of 2026-10-25, «Un tempo solo»): the scene starts in the commit of the threshold', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ value }) => useBoth(value, true, false, false), {
      initialProps: { value: false },
    });
    rerender({ value: true });
    // The commit that carries the new state carries the look too: nothing is held, no frame asked.
    expect(result.current.staged).toBe(false);
    expect(isStaged(result.current.stage)).toBe(false);
    expect(frames.pending()).toBe(0);
    rerender({ value: false });
    expect(result.current.staged).toBe(false);
    expect(frames.pending()).toBe(0);
  });

  it('«Fine» inside the wait of the opening closes at once and leaves no frame pending', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ value }) => useBoth(value, true, false), {
      initialProps: { value: false },
    });
    rerender({ value: true });
    frames.run();
    expect(result.current.staged).toBe(true);
    rerender({ value: false });
    expect(result.current.staged).toBe(false);
    // The frame the old wait asked for may still run: it ends a wait that is not the current one.
    frames.run();
    expect(result.current.staged).toBe(false);
    expect(frames.pending()).toBe(0);
  });

  it('does not wait where there is nothing to move (no size, reduced motion)', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ value, enabled }) => useBoth(value, enabled), {
      initialProps: { value: false, enabled: false },
    });
    rerender({ value: true, enabled: false });
    expect(result.current.staged).toBe(false);
    expect(frames.pending()).toBe(0);
  });

  it('leaves no frame behind when it goes', () => {
    const frames = manualFrames();
    const { rerender, unmount } = renderHook(({ value }) => useBoth(value, true), {
      initialProps: { value: false },
    });
    rerender({ value: true });
    expect(frames.pending()).toBe(1);
    unmount();
    expect(frames.pending()).toBe(0);
  });

  it('isStaged reads the wait at the moment it is asked, for an event handler', () => {
    const frames = manualFrames();
    const { result, rerender } = renderHook(({ value }) => useBoth(value, true), {
      initialProps: { value: false },
    });
    expect(isStaged(result.current.stage)).toBe(false);
    rerender({ value: true });
    const { stage } = result.current;
    expect(isStaged(stage)).toBe(true);
    frames.run();
    frames.run();
    // The same stage object, held by a handler of the commit of the wait: it says the wait is over.
    expect(isStaged(stage)).toBe(false);
  });
});

describe('the end of the wait renders what hangs on the scene, not the host (0.9.28, D-M25)', () => {
  /** A host with a bar and a big part that must not render for the end of the wait. */
  function setup() {
    const renders = { host: 0, big: 0, bar: 0 };
    function Big() {
      renders.big += 1;
      return <p>big</p>;
    }
    function Bar({ stage, value }: { stage: Stage; value: boolean }) {
      return (
        <HeldByStage stage={stage} value={value}>
          {(shown) => {
            renders.bar += 1;
            return <output data-testid="bar">{shown ? 'on' : 'off'}</output>;
          }}
        </HeldByStage>
      );
    }
    function Host({ value }: { value: boolean }) {
      renders.host += 1;
      const stage = useStagedScene(value, true);
      return (
        <>
          <Big />
          <Bar stage={stage} value={value} />
        </>
      );
    }
    return { renders, Host };
  }
  const bar = () => document.querySelector('[data-testid="bar"]');

  it('the host and the big parts are not rendered at the end; the bar is, and takes the new look', () => {
    const frames = manualFrames();
    const { renders, Host } = setup();
    const { rerender } = render(<Host value={false} />);
    rerender(<Host value />);
    // The wait: the bar keeps the look it had.
    expect(bar()).toHaveTextContent('off');
    const before = { ...renders };
    frames.run();
    frames.run();
    expect(bar()).toHaveTextContent('on');
    expect(renders.host).toBe(before.host);
    expect(renders.big).toBe(before.big);
    expect(renders.bar).toBeGreaterThan(before.bar);
    expect(frames.pending()).toBe(0);
  });

  it('it is rendered in the frame that ends the wait, not in a task after it', async () => {
    // Outside act, as in the browser: the frame callback runs and the render must follow it in the
    // same turn (a microtask), before the restyle of the frame. A plain setState in the frame is
    // rendered in a later task, a frame after (that is what flushSync was for).
    const { Host } = setup();
    const { rerender } = render(<Host value={false} />);
    const queue: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      queue.push(callback);
      return queue.length;
    });
    rerender(<Host value />);
    expect(bar()).toHaveTextContent('off');
    const flags = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previous = flags.IS_REACT_ACT_ENVIRONMENT;
    flags.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      // The two frames of the wait, run by hand: the first asks for the second.
      while (queue.length) {
        for (const callback of queue.splice(0)) callback(performance.now());
      }
      await Promise.resolve();
      expect(bar()).toHaveTextContent('on');
    } finally {
      flags.IS_REACT_ACT_ENVIRONMENT = previous;
    }
  });

  it('no flushSync is asked for the end of the wait', () => {
    const frames = manualFrames();
    const { Host } = setup();
    const { rerender } = render(<Host value={false} />);
    flushSync.mockClear();
    rerender(<Host value />);
    frames.run();
    frames.run();
    expect(bar()).toHaveTextContent('on');
    expect(flushSync).not.toHaveBeenCalled();
  });
});

describe('useHeld: what hangs on the scene keeps its look during the wait', () => {
  it('returns the value it had when the hold began, and takes the new one when it ends', () => {
    const { result, rerender } = renderHook(({ value, hold }) => useHeld(value, hold), {
      initialProps: { value: false, hold: false },
    });
    expect(result.current).toBe(false);
    // The state changes in the commit that begins the wait: the bar still shows the old look.
    rerender({ value: true, hold: true });
    expect(result.current).toBe(false);
    rerender({ value: true, hold: false });
    expect(result.current).toBe(true);
    // Back: the same, the other way.
    rerender({ value: false, hold: true });
    expect(result.current).toBe(true);
    rerender({ value: false, hold: false });
    expect(result.current).toBe(false);
  });

  it('follows the value at once when nothing is held', () => {
    const { result, rerender } = renderHook(({ value }) => useHeld(value, false), {
      initialProps: { value: 1 },
    });
    rerender({ value: 2 });
    expect(result.current).toBe(2);
  });

  it('holds an object by its fields: a new object with the same fields is not a change', () => {
    const { result, rerender } = renderHook(({ value, hold }) => useHeld(value, hold), {
      initialProps: { value: { a: 1, b: false }, hold: false },
    });
    const first = result.current;
    rerender({ value: { a: 1, b: false }, hold: false });
    expect(result.current).toEqual(first);
    // Held: the object it had, and a new one with the same fields does not replace it.
    rerender({ value: { a: 2, b: false }, hold: true });
    expect(result.current).toBe(first);
    rerender({ value: { a: 2, b: false }, hold: true });
    expect(result.current).toBe(first);
    rerender({ value: { a: 2, b: false }, hold: false });
    expect(result.current).toEqual({ a: 2, b: false });
  });
});

describe('the pager in the wait of a staged scene (D-M25)', () => {
  const pages: PagerPage[] = ['Uno', 'Due', 'Tre'].map((label) => ({
    key: label,
    label,
    content: <p>{label}</p>,
  }));
  const pager = () => document.querySelector<HTMLElement>('.aca-pager')!;
  const bodies = () => [...document.querySelectorAll<HTMLElement>('.aca-pager__body')];
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  function lendLayout() {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(24);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(84);
    Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
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
      update: (next: Partial<PagerProps>) =>
        view.rerender(<Pager {...base} {...props} {...next} />),
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    lendLayout();
  });

  it('opening: the state is committed, the look is not; the class comes with the frame the scene starts', () => {
    const { update } = renderPager();
    update({ overview: true, staged: true });
    // What is state is there already: the body is out of reach, the layer of the gaps is up, the
    // controls are mounted (hidden by default), the cells are inert.
    expect(bodies().every((body) => body.hasAttribute('inert'))).toBe(true);
    expect(pager().querySelector('.aca-pager__surface')).not.toBeNull();
    expect(document.querySelectorAll('.aca-pager__footer')).toHaveLength(3);
    // What is look is not: the pages stay as they were until the scene starts.
    expect(pager()).not.toHaveClass('is-overview');
    expect(pager()).not.toHaveClass('is-entering');
    update({ overview: true, staged: false });
    expect(pager()).toHaveClass('is-overview');
    // The cards are held back by the gap of the scene only while it runs (launcher.css).
    expect(pager()).toHaveClass('is-entering');
    tick(OVERVIEW_MS + OPENING_CARD_DELAY_MS + CLOSING_CARD_DELAY_MS - 1);
    expect(pager()).toHaveClass('is-entering');
    tick(1);
    expect(pager()).not.toHaveClass('is-entering');
    expect(pager()).toHaveClass('is-overview');
  });

  it('closing: the opener and the controls stay, out of reach, until the cards are back; they fade on their own time (D-M3)', () => {
    const { update } = renderPager();
    update({ overview: true });
    const open = () => [...document.querySelectorAll<HTMLElement>('.aca-pager__open')];
    const footers = () => [...document.querySelectorAll<HTMLElement>('.aca-pager__footer')];
    expect(open().some((node) => node.hasAttribute('inert'))).toBe(false);
    update({ overview: false, staged: true });
    expect(open()).toHaveLength(3);
    expect(footers()).toHaveLength(3);
    // Out of reach from the commit: a tap during the glide opens nothing, and focus has no place.
    expect(open().every((node) => node.hasAttribute('inert'))).toBe(true);
    expect(footers().every((node) => node.hasAttribute('inert'))).toBe(true);
    update({ overview: false, staged: false });
    tick(CLOSING_SAFETY_MS + 20);
    expect(pager()).toHaveClass('is-settling');
    // The cards are back: nothing of the cards is left to stand in the way of the page.
    expect(open()).toHaveLength(0);
    expect(footers()).toHaveLength(0);
  });

  it('opening without a wait gives the look at once, as before', () => {
    const { update } = renderPager();
    update({ overview: true });
    expect(pager()).toHaveClass('is-overview');
  });

  it('closing: the cards keep their look through the wait and run no clock; the glide runs after it', () => {
    const { update } = renderPager();
    update({ overview: true });
    update({ overview: false, staged: true });
    // Still the cards: not the glide, which would start before the block of the commit is over.
    expect(pager()).toHaveClass('is-overview');
    expect(pager()).not.toHaveClass('is-closing');
    // No timer ends a glide that has not begun: whatever the wait lasts (a long block), it holds.
    tick(10 * OVERVIEW_MS);
    expect(pager()).toHaveClass('is-overview');
    expect(pager()).not.toHaveClass('is-settling');
    update({ overview: false, staged: false });
    expect(pager()).toHaveClass('is-closing');
    expect(pager()).not.toHaveClass('is-overview');
    // From the frame the glide starts, the clock counts: the delay of the cards is in it.
    tick(CLOSING_SAFETY_MS + 20);
    expect(pager()).not.toHaveClass('is-closing');
    expect(pager()).toHaveClass('is-settling');
  });

  it('closing, the transitions of the content end in the first frame after the commit, also in the wait', () => {
    const frames = manualFrames();
    const { update } = renderPager();
    update({ overview: true });
    expect(frames.pending()).toBe(0);
    update({ overview: false, staged: true });
    // One frame asked for at the commit: the one that ends the content transitions.
    expect(frames.pending()).toBe(1);
    frames.run();
    expect(frames.pending()).toBe(0);
    // The scene starts: the frame that counts the clock.
    update({ overview: false, staged: false });
    expect(frames.pending()).toBe(1);
  });

  it('the card delay of the closing is the one the clock allows for (R1)', () => {
    // The transition of a card ends CLOSING_CARD_DELAY_MS + OVERVIEW_MS after it begins; the safety
    // timer lets it end and no more than 50 ms over.
    expect(CLOSING_SAFETY_MS).toBe(OVERVIEW_MS + CLOSING_CARD_DELAY_MS + 50);
    expect(OPENING_CARD_DELAY_MS).toBe(2 * 40);
    expect(CLOSING_CARD_DELAY_MS).toBe(40);
  });

  it('the busy flag is up from the closing to the end of the settling, in the wait too (D-M18)', () => {
    const busyRef = { current: false };
    const { update } = renderPager({ busyRef });
    expect(busyRef.current).toBe(false);
    update({ overview: true, busyRef });
    expect(busyRef.current).toBe(false);
    update({ overview: false, staged: true, busyRef });
    expect(busyRef.current).toBe(true);
    update({ overview: false, staged: false, busyRef });
    expect(busyRef.current).toBe(true);
    tick(CLOSING_SAFETY_MS + 20);
    // The cards are back; the pages settle for one more frame.
    expect(pager()).toHaveClass('is-settling');
    expect(busyRef.current).toBe(true);
    tick(50);
    expect(pager()).not.toHaveClass('is-settling');
    expect(busyRef.current).toBe(false);
  });

  it('reports whether it has a size', () => {
    const onReadyChange = vi.fn();
    renderPager({ onReadyChange });
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it('a page that comes in is committed hidden and comes two frames later; with no overview at once (D-M24)', () => {
    const frames = manualFrames();
    const { update } = renderPager({ overview: true });
    frames.run();
    frames.run();
    const four = { key: 'Quattro', label: 'Quattro', content: <p>Quattro</p> };
    update({ overview: true, pages: [...pages, four] });
    const mark = () => document.querySelectorAll('.aca-pager__page.is-new').length;
    expect(mark()).toBe(1);
    frames.run();
    expect(mark()).toBe(1);
    frames.run();
    expect(mark()).toBe(0);
    // Outside the overview there is nothing to show: the mark goes with the commit's effects.
    const five = { key: 'Cinque', label: 'Cinque', content: <p>Cinque</p> };
    update({ overview: false, pages: [...pages, four, five] });
    expect(mark()).toBe(0);
  });

  it('a card React moved goes over the others while it glides, and is back on its layer when the glide ends (D-M24)', () => {
    const listeners = new Map<Element, Record<string, () => void>>();
    const animate = vi.fn(function (this: Element) {
      const handlers: Record<string, () => void> = {};
      listeners.set(this, handlers);
      return {
        addEventListener: (type: string, handler: () => void) => {
          handlers[type] = handler;
        },
      };
    });
    Object.assign(Element.prototype, { animate, getAnimations: () => [] });
    try {
      const { update } = renderPager({ overview: true });
      update({ overview: true, pages: [pages[1], pages[0], pages[2]] });
      const moved = () => [...document.querySelectorAll('.aca-pager__page.is-moved')];
      // The two pages that changed places glide from where they were; both are above the third.
      expect(animate).toHaveBeenCalledTimes(2);
      expect(moved()).toHaveLength(2);
      expect(
        moved()
          .map((node) => node.getAttribute('aria-label'))
          .sort()
      ).toEqual(['Due', 'Uno']);
      const [first] = moved();
      act(() => listeners.get(first)?.finish());
      expect(moved()).toHaveLength(1);
      // A glide that is cut short (a new order) lets go too.
      act(() => listeners.get(moved()[0])?.cancel());
      expect(moved()).toHaveLength(0);
    } finally {
      Reflect.deleteProperty(Element.prototype, 'animate');
      Reflect.deleteProperty(Element.prototype, 'getAnimations');
    }
  });

  it('the card of a page that is leaving is marked, and only that one (D-M24)', () => {
    const { update } = renderPager({ overview: true });
    update({ overview: true, leavingKey: 'Due' });
    const leaving = [...document.querySelectorAll('.aca-pager__page.is-leaving')];
    expect(leaving).toHaveLength(1);
    expect(leaving[0].getAttribute('aria-label')).toBe('Due');
    update({ overview: true, leavingKey: null });
    expect(document.querySelectorAll('.aca-pager__page.is-leaving')).toHaveLength(0);
  });
});

describe('the indicator gives its place to the «Annulla» pill in a short time (D-M24)', () => {
  const labels = ['Casa', 'Luci'];
  const indicator = () => document.querySelector<HTMLElement>('.aca-indicator')!;

  it('hidden to yield it has the short exit; hidden for any other reason, or shown, has not', () => {
    const { rerender } = render(
      <PageIndicator labels={labels} index={0} onChange={() => undefined} hidden yielding />
    );
    expect(indicator()).toHaveClass('aca-indicator--hidden', 'aca-indicator--yield');
    rerender(<PageIndicator labels={labels} index={0} onChange={() => undefined} hidden />);
    expect(indicator()).toHaveClass('aca-indicator--hidden');
    expect(indicator()).not.toHaveClass('aca-indicator--yield');
    // Shown: it comes back on the entrance of the bars, the class of the exit is gone.
    rerender(<PageIndicator labels={labels} index={0} onChange={() => undefined} yielding />);
    expect(indicator()).not.toHaveClass('aca-indicator--hidden');
    expect(indicator()).not.toHaveClass('aca-indicator--yield');
  });

  it('in the pages view it yields to the pill; elsewhere the pill takes nothing from it', () => {
    const props = { labels, index: 0, onChange: () => undefined, pageKey: 'home' };
    const { rerender } = render(<FlashingPageIndicator {...props} editMode overview yieldToUndo />);
    expect(indicator()).toHaveClass('aca-indicator--hidden', 'aca-indicator--yield');
    // The pill is gone: the indicator is back, after its own gap in the style sheet.
    rerender(<FlashingPageIndicator {...props} editMode overview />);
    expect(indicator()).not.toHaveClass('aca-indicator--hidden');
    expect(indicator()).not.toHaveClass('aca-indicator--yield');
    // A pill outside the pages view hangs at the bottom: the indicator stays.
    rerender(<FlashingPageIndicator {...props} editMode overview={false} yieldToUndo />);
    expect(indicator()).not.toHaveClass('aca-indicator--hidden');
  });

  it('the delay of the pages view is a class of the indicator, there with the overview and only then (K1)', () => {
    const props = { labels, index: 0, onChange: () => undefined, pageKey: 'home' };
    const { rerender } = render(<FlashingPageIndicator {...props} editMode overview />);
    expect(indicator()).toHaveClass('aca-indicator--overview');
    rerender(<FlashingPageIndicator {...props} editMode overview={false} />);
    expect(indicator()).not.toHaveClass('aca-indicator--overview');
    rerender(<PageIndicator labels={labels} index={0} onChange={() => undefined} />);
    expect(indicator()).not.toHaveClass('aca-indicator--overview');
  });

  it('the class comes in the commit in which the pager takes is-overview, not before (K1, D-M25)', () => {
    const frames = manualFrames();
    const props = { labels, index: 0, onChange: () => undefined, pageKey: 'home' };
    function Both({ overview }: { overview: boolean }) {
      const stage = useStagedScene(overview, true);
      return (
        <>
          <Pager
            pages={[{ key: 'a', label: 'A', content: <p>A</p> }]}
            index={0}
            onIndexChange={vi.fn()}
            locked={false}
            reducedMotion={false}
            overview={overview}
            stage={stage}
          />
          <HeldByStage stage={stage} value={{ editMode: overview, overview }}>
            {(held) => (
              <FlashingPageIndicator {...props} editMode={held.editMode} overview={held.overview} />
            )}
          </HeldByStage>
        </>
      );
    }
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(500);
    Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
    const { rerender } = render(<Both overview={false} />);
    const pagerNode = () => document.querySelector<HTMLElement>('.aca-pager')!;
    rerender(<Both overview />);
    // The wait: the pager keeps its look, and so does the indicator.
    expect(pagerNode()).not.toHaveClass('is-overview');
    expect(indicator()).not.toHaveClass('aca-indicator--overview');
    frames.run();
    expect(indicator()).not.toHaveClass('aca-indicator--overview');
    frames.run();
    // The frame the scene starts: both take the look together.
    expect(pagerNode()).toHaveClass('is-overview');
    expect(indicator()).toHaveClass('aca-indicator--overview');
  });
});

describe('the bar of the pages waits for its place by a class, set with the pager (K1b)', () => {
  const noop = () => undefined;
  function Both({ overview }: { overview: boolean }) {
    // As the launcher: the opening waits, «Fine» does not.
    const stage = useStagedScene(overview, true, false);
    return (
      <>
        <Pager
          pages={[{ key: 'a', label: 'A', content: <p>A</p> }]}
          index={0}
          onIndexChange={vi.fn()}
          locked={false}
          reducedMotion={false}
          overview={overview}
          stage={stage}
        />
        <HeldByStage stage={stage} value={overview}>
          {(shown) => (
            <PageOverviewBar
              hidden={!shown}
              overview={shown}
              pageName="A"
              widgetCount={0}
              deleteBlocked={null}
              isHome={false}
              homeBlocked={null}
              isHidden={false}
              hideBlocked={null}
              onSetHome={noop}
              onDelete={noop}
              onToggleHidden={noop}
              onAdd={noop}
              onBlocked={noop}
              onDone={noop}
            />
          )}
        </HeldByStage>
      </>
    );
  }
  const bar = () => document.querySelector<HTMLElement>('.aca-page-overview')!;
  const pagerNode = () => document.querySelector<HTMLElement>('.aca-pager')!;

  it('it comes with is-overview and goes with it, in the same commit, without a :has() on the main area', () => {
    const frames = manualFrames();
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(500);
    Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
    const { rerender } = render(<Both overview={false} />);
    expect(bar()).not.toHaveClass('aca-page-overview--overview');
    rerender(<Both overview />);
    expect(pagerNode()).not.toHaveClass('is-overview');
    expect(bar()).not.toHaveClass('aca-page-overview--overview');
    frames.run();
    frames.run();
    expect(pagerNode()).toHaveClass('is-overview');
    expect(bar()).toHaveClass('aca-page-overview--overview');
    expect(bar()).not.toHaveClass('aca-page-overview--hidden');
    // «Fine» does not wait: the pager takes is-closing and the bar loses the class together.
    rerender(<Both overview={false} />);
    expect(pagerNode()).toHaveClass('is-closing');
    expect(pagerNode()).not.toHaveClass('is-overview');
    expect(bar()).not.toHaveClass('aca-page-overview--overview');
    expect(bar()).toHaveClass('aca-page-overview--hidden');
  });
});
