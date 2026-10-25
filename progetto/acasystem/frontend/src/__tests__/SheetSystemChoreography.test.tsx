/**
 * Choreography of the launcher, block 2 of 0.9.28 (REP-20261023-006, with the user's answers of
 * 2026-10-23): the sheets (D-M5, D-M19), Sistema (D-M12) and the pills and notices (D-M14). The
 * behaviour is tested here with the transitions "on" (the Web Animations API is lent to jsdom, which
 * is how `canAnimate` knows that something moves) and the frames run by hand; the stylesheets are
 * read in `MotionChoreographyBlock2.test.ts`. Without the lent API nothing waits, and every test
 * of the app that closes a sheet or leaves a page runs as before.
 */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sheet } from '@/components/primitives';
import { SHEET_OUT_MS } from '@/components/primitives/components/Sheet';
import { SLOW_FRAMES_MS, TWO_FRAMES_MS } from '@/components/primitives/motion';
import { ConnectionNotice } from '@/components/system/status-bar/ConnectionNotice';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { ToastHost } from '@/components/system/toast/ToastHost';
import { ToastProvider, useToast } from '@/hooks/context/ToastContext';
import { useLeavingItems } from '@/hooks/launcher/useLeaving';
import { SYSTEM_IN_MS, useOverlayScene } from '@/hooks/launcher/useOverlayScene';

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

/** The end of a transition of a property of an element, as the browser sends it. */
function transitionEnd(element: Element, propertyName: string) {
  act(() => {
    element.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName }));
  });
}

/** The start of a transition of a property of an element, as the browser sends it. */
function transitionRun(element: Element, propertyName: string) {
  act(() => {
    element.dispatchEvent(Object.assign(new Event('transitionrun'), { propertyName }));
  });
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

const originalMatchMedia = window.matchMedia;

let tests = 0;
beforeEach(() => {
  vi.useFakeTimers();
  // Each test has a new clock, and the sheet remembers when the last one left (D-M19): a later
  // time in each test, so that a sheet that went in an earlier one does not hold back the next.
  tests += 1;
  vi.advanceTimersByTime(60_000 * tests);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document.documentElement, 'getAnimations');
  window.matchMedia = originalMatchMedia;
});

function SheetHarness({ open, withContent = true }: { open: boolean; withContent?: boolean }) {
  return (
    <Sheet
      open={open}
      onClose={() => undefined}
      title={open ? 'Titolo aperto' : 'Titolo vuoto'}
      description={open ? 'Descrizione aperta' : undefined}
      footer={open ? <button type="button">Fatto</button> : null}
    >
      {open && withContent ? <p>Contenuto del foglio</p> : null}
    </Sheet>
  );
}

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;

