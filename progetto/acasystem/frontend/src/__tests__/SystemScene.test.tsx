/**
 * Sistema over the launcher as a scene (REP-20261023-006, D-M12, block 2 of 0.9.28), in the real
 * LauncherPage: the page is a layer that fades in over the launcher, which is covered and stopped
 * only once the page is there, and on the way out the launcher is shown again under the page
 * before it fades away. The hook alone is in `SheetSystemChoreography.test.tsx`.
 */
import { lazy, Suspense, useContext, useLayoutEffect, type ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistantContextValue } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { LauncherPage } from '@/pages/launcher/LauncherPage';
import {
  OverlayContentReady,
  OverlayContentReadyContext,
} from '@/hooks/launcher/useOverlayScene';

const ha: HomeAssistantContextValue = {
  entities: {},
  connected: true,
  haUnavailable: false,
  haUnavailableVisible: false,
  entitiesLoaded: true,
  entityDataStale: false,
  oauthExpired: false,
  conn: null,
  activeUrl: '',
  haConfig: null,
  lastEntityUpdateAt: 0,
  disconnectedSince: null,
  authRef: { current: null },
  haUser: null,
};
vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  useHomeAssistant: () => ha,
  useHomeAssistantMeta: () => ha,
  useHomeAssistantEntities: () => ha.entities,
  HomeAssistantProvider: ({ children }: { children: unknown }) => children,
}));

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: false },
  pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: { tablet: {} } }],
};

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
    run: () =>
      act(() => {
        const callbacks = [...queue.values()];
        queue.clear();
        for (const callback of callbacks) callback(performance.now());
      }),
  };
}

function lendAnimations() {
  Object.defineProperty(document.documentElement, 'getAnimations', {
    configurable: true,
    value: () => [],
  });
}

const page = <p>Pagina Sistema</p>;

function Page({
  overlay,
  staged,
  waitForContent = false,
}: {
  overlay: ReactNode;
  staged: boolean;
  waitForContent?: boolean;
}) {
  return (
    <ToastProvider>
      <PageProvider>
        <LauncherPage
          onOpenSystem={() => undefined}
          overlay={overlay}
          overlayStaged={staged}
          overlayWaitForContent={waitForContent}
        />
      </PageProvider>
    </ToastProvider>
  );
}


/** A real lazy boundary, resolved by the test rather than by a loading timeout. */
function deferredPage(label: string) {
  let resolve!: (module: { default: () => ReactNode }) => void;
  const pending = new Promise<{ default: () => ReactNode }>((done) => {
    resolve = done;
  });
  const Content = lazy(() => pending);
  return {
    node: (
      <Suspense fallback={<p>Caricamento Sistema</p>}>
        <Content />
        <OverlayContentReady />
      </Suspense>
    ),
    resolve: () =>
      act(async () => {
        resolve({ default: () => <p>{label}</p> });
        await pending;
      }),
  };
}

function CaptureReady({ capture }: { capture: (ready: (() => void) | null) => void }) {
  const ready = useContext(OverlayContentReadyContext);
  useLayoutEffect(() => capture(ready), [capture, ready]);
  return null;
}

const shell = (container: HTMLElement) => container.querySelector('.aca-shell');
const layer = (container: HTMLElement) => container.querySelector('.aca-overlay-scene');

