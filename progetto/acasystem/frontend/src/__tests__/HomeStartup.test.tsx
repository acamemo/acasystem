import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HomeStartupProvider, HomeStartupView, useHomeStartupSignal, type StartupSignal,
} from '@/hooks/startup/HomeStartupContext';

function Signal({ stage = 'home', value }: { stage?: 'home' | 'access' | 'profile'; value: StartupSignal }) {
  useHomeStartupSignal(stage, value); return null;
}
const pending: StartupSignal = { status: 'pending', scope: 'profile-a' };
const ready: StartupSignal = { status: 'ready', scope: 'profile-a' };
function App({ signal = pending, eligible = true, measured = true }: {
  signal?: StartupSignal; eligible?: boolean; measured?: boolean;
}) {
  return <HomeStartupProvider eligible={eligible} identityManaged={false}>
    <Signal value={signal} />
    <HomeStartupView measured={measured}><button>Comando della casa</button></HomeStartupView>
  </HomeStartupProvider>;
}
function endEntry(container: HTMLElement) {
  const entry = container.querySelector('.aca-home-entry')!;
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: 'aca-home-in' });
  fireEvent(entry, event);
}
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Home startup presentation and owner signals', () => {
  it('shows the loader only after 150ms and keeps the same DOM throughout its 96ms departure', () => {
    const view = render(<App />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => vi.advanceTimersByTime(149));
    expect(screen.queryByRole('status')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    const loader = view.container.querySelector('.aca-home-loader');
    expect(loader).not.toBeNull();
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('inert');
    view.rerender(<App signal={ready} />);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'entering');
    expect(view.container.querySelector('.aca-home-loader')).toBe(loader);
    expect(loader).toHaveAttribute('data-home-loader-state', 'leaving');
    act(() => vi.advanceTimersByTime(95));
    expect(view.container.querySelector('.aca-home-loader')).toBe(loader);
    act(() => vi.advanceTimersByTime(1));
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    endEntry(view.container);
    expect(view.container.querySelector('.aca-home-entry')).not.toHaveAttribute('inert');
  });

  it('makes retained recovery non-interactive as soon as success starts the entry', () => {
    const retry = vi.fn();
    const view = render(<App signal={{ ...pending, status: 'recovery', message: 'Comandi non disponibili.', retry }} />);
    const button = screen.getByRole('button', { name: 'Riprova' }); button.focus();
    view.rerender(<App signal={ready} />);
    expect(view.container.querySelector('.aca-home-loader')).toHaveAttribute('inert');
    expect(screen.queryByRole('button', { name: 'Riprova' })).toBeNull();
    fireEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
  });

  it('returns focus from removed recovery to Home without stealing focus from another control', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    for (const moveAway of [false, true]) {
      const retry = vi.fn();
      const state = (signal: StartupSignal) => <><button>Altro controllo</button><App signal={signal} /></>;
      const view = render(state({ ...pending, status: 'recovery', message: 'Comandi non disponibili.', retry }));
      screen.getByRole('button', { name: 'Riprova' }).focus();
      const other = screen.getByRole('button', { name: 'Altro controllo' });
      if (moveAway) other.focus();
      view.rerender(state(ready));
      endEntry(view.container);
      expect(document.activeElement).toBe(moveAway ? other : view.container.querySelector('.aca-home-entry'));
      expect(retry).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('uses the reduced 120ms completion cap when no animation event is delivered', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(),
      removeEventListener: vi.fn() } as unknown as MediaQueryList)));
    const view = render(<App signal={ready} />);
    const entry = view.container.querySelector('.aca-home-entry');
    act(() => vi.advanceTimersByTime(153));
    expect(entry).toHaveAttribute('data-home-phase', 'entering');
    act(() => vi.advanceTimersByTime(1)); // Shared completion helper allows two frames beyond 120ms.
    expect(entry).toHaveAttribute('data-home-phase', 'ready');
    expect(entry).not.toHaveAttribute('inert');
  });

  it('never shows a loader for an already prepared first view', () => {
    const view = render(<App signal={ready} />);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'entering');
    act(() => vi.advanceTimersByTime(151));
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    endEntry(view.container);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'ready');
  });

  it('shows prolonged preparation as plain text with the shared ACA retry button', () => {
    render(<App signal={{ ...pending, retry: vi.fn() }} />);
    act(() => vi.advanceTimersByTime(10_000));
    const message = screen.getByRole('status');
    expect(message).toHaveTextContent(/^La preparazione sta richiedendo più tempo del dovuto$/);
    expect(message.closest('.aca-m')).toBeNull();
    expect(screen.getByRole('button', { name: 'Riprova' })).toHaveClass('aca-m', 'aca-m--primary');
  });

  it('offers only the current owner retry at 10s and leaves readiness to real results', () => {
    const retry = vi.fn();
    const view = render(<App signal={{ ...pending, retry }} />);
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'preparing');
    view.rerender(<App signal={{ ...pending, status: 'recovery', message: 'Comandi non disponibili.', retry }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Comandi non disponibili.');
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('inert');
  });

  it('ignores an entry completion from a cancelled cycle and prepares the first Home after another route', () => {
    const view = render(<App eligible={false} signal={ready} />);
    act(() => vi.advanceTimersByTime(10_001));
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    view.rerender(<App signal={ready} />);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'entering');
    view.rerender(<App signal={ready} eligible={false} />);
    endEntry(view.container);
    view.rerender(<App signal={pending} />);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'preparing');
  });

  it('does not reopen the global loader on normal reconnect and waits for current geometry before input', () => {
    const view = render(<App signal={ready} />);
    endEntry(view.container);
    view.rerender(<App signal={pending} measured={false} />);
    act(() => vi.advanceTimersByTime(10_001));
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('inert');
    view.rerender(<App signal={pending} measured />);
    expect(view.container.querySelector('.aca-home-entry')).not.toHaveAttribute('inert');
  });

  it('never rerenders a signal-only subtree for loader timers', () => {
    let renders = 0;
    function Child() { renders++; useHomeStartupSignal('home', pending); return <p>Contenuto</p>; }
    const child = <Child />;
    render(<HomeStartupProvider eligible identityManaged={false}>{child}</HomeStartupProvider>);
    const initialRenders = renders;
    act(() => vi.advanceTimersByTime(10_001));
    expect(renders).toBe(initialRenders);
  });

  it('rejects the previous Home acknowledgement when the selected profile changes', () => {
    const accessScope = 'house:user:client';
    const profileA = `${accessScope}:a`, profileB = `${accessScope}:b`;
    const state = (selected: string, shown: string) => <HomeStartupProvider eligible>
      <Signal stage="access" value={{ status: 'ready', scope: accessScope }} />
      <Signal stage="profile" value={{ status: 'ready', scope: selected }} />
      <Signal value={{ status: 'ready', scope: shown }} />
      <HomeStartupView measured><button>Comando</button></HomeStartupView>
    </HomeStartupProvider>;
    const view = render(state(profileA, profileA));
    endEntry(view.container);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'ready');
    view.rerender(state(profileB, profileA));
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'preparing');
    endEntry(view.container);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('inert');
    view.rerender(state(profileB, profileB));
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'entering');
  });

  it('starts a new profile preparation while the old profile id is still the accepted one', () => {
    const accessScope = 'house:user:client', scope = `${accessScope}:a`;
    const state = (status: StartupSignal['status']) => <HomeStartupProvider eligible>
      <Signal stage="access" value={{ status: 'ready', scope: accessScope }} />
      <Signal stage="profile" value={{ status, scope }} />
      {status === 'ready' && <Signal value={{ status: 'ready', scope }} />}
      <HomeStartupView measured><p>Home</p></HomeStartupView>
    </HomeStartupProvider>;
    const view = render(state('ready')); endEntry(view.container);
    view.rerender(state('pending'));
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'preparing');
    act(() => vi.advanceTimersByTime(150));
    expect(view.container.querySelector('.aca-home-loader')).not.toBeNull();
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('inert');
  });

  it('keeps authoritative access and profile gates before a ready Home signal', () => {
    const view = render(<HomeStartupProvider eligible>
      <Signal stage="access" value={pending} /><Signal stage="profile" value={ready} /><Signal value={ready} />
      <HomeStartupView measured><p>Casa riservata</p></HomeStartupView>
    </HomeStartupProvider>);
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'preparing');
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('aria-hidden', 'true');
  });
});