describe('sheets: the content stays until the panel is gone (D-M5, T-04)', () => {
  it('keeps the content, title, description and footer while it goes down, then drops them', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
    rerender(<SheetHarness open={false} />);
    // The owner has cleared its state in this commit; the sheet still shows what it showed.
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
    expect(screen.getByText('Titolo aperto')).toBeInTheDocument();
    expect(screen.getByText('Descrizione aperta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fatto', hidden: true })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
    // The cap of the exit: 200 ms and two frames, for a transition that sends no event.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Contenuto del foglio')).toBeNull();
    expect(screen.getByText('Titolo vuoto')).toBeInTheDocument();
  });

  it('ends with the transition of the panel, before the cap', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    rerender(<SheetHarness open={false} />);
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
    transitionEnd(dialog(), 'transform');
    expect(screen.queryByText('Contenuto del foglio')).toBeNull();
  });

  it('ignores the end of a transition of something inside the sheet', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    rerender(<SheetHarness open={false} />);
    transitionEnd(screen.getByText('Contenuto del foglio'), 'transform');
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
  });

  it('the cap counts from the start of the transition: a slow exit keeps the content until it ends (0.9.28)', () => {
    // On the tablet the exit begins a restyle after the commit and ends later than its 200 ms; a
    // cap counted from the commit let the closed content replace the frozen one while the panel
    // was still on screen (layout-shift 0.09, REP-20261023-006).
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    rerender(<SheetHarness open={false} />);
    act(() => {
      vi.advanceTimersByTime(30);
    });
    transitionRun(dialog(), 'transform');
    // 250 ms after the commit: the cap from the commit (234 ms) has passed, the exit is still going.
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
    expect(screen.getByText('Titolo aperto')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
    // The end of the transition ends the wait, whenever it comes.
    transitionEnd(dialog(), 'transform');
    expect(screen.queryByText('Contenuto del foglio')).toBeNull();
    expect(screen.getByText('Titolo vuoto')).toBeInTheDocument();
  });

  it('a transition that starts and never ends is let go after its time, two frames and the slack', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    rerender(<SheetHarness open={false} />);
    transitionRun(dialog(), 'transform');
    act(() => {
      vi.advanceTimersByTime(SHEET_OUT_MS + TWO_FRAMES_MS + SLOW_FRAMES_MS - 1);
    });
    expect(screen.getByText('Contenuto del foglio')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Contenuto del foglio')).toBeNull();
  });

  it('the start of a transition of something inside the sheet moves nothing', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    rerender(<SheetHarness open={false} />);
    act(() => {
      vi.advanceTimersByTime(30);
    });
    transitionRun(screen.getByText('Contenuto del foglio'), 'transform');
    // The cap of the commit stands: 200 ms and two frames.
    act(() => {
      vi.advanceTimersByTime(SHEET_OUT_MS + TWO_FRAMES_MS - 30);
    });
    expect(screen.queryByText('Contenuto del foglio')).toBeNull();
  });

  it('opened again while it goes down, shows the new content at once', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    rerender(<SheetHarness open={false} />);
    rerender(<SheetHarness open withContent={false} />);
    expect(screen.queryByText('Contenuto del foglio')).toBeNull();
  });

  it('without the Web Animations API (jsdom, old engines) the content goes at once, as before', () => {
    const { rerender } = render(<SheetHarness open />);
    rerender(<SheetHarness open={false} />);
    expect(screen.queryByText('Contenuto del foglio')).toBeNull();
  });
});

describe('sheets: the structure first, the content when the panel has arrived (D-M5)', () => {
  it('data-arrived comes with the end of the rise, or with the cap of 280 ms and two frames', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open={false} />);
    rerender(<SheetHarness open />);
    expect(dialog()).toHaveAttribute('open');
    expect(dialog()).not.toHaveAttribute('data-arrived');
    transitionEnd(dialog(), 'transform');
    expect(dialog()).toHaveAttribute('data-arrived');

    // Opened again, a while after (no sheet to overlap): the structure alone, and now the cap ends
    // the rise.
    rerender(<SheetHarness open={false} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender(<SheetHarness open />);
    expect(dialog()).not.toHaveAttribute('data-arrived');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(dialog()).not.toHaveAttribute('data-arrived');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(dialog()).toHaveAttribute('data-arrived');
  });

  it('is not removed on the way down: the content stays visible until the panel is gone', () => {
    lendAnimations();
    const { rerender } = render(<SheetHarness open />);
    transitionEnd(dialog(), 'transform');
    rerender(<SheetHarness open={false} />);
    expect(dialog()).toHaveAttribute('data-arrived');
  });

  it('with reduced motion, and where nothing moves, the content is there at once', () => {
    lendAnimations();
    reducedMotion(true);
    const { unmount } = render(<SheetHarness open />);
    expect(dialog()).toHaveAttribute('data-arrived');
    unmount();
    reducedMotion(false);
    Reflect.deleteProperty(document.documentElement, 'getAnimations');
    render(<SheetHarness open />);
    expect(dialog()).toHaveAttribute('data-arrived');
  });
});