describe('LauncherPage: Sistema in a scene', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(document.documentElement, 'getAnimations');
  });

  it('in: the page is mounted still and the launcher stays on, two frames later it fades, then it covers', async () => {
    const { container, rerender } = render(<Page overlay={null} staged />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    rerender(<Page overlay={page} staged />);
    expect(screen.getByText('Pagina Sistema')).toBeInTheDocument();
    expect(layer(container)).toHaveAttribute('data-scene', 'wait');
    expect(shell(container)?.closest('[hidden]')).toBeNull();
    frames.run();
    frames.run();
    expect(layer(container)).toHaveAttribute('data-scene', 'in');
    expect(shell(container)?.closest('[hidden]')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    expect(shell(container)?.closest('[hidden]')).not.toBeNull();
  });

  it('out: the launcher is shown again under the opaque page, then the page fades and goes', async () => {
    const { container, rerender } = render(<Page overlay={page} staged />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    // Loaded on Sistema: there, covered, no scene.
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    expect(shell(container)?.closest('[hidden]')).not.toBeNull();
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    rerender(<Page overlay={null} staged={false} />);
    expect(layer(container)).toHaveAttribute('data-scene', 'out-wait');
    expect(screen.getByText('Pagina Sistema')).toBeInTheDocument();
    expect(shell(container)?.closest('[hidden]')).toBeNull();
    frames.run();
    frames.run();
    expect(layer(container)).toHaveAttribute('data-scene', 'out');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(layer(container)).toBeNull();
    expect(screen.queryByText('Pagina Sistema')).toBeNull();
  });

  it('a page that is not staged (the house) has no layer and replaces the launcher at once', async () => {
    lendAnimations();
    const { container, rerender } = render(<Page overlay={null} staged={false} />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    rerender(<Page overlay={page} staged={false} />);
    expect(layer(container)).toBeNull();
    expect(screen.getByText('Pagina Sistema')).toBeInTheDocument();
    expect(shell(container)?.closest('[hidden]')).not.toBeNull();
    rerender(<Page overlay={null} staged={false} />);
    expect(screen.queryByText('Pagina Sistema')).toBeNull();
    expect(shell(container)?.closest('[hidden]')).toBeNull();
  });

  it('where nothing animates (jsdom) Sistema is there at once, still in its layer', async () => {
    const { container, rerender } = render(<Page overlay={null} staged />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    rerender(<Page overlay={page} staged />);
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    expect(shell(container)?.closest('[hidden]')).not.toBeNull();
    rerender(<Page overlay={null} staged={false} />);
    expect(layer(container)).toBeNull();
    expect(shell(container)?.closest('[hidden]')).toBeNull();
  });

  it('waits for the resolved lazy page commit before starting the incoming scene', async () => {
    const pending = deferredPage('Sistema completo');
    const { container, rerender } = render(<Page overlay={null} staged waitForContent />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    rerender(<Page overlay={pending.node} staged waitForContent />);
    frames.run();
    frames.run();
    act(() => vi.advanceTimersByTime(1000));
    expect(layer(container)).toHaveAttribute('data-scene', 'wait');
    expect(shell(container)?.closest('[hidden]')).toBeNull();
    expect(screen.queryByText('Sistema completo')).toBeNull();

    await pending.resolve();
    expect(screen.getByText('Sistema completo')).toBeInTheDocument();
    expect(layer(container)).toHaveAttribute('data-scene', 'wait');
    frames.run();
    frames.run();
    expect(layer(container)).toHaveAttribute('data-scene', 'in');
    expect(screen.queryByText('Caricamento Sistema')).toBeNull();
    act(() => vi.advanceTimersByTime(300));
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
  });

  it('ignores readiness from a closed entry and starts a warm reopen only after its new commit', async () => {
    const pending = deferredPage('Secondo Sistema');
    let firstReady: (() => void) | null = null;
    const capture = (ready: (() => void) | null) => {
      firstReady ??= ready;
    };
    const complete = (
      <>
        <p>Sistema pronto</p>
        <CaptureReady capture={capture} />
        <OverlayContentReady />
      </>
    );
    const { container, rerender, unmount } = render(<Page overlay={null} staged waitForContent />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    lendAnimations();
    vi.useFakeTimers();
    const frames = manualFrames();
    rerender(<Page overlay={complete} staged waitForContent />);
    frames.run();
    frames.run();
    act(() => vi.advanceTimersByTime(300));
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    expect(firstReady).not.toBeNull();
    rerender(<Page overlay={null} staged={false} waitForContent />);
    rerender(<Page overlay={pending.node} staged waitForContent />);
    expect(layer(container), 'before stale ready').toHaveAttribute('data-scene', 'wait');
    act(() => firstReady?.());
    expect(layer(container), 'after stale ready').toHaveAttribute('data-scene', 'wait');
    frames.run();
    frames.run();
    expect(layer(container)).toHaveAttribute('data-scene', 'wait');
    expect(shell(container)?.closest('[hidden]')).toBeNull();

    // Cancel the pending entry. Its later resolution cannot revive it or cover Home.
    rerender(<Page overlay={null} staged={false} waitForContent />);
    await pending.resolve();
    frames.run();
    frames.run();
    expect(layer(container)).toBeNull();
    expect(screen.queryByText('Secondo Sistema')).toBeNull();
    expect(shell(container)?.closest('[hidden]')).toBeNull();
    rerender(<Page overlay={pending.node} staged waitForContent />);
    expect(screen.getByText('Secondo Sistema')).toBeInTheDocument();
    expect(layer(container)).toHaveAttribute('data-scene', 'wait');
    frames.run();
    frames.run();
    expect(layer(container)).toHaveAttribute('data-scene', 'in');
    unmount();
    act(() => firstReady?.());
    frames.run();
    frames.run();
    expect(layer(container)).toBeNull();
  });

  it('waits for actual lazy content even without animation APIs, then shows it immediately', async () => {
    const pending = deferredPage('Sistema senza animazioni');
    const { container, rerender } = render(<Page overlay={null} staged waitForContent />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    rerender(<Page overlay={pending.node} staged waitForContent />);
    expect(layer(container)).toHaveAttribute('data-scene', 'wait');
    expect(shell(container)?.closest('[hidden]')).toBeNull();
    await pending.resolve();
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    expect(screen.getByText('Sistema senza animazioni')).toBeInTheDocument();
    expect(shell(container)?.closest('[hidden]')).not.toBeNull();
  });

  it('keeps the existing direct-route and non-staged behavior when readiness is opted in', async () => {
    const { container, rerender } = render(<Page overlay={page} staged waitForContent />);
    await waitFor(() => expect(shell(container)).not.toBeNull());
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    expect(shell(container)?.closest('[hidden]')).not.toBeNull();
    rerender(<Page overlay={<p>Pagina Casa non staged</p>} staged={false} waitForContent />);
    expect(layer(container)).toBeNull();
    expect(screen.getByText('Pagina Casa non staged')).toBeInTheDocument();
    expect(shell(container)?.closest('[hidden]')).not.toBeNull();
  });

});
