/**
 * Sistema over the launcher as a scene (REP-20261023-006, D-M12, block 2 of 0.9.28), in the real
 * LauncherPage: the page is a layer that fades in over the launcher, which is covered and stopped
 * only once the page is there, and on the way out the launcher is shown again under the page
 * before it fades away. The hook alone is in `SheetSystemChoreography.test.tsx`.
 */
import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistantContextValue } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { LauncherPage } from '@/pages/launcher/LauncherPage';

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

function Page({ overlay, staged }: { overlay: ReactNode; staged: boolean }) {
  return (
    <ToastProvider>
      <PageProvider>
        <LauncherPage onOpenSystem={() => undefined} overlay={overlay} overlayStaged={staged} />
      </PageProvider>
    </ToastProvider>
  );
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
});