describe('two sheets in a row: the second comes when the first is half out (D-M19)', () => {
  function Two({ which }: { which: 'a' | 'b' | null }) {
    return (
      <>
        <Sheet open={which === 'a'} onClose={() => undefined} title="Primo">
          <p>Contenuto primo</p>
        </Sheet>
        <Sheet open={which === 'b'} onClose={() => undefined} title="Secondo">
          <p>Contenuto secondo</p>
        </Sheet>
      </>
    );
  }
  const dialogs = () => Array.from(document.querySelectorAll('dialog'));

  it('waits about 100 ms, then opens and takes the focus', () => {
    lendAnimations();
    const { rerender } = render(<Two which="a" />);
    expect(dialogs()[0]).toHaveAttribute('open');
    rerender(<Two which="b" />);
    expect(dialogs()[0]).not.toHaveAttribute('open');
    expect(dialogs()[1]).not.toHaveAttribute('open');
    act(() => {
      vi.advanceTimersByTime(90);
    });
    expect(dialogs()[1]).not.toHaveAttribute('open');
    act(() => {
      vi.advanceTimersByTime(15);
    });
    expect(dialogs()[1]).toHaveAttribute('open');
  });

  it('opens at once when no sheet has just gone', () => {
    lendAnimations();
    const { rerender } = render(<Two which="a" />);
    rerender(<Two which={null} />);
    // Long after: the first has gone.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender(<Two which="b" />);
    expect(dialogs()[1]).toHaveAttribute('open');
  });

  it('a second sheet closed before its turn never opens', () => {
    lendAnimations();
    const { rerender } = render(<Two which="a" />);
    rerender(<Two which="b" />);
    rerender(<Two which={null} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(dialogs()[1]).not.toHaveAttribute('open');
  });

  it('without the Web Animations API the second opens in the same commit, as before', () => {
    const { rerender } = render(<Two which="a" />);
    rerender(<Two which="b" />);
    expect(dialogs()[1]).toHaveAttribute('open');
  });
});

describe('Sistema over the launcher: a scene (D-M12, D-M25)', () => {
  const page = <p>Sistema</p>;
  const probe = (overlay: boolean, staged = true) =>
    renderHook(
      ({ overlay: shown, staged: isStaged }) => useOverlayScene(shown ? page : null, isStaged),
      { initialProps: { overlay, staged } }
    );

  it('comes in: mounted still, the launcher untouched; two frames later it fades in; covered at the end', () => {
    lendAnimations();
    const frames = manualFrames();
    const { result, rerender } = probe(false);
    expect(result.current.phase).toBe('none');
    expect(result.current.node).toBeNull();
    rerender({ overlay: true, staged: true });
    // The commit of the change: the page is there, transparent, and nothing is covered.
    expect(result.current.phase).toBe('wait');
    expect(result.current.node).toBe(page);
    expect(result.current.staged).toBe(true);
    expect(result.current.covered).toBe(false);
    frames.run();
    expect(result.current.phase).toBe('wait');
    frames.run();
    expect(result.current.phase).toBe('in');
    expect(result.current.covered).toBe(false);
    // The fade lasts SYSTEM_IN_MS (140 ms since 2026-10-24, 240 before): not covered before it ends.
    act(() => {
      vi.advanceTimersByTime(SYSTEM_IN_MS);
    });
    expect(result.current.phase).toBe('in');
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.phase).toBe('on');
    expect(result.current.covered).toBe(true);
  });

  it('goes out: the launcher is shown again under the page, which is still opaque, then it fades and goes', () => {
    lendAnimations();
    const frames = manualFrames();
    const { result, rerender } = probe(true);
    // Loaded on Sistema: there, no scene.
    expect(result.current.phase).toBe('on');
    expect(result.current.covered).toBe(true);
    rerender({ overlay: false, staged: false });
    // The page that leaves is the one that was there, and the launcher is no longer covered.
    expect(result.current.phase).toBe('out-wait');
    expect(result.current.node).toBe(page);
    expect(result.current.staged).toBe(true);
    expect(result.current.covered).toBe(false);
    frames.run();
    frames.run();
    expect(result.current.phase).toBe('out');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.phase).toBe('none');
    expect(result.current.node).toBeNull();
  });

  it('the end of the transition of the opacity closes the scene before the cap', () => {
    lendAnimations();
    const frames = manualFrames();
    const element = document.createElement('div');
    const { result, rerender } = probe(true);
    result.current.sceneRef.current = element;
    rerender({ overlay: false, staged: false });
    frames.run();
    frames.run();
    expect(result.current.phase).toBe('out');
    transitionEnd(element, 'opacity');
    expect(result.current.phase).toBe('none');
  });

  it('a second tap while it goes out brings it back from where it is, without waiting', () => {
    lendAnimations();
    const frames = manualFrames();
    const { result, rerender } = probe(true);
    rerender({ overlay: false, staged: false });
    frames.run();
    frames.run();
    expect(result.current.phase).toBe('out');
    rerender({ overlay: true, staged: true });
    expect(result.current.phase).toBe('in');
    expect(result.current.node).toBe(page);
  });

  it('asked to leave before it was there, it goes back from where it is, with nothing covered', () => {
    lendAnimations();
    const frames = manualFrames();
    const { result, rerender } = probe(false);
    rerender({ overlay: true, staged: true });
    frames.run();
    frames.run();
    expect(result.current.phase).toBe('in');
    rerender({ overlay: false, staged: false });
    expect(result.current.phase).toBe('out');
    expect(result.current.covered).toBe(false);
  });

  it('asked to leave before it moved, it is unmounted at once', () => {
    lendAnimations();
    manualFrames();
    const { result, rerender } = probe(false);
    rerender({ overlay: true, staged: true });
    expect(result.current.phase).toBe('wait');
    rerender({ overlay: false, staged: false });
    expect(result.current.phase).toBe('none');
    expect(result.current.node).toBeNull();
  });

  it('a page that is not staged (the house) replaces the launcher at once, as before', () => {
    lendAnimations();
    const { result, rerender } = probe(false, false);
    rerender({ overlay: true, staged: false });
    expect(result.current.phase).toBe('on');
    expect(result.current.staged).toBe(false);
    expect(result.current.covered).toBe(true);
    rerender({ overlay: false, staged: false });
    expect(result.current.phase).toBe('none');
    expect(result.current.node).toBeNull();
    expect(result.current.covered).toBe(false);
  });

  it('where nothing animates (jsdom) the page is there or not, as before', () => {
    const { result, rerender } = probe(false);
    rerender({ overlay: true, staged: true });
    expect(result.current.phase).toBe('on');
    expect(result.current.covered).toBe(true);
    rerender({ overlay: false, staged: false });
    expect(result.current.phase).toBe('none');
    expect(result.current.node).toBeNull();
    expect(result.current.covered).toBe(false);
  });

  it('moving from Sistema to the house in the middle of the scene leaves no scene behind', () => {
    lendAnimations();
    const frames = manualFrames();
    const { result, rerender } = probe(false);
    rerender({ overlay: true, staged: true });
    frames.run();
    frames.run();
    expect(result.current.phase).toBe('in');
    rerender({ overlay: true, staged: false });
    expect(result.current.phase).toBe('on');
    expect(result.current.covered).toBe(true);
  });
});

