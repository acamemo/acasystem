/**
 * The state of the touch outside the context of the launcher (ISSUE-109, R5a): the widget
 * selected, the one just dropped and the one that refused a move. A change reaches only the
 * components that read that answer.
 */
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createLauncherSelection,
  useAirborneIn,
  useLandedIn,
  useRejected,
  useSelectedIn,
  type LauncherSelection,
} from '@/hooks/launcher/useLauncherSelection';

describe('the store of the selection', () => {
  it('starts with nothing selected, landed or refused', () => {
    const store = createLauncherSelection();
    expect(store.selected()).toBeNull();
    expect(store.landed()).toBeNull();
    expect(store.rejected()).toBeNull();
  });

  it('tells its listeners only when a value changes', () => {
    const store = createLauncherSelection();
    const listener = vi.fn();
    store.subscribe(listener);
    const one = { pageId: 'home', widgetId: 'a' };
    store.setSelected(one);
    expect(listener).toHaveBeenCalledTimes(1);
    // The same object, then null twice: no news.
    store.setSelected(one);
    store.setSelected(null);
    store.setSelected(null);
    expect(listener).toHaveBeenCalledTimes(2);
    store.setLanded(one);
    store.setLanded(one);
    store.setRejected('a');
    store.setRejected('a');
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('takes a function of the current selection, evaluated at once and in order', () => {
    const store = createLauncherSelection();
    store.setSelected({ pageId: 'home', widgetId: 'a' });
    store.setSelected((current) => (current ? { ...current, pageId: 'altra' } : current));
    store.setSelected((current) => (current?.widgetId === 'b' ? null : current));
    expect(store.selected()).toEqual({ pageId: 'altra', widgetId: 'a' });
    // Returning the current value changes nothing and tells no one.
    const listener = vi.fn();
    store.subscribe(listener);
    store.setSelected((current) => current);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops telling a listener that unsubscribed', () => {
    const store = createLauncherSelection();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    stop();
    store.setRejected('a');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('what a grid and a widget read from it', () => {
  const renders = new Map<string, number>();
  const count = (key: string) => renders.get(key) ?? 0;

  function Probe({
    store,
    page,
    widget,
  }: {
    store: LauncherSelection;
    page: string;
    widget: string;
  }) {
    const selected = useSelectedIn(store, page);
    const landed = useLandedIn(store, page);
    const rejected = useRejected(store, widget);
    const key = `${page}/${widget}`;
    renders.set(key, count(key) + 1);
    return (
      <p data-testid={key}>{`${selected ?? '-'} ${landed ?? '-'} ${rejected ? 'led' : 'off'}`}</p>
    );
  }

  function mount(store: LauncherSelection) {
    renders.clear();
    return render(
      <>
        <Probe store={store} page="home" widget="a" />
        <Probe store={store} page="home" widget="b" />
        <Probe store={store} page="altra" widget="c" />
      </>
    );
  }

  it('the selection redraws the page that has it, and the two pages when it passes from one to the other', () => {
    const store = createLauncherSelection();
    const view = mount(store);
    const text = (key: string) => view.getByTestId(key).textContent;
    act(() => store.setSelected({ pageId: 'home', widgetId: 'a' }));
    expect(text('home/a')).toBe('a - off');
    expect(text('home/b')).toBe('a - off');
    expect(text('altra/c')).toBe('- - off');
    // Same page: the two probes of the page redraw, the other page does not.
    expect([count('home/a'), count('home/b'), count('altra/c')]).toEqual([2, 2, 1]);
    act(() => store.setSelected({ pageId: 'altra', widgetId: 'c' }));
    expect(text('home/a')).toBe('- - off');
    expect(text('altra/c')).toBe('c - off');
    expect([count('home/a'), count('home/b'), count('altra/c')]).toEqual([3, 3, 2]);
  });

  it('the widget whose copy is still flying is read by page, and only that page redraws (K6b)', () => {
    const store = createLauncherSelection();
    function Air({ page }: { page: string }) {
      const id = useAirborneIn(store, page);
      return <p data-testid={`air-${page}`}>{id ?? '-'}</p>;
    }
    const view = render(
      <>
        <Air page="home" />
        <Air page="altra" />
      </>
    );
    expect(store.airborne()).toBeNull();
    act(() => store.setAirborne({ pageId: 'altra', widgetId: 'c' }));
    expect(view.getByTestId('air-altra').textContent).toBe('c');
    expect(view.getByTestId('air-home').textContent).toBe('-');
    act(() => store.setAirborne({ pageId: 'altra', widgetId: 'c' }));
    act(() => store.setAirborne(null));
    expect(view.getByTestId('air-altra').textContent).toBe('-');
  });

  it('the landing and the error LED are read the same way, and the LED by widget', () => {
    const store = createLauncherSelection();
    const view = mount(store);
    act(() => store.setLanded({ pageId: 'altra', widgetId: 'c' }));
    expect(view.getByTestId('altra/c').textContent).toBe('- c off');
    expect([count('home/a'), count('home/b'), count('altra/c')]).toEqual([1, 1, 2]);
    act(() => store.setLanded(null));
    expect([count('home/a'), count('home/b'), count('altra/c')]).toEqual([1, 1, 3]);
    // The LED of «a» redraws «a» only (a reader by widget, not by page).
    act(() => store.setRejected('a'));
    expect(view.getByTestId('home/a').textContent).toBe('- - led');
    expect([count('home/a'), count('home/b'), count('altra/c')]).toEqual([2, 1, 3]);
    act(() => store.setRejected(null));
    expect([count('home/a'), count('home/b'), count('altra/c')]).toEqual([3, 1, 3]);
  });

  it('a change made before the first read, or between the render and the subscription, is not lost', () => {
    const store = createLauncherSelection();
    store.setSelected({ pageId: 'home', widgetId: 'b' });
    const view = mount(store);
    expect(view.getByTestId('home/a').textContent).toBe('b - off');
  });
});
