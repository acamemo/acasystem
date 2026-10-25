/**
 * Sistema as a scene does not render the launcher for its phases (REP-20261023-006, 0.9.28,
 * measurement of the evening of 2026-10-23). The steps that start in a frame (wait to in, out-wait
 * to out) are committed with `flushSync`; with the launcher rendered again inside them the second
 * task of the exit was 162-221 ms. The launcher is an element of its own (LauncherPage), and the
 * phases that change nothing of it do not render it. The behaviour of the scene itself is in
 * `SystemScene.test.tsx`; here `LauncherScreen` counts how many times it is rendered.
 */
import type { ReactNode } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistantContextValue } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { LauncherPage } from '@/pages/launcher/LauncherPage';

const screen = vi.hoisted(() => ({ renders: 0 }));
vi.mock('@/templates/launcher/LauncherScreen', () => ({
  LauncherScreen: () => {
    screen.renders += 1;
    return <div className="aca-shell" />;
  },
}));

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

const page = <p>Pagina Sistema</p>;
// A constant, as `openSystem` of the routes is (useCallback): a new function would be a change.
const openSystem = () => undefined;

function Page({ overlay, staged }: { overlay: ReactNode; staged: boolean }) {
  return (
    <ToastProvider>
      <PageProvider>
        <LauncherPage onOpenSystem={openSystem} overlay={overlay} overlayStaged={staged} />
      </PageProvider>
    </ToastProvider>
  );
}

const layer = (container: HTMLElement) => container.querySelector('.aca-overlay-scene');

describe('LauncherPage: the phases of the scene of Sistema do not render the launcher', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    Object.defineProperty(document.documentElement, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(document.documentElement, 'getAnimations');
  });

  it('in: wait, in and on render the layer, not the screen', async () => {
    const { container, rerender } = render(<Page overlay={null} staged />);
    await waitFor(() => expect(container.querySelector('.aca-shell')).not.toBeNull());
    vi.useFakeTimers();
    const frames = manualFrames();
    const before = screen.renders;
    rerender(<Page overlay={page} staged />);
    expect(layer(container)).toHaveAttribute('data-scene', 'wait');
    frames.run();
    frames.run();
    expect(layer(container)).toHaveAttribute('data-scene', 'in');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    expect(container.querySelector('.aca-shell')?.closest('[hidden]')).not.toBeNull();
    // Not once: the screen is the same element in each of the phases.
    expect(screen.renders).toBe(before);
  });

  it('out: the launcher is shown again under the page, then the page fades, still without rendering the screen', async () => {
    const { container, rerender } = render(<Page overlay={page} staged />);
    await waitFor(() => expect(container.querySelector('.aca-shell')).not.toBeNull());
    expect(layer(container)).toHaveAttribute('data-scene', 'on');
    vi.useFakeTimers();
    const frames = manualFrames();
    const before = screen.renders;
    rerender(<Page overlay={null} staged={false} />);
    expect(layer(container)).toHaveAttribute('data-scene', 'out-wait');
    expect(container.querySelector('.aca-shell')?.closest('[hidden]')).toBeNull();
    frames.run();
    frames.run();
    expect(layer(container)).toHaveAttribute('data-scene', 'out');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(layer(container)).toBeNull();
    expect(screen.renders).toBe(before);
  });
});