describe('toasts and notices that go leave in 160 ms (D-M14)', () => {
  function Adder() {
    const { addToast } = useToast();
    return (
      <button type="button" onClick={() => addToast('Non è andata', 'error')}>
        Aggiungi
      </button>
    );
  }
  const renderToasts = () =>
    render(
      <ToastProvider>
        <Adder />
        <ToastHost />
      </ToastProvider>
    );

  it('a toast that expires stays for the exit, marked, out of the accessibility tree, then goes', () => {
    lendAnimations();
    renderToasts();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    const leaving = document.querySelector('.aca-toast.is-leaving');
    expect(leaving).not.toBeNull();
    expect(leaving).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(document.querySelector('.aca-toast')).toBeNull();
  });

  it('without the Web Animations API it goes at once', () => {
    renderToasts();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(document.querySelector('.aca-toast')).toBeNull();
  });

  it('the list keeps what leaves in its place and puts what comes at the end', () => {
    lendAnimations();
    type Item = { id: number; text: string };
    const { result, rerender } = renderHook(
      ({ items }: { items: Item[] }) => useLeavingItems(items, 160),
      {
        initialProps: {
          items: [
            { id: 1, text: 'uno' },
            { id: 2, text: 'due' },
          ],
        },
      }
    );
    rerender({
      items: [
        { id: 2, text: 'due' },
        { id: 3, text: 'tre' },
      ],
    });
    expect(result.current.map((entry) => [entry.item.id, entry.leaving])).toEqual([
      [1, true],
      [2, false],
      [3, false],
    ]);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.map((entry) => entry.item.id)).toEqual([2, 3]);
  });

  it('the connection notice leaves in 160 ms, inert, and then goes', () => {
    lendAnimations();
    const props = {
      oauthExpired: false,
      disconnectedSince: null,
      onRetry: () => undefined,
      onSignIn: () => undefined,
    };
    const { container, rerender } = render(<ConnectionNotice visible {...props} />);
    expect(container.querySelector('.aca-connection-notice')).not.toBeNull();
    rerender(<ConnectionNotice visible={false} {...props} />);
    const leaving = container.querySelector('.aca-connection-notice.is-leaving');
    expect(leaving).not.toBeNull();
    expect(leaving).toHaveAttribute('inert');
    expect(leaving).toHaveAttribute('aria-hidden', 'true');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.querySelector('.aca-connection-notice')).toBeNull();
    // Back while it goes: the same notice, no longer leaving.
    rerender(<ConnectionNotice visible {...props} />);
    expect(container.querySelector('.aca-connection-notice.is-leaving')).toBeNull();
  });

  it('the connection notice goes at once where nothing animates', () => {
    const props = {
      oauthExpired: false,
      disconnectedSince: null,
      onRetry: () => undefined,
      onSignIn: () => undefined,
    };
    const { container, rerender } = render(<ConnectionNotice visible {...props} />);
    rerender(<ConnectionNotice visible={false} {...props} />);
    expect(container.querySelector('.aca-connection-notice')).toBeNull();
  });
});

describe('the page name of the indicator is a cross-fade of 120 ms (D-M14, F-12)', () => {
  const labels = ['Principale', 'Luci', 'Clima'];
  /** Text, the part of the cross-fade it plays and whether assistive technology skips it. */
  const names = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.aca-indicator__label')).map((label) => [
      label.textContent,
      label.classList.contains('aca-indicator__label--entering')
        ? 'in'
        : label.classList.contains('aca-indicator__label--leaving')
          ? 'out'
          : 'rest',
      label.getAttribute('aria-hidden'),
    ]);

  it('the old name stays out of the flow, fading out, over the new one, which fades in', () => {
    lendAnimations();
    const { container, rerender } = render(
      <PageIndicator labels={labels} index={0} onChange={() => undefined} />
    );
    expect(names(container)).toEqual([['Principale', 'rest', 'true']]);
    rerender(<PageIndicator labels={labels} index={1} onChange={() => undefined} />);
    expect(names(container)).toEqual([
      ['Luci', 'in', 'true'],
      ['Principale', 'out', 'true'],
    ]);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(names(container)).toEqual([['Luci', 'rest', 'true']]);
  });

  it('where nothing animates the name changes at once, in the same element', () => {
    const { container, rerender } = render(
      <PageIndicator labels={labels} index={0} onChange={() => undefined} />
    );
    const label = container.querySelector('.aca-indicator__label');
    rerender(<PageIndicator labels={labels} index={2} onChange={() => undefined} />);
    expect(container.querySelectorAll('.aca-indicator__label')).toHaveLength(1);
    expect(container.querySelector('.aca-indicator__label')).toBe(label);
    expect(label).toHaveTextContent('Clima');
  });
});
