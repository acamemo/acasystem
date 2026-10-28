/**
 * The demo mode, `#/mockup` (REP-20261028-005): the REAL app tree - the providers of `main.tsx`,
 * `App`, the routes, `LauncherPage`, the Sistema page - mounted unchanged over a simulated Home
 * Assistant. Only the source of data and the storage differ; nothing reaches the network, and the
 * storage of the real app is left as it was found.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBackendOverride } from '@/api/backendClient';
import { getDemoSource } from '@/api/demoSource';
import { ConfigProvider } from '@/hooks/context/ConfigContext';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import {
  DEMO_FLAG_KEY,
  isDemoHash,
  normalizeDemoPath,
  resolveDemoMode,
} from '@/routes/mockupRoutes';

// The marker: the real LauncherPage, wrapped only to count how often the tree renders it.
const launcherRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/pages/launcher/LauncherPage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/pages/launcher/LauncherPage')>();
  return {
    ...original,
    LauncherPage: (props: Parameters<typeof original.LauncherPage>[0]) => {
      launcherRenders.count += 1;
      return <original.LauncherPage {...props} />;
    },
  };
});

type DemoModeModule = typeof import('@/utils/mockup/demoMode');
type AppModule = typeof import('@/app');
type OverlayModule = typeof import('@/pages/mockup/DemoOverlay');

let demoMode: DemoModeModule;
let App: AppModule['App'];
let DemoOverlay: OverlayModule['default'];

// The tree is a big one: its first import transforms the whole widget set.
beforeAll(async () => {
  demoMode = await import('@/utils/mockup/demoMode');
  ({ App } = await import('@/app'));
  DemoOverlay = (await import('@/pages/mockup/DemoOverlay')).default;
  await import('@/pages/kit2/Kit2Page');
}, 180_000);

const REAL_KEYS: Record<string, string> = {
  tunet_launcher_layout: '{"version":1,"cover":{"enabled":false},"pages":[]}',
  tunet_pages_config: '{"pages":["real"],"header":[],"real":["light.cucina"]}',
  tunet_card_settings: '{"real::light.cucina":{"bindingEntityId":"light.cucina"}}',
  tunet_page_settings: '{"real":{"label":"Casa vera"}}',
  tunet_widget_memory: '{"devices":{}}',
  ha_auth_method: 'token',
  ha_token: 'token-vero',
};

const snapshot = (storage: Storage): Record<string, string | null> =>
  Object.fromEntries(
    Array.from({ length: storage.length }, (_, index) => {
      const key = storage.key(index)!;
      return [key, storage.getItem(key)];
    })
  );

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

/** The tree of `main.tsx` after `enterDemo()`, with the demo bar beside it. */
function openDemo(path = '/') {
  demoMode.enterDemo();
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <ConfigProvider>
          <PageProvider>
            <App />
          </PageProvider>
        </ConfigProvider>
        <Where />
      </MemoryRouter>
      <DemoOverlay />
    </ToastProvider>
  );
}

const demoReady = () =>
  waitFor(() => expect(screen.getByLabelText('Modalità dimostrativa')).toBeInTheDocument(), {
    timeout: 60_000,
  });

const systemOpen = () =>
  screen.findByRole('heading', { level: 1, name: 'Sistema' }, { timeout: 30_000 });

const widgetsReady = (container: HTMLElement) =>
  waitFor(() => expect(container.querySelector('[aria-label="Luce soggiorno"]')).not.toBeNull(), {
    timeout: 60_000,
  });

let fetchSpy: ReturnType<typeof vi.fn>;
let webSocketSpy: ReturnType<typeof vi.fn>;
let reloadSpy: ReturnType<typeof vi.spyOn>;
let realLocal: Record<string, string | null>;
let realSession: Record<string, string | null>;
let realLocalDescriptor: PropertyDescriptor | undefined;
let realSessionDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  for (const [key, value] of Object.entries(REAL_KEYS)) localStorage.setItem(key, value);
  sessionStorage.setItem('tunet_entity_snapshot', '{"ts":1,"data":{}}');
  realLocal = snapshot(localStorage);
  realSession = snapshot(sessionStorage);
  realLocalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  realSessionDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
  launcherRenders.count = 0;
  fetchSpy = vi.fn(() => Promise.reject(new Error('Nessuna richiesta è ammessa nella demo')));
  webSocketSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('WebSocket', webSocketSpy);
  reloadSpy = vi.spyOn(demoMode.pageControl, 'reload');
  reloadSpy.mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  // Whatever a test left open is taken down, as the page would on leaving.
  demoMode.leaveDemo();
  reloadSpy.mockRestore();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '';
});

describe('#/mockup is the real app', () => {
  it('mounts the real LauncherPage with widgets of several types from the simulated house', async () => {
    const { container } = openDemo();
    await demoReady();
    await widgetsReady(container);
    expect(launcherRenders.count).toBeGreaterThan(0);
    const widget = (name: string) => container.querySelector(`[aria-label="${name}"]`);
    for (const name of [
      'Ventilatore camera',
      'Tapparella soggiorno',
      'Termostato soggiorno',
      'Porta d’ingresso',
      'Videocamera ingresso',
      'Allarme di casa',
      'Sonos soggiorno',
      'Aspirapolvere',
    ]) {
      expect(widget(name), name).not.toBeNull();
    }
    // One page per category of the tray, and «Tutti i widget».
    for (const label of [
      'Luci e comandi',
      'Clima e meteo',
      'Sicurezza',
      'Multimedia',
      'Casa e info',
      'Energia',
      'Utilità',
      'Tutti i widget',
    ]) {
      expect(container.querySelector(`[aria-label="${label}"]`), label).not.toBeNull();
    }
    // No login page: the app took the simulated session for the stored one.
    expect(screen.queryByText(/Accedi/i)).not.toBeInTheDocument();
  }, 120_000);

  it('changes the simulated state when a light is toggled', async () => {
    const { container } = openDemo();
    await demoReady();
    await widgetsReady(container);
    const light = () => {
      const card = container.querySelector('[aria-label="Luce soggiorno"]')!;
      return within(card as HTMLElement).getByRole('button', { name: 'Accensione luce' });
    };
    await waitFor(() => expect(light()).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(light());
    await waitFor(() => expect(light()).toHaveAttribute('aria-pressed', 'false'));
    fireEvent.click(light());
    await waitFor(() => expect(light()).toHaveAttribute('aria-pressed', 'true'));
  }, 120_000);

  it('opens the real Sistema page with the simulated user and version', async () => {
    const { container } = openDemo();
    await demoReady();
    await widgetsReady(container);
    fireEvent.click(await screen.findByRole('button', { name: /^Sistema/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/sistema');
    // The sections of the real page, fed by the simulated Home Assistant and backend.
    await systemOpen();
    expect(screen.getAllByText('Collegamento').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profili').length).toBeGreaterThan(0);
    expect(await screen.findAllByText(/Demo/)).not.toHaveLength(0);
    // The version comes from the simulated /api/health.
    expect(await screen.findAllByText(__APP_VERSION__)).not.toHaveLength(0);
    // Nothing of this went to the network.
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 120_000);

  it('opens «Materiali» (Kit 2) over the app and goes back', async () => {
    const { container } = openDemo();
    await demoReady();
    await widgetsReady(container);
    fireEvent.click(screen.getByRole('button', { name: 'Materiali' }));
    expect(
      await screen.findByRole('heading', { name: 'Kit 2' }, { timeout: 30_000 })
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alla demo' }));
    expect(screen.queryByRole('heading', { name: 'Kit 2' })).not.toBeInTheDocument();
  }, 120_000);
});

describe('#/mockup keeps everything inside the browser', () => {
  it('opens no WebSocket and sends no fetch outside the demo, while the app runs and Sistema is open', async () => {
    const { container } = openDemo();
    await demoReady();
    await widgetsReady(container);
    fireEvent.click(await screen.findByRole('button', { name: /^Sistema/ }));
    await systemOpen();
    await new Promise((resolve) => setTimeout(resolve, 500));
    // The app's own server is answered by the facade; every other address is refused.
    const health = await fetch('./api/health');
    expect(await health.json()).toMatchObject({ status: 'ok' });
    await expect(fetch('https://example.com/data')).rejects.toBeInstanceOf(TypeError);
    await expect(fetch('/ha/auth/token', { method: 'POST' })).rejects.toBeInstanceOf(TypeError);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(webSocketSpy).not.toHaveBeenCalled();
  }, 120_000);

  it('leaves the storage of the real app untouched, while open and after leaving', async () => {
    const { container } = openDemo();
    await demoReady();
    await widgetsReady(container);
    // The demo works on its own storage: the keys of the real app are not even visible.
    expect(localStorage.getItem('tunet_launcher_layout')).not.toBe(REAL_KEYS.tunet_launcher_layout);
    expect(localStorage.getItem('ha_token')).toBeNull();
    expect(sessionStorage.getItem('tunet_entity_snapshot')).not.toBe(
      realSession.tunet_entity_snapshot
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Modifica la disposizione' }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    cleanup();
    demoMode.leaveDemo();
    expect(snapshot(localStorage)).toEqual(realLocal);
    expect(snapshot(sessionStorage)).toEqual(realSession);
    expect(Object.getOwnPropertyDescriptor(window, 'localStorage')).toEqual(realLocalDescriptor);
    expect(Object.getOwnPropertyDescriptor(window, 'sessionStorage')).toEqual(
      realSessionDescriptor
    );
  }, 120_000);
});

describe('leaving the demo', () => {
  it('«Esci» takes everything down and reloads the real app', async () => {
    const { container } = openDemo();
    await demoReady();
    await widgetsReady(container);
    expect(getDemoSource()).not.toBeNull();
    expect(getBackendOverride()).not.toBeNull();
    expect(globalThis.fetch).not.toBe(fetchSpy);
    sessionStorage.setItem(DEMO_FLAG_KEY, '1');
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/');
    expect(getDemoSource()).toBeNull();
    expect(getBackendOverride()).toBeNull();
    expect(globalThis.fetch).toBe(fetchSpy);
    // The flag of the real tab is switched off, so the reload starts the real app.
    expect(sessionStorage.getItem(DEMO_FLAG_KEY)).toBeNull();
    expect(snapshot(localStorage)).toEqual(realLocal);
  }, 120_000);
});

describe('entry of the demo', () => {
  it('recognises the demo address and the old kit ones, and nothing else', () => {
    for (const hash of ['#/mockup', '#/mockup/materiali', '#/ui-kit', '#/kit', '#/ui']) {
      expect(isDemoHash(hash), hash).toBe(true);
    }
    for (const hash of ['', '#/', '#/sistema', '#/mockups', '#/kitchen']) {
      expect(isDemoHash(hash), hash).toBe(false);
    }
  });

  it('switches the flag of the tab on for the demo address and keeps it for the routes inside', () => {
    expect(resolveDemoMode()).toBe(false);
    window.location.hash = '#/mockup';
    expect(resolveDemoMode()).toBe(true);
    expect(sessionStorage.getItem(DEMO_FLAG_KEY)).toBe('1');
    // Inside the demo the normal routes are used: the flag keeps it on.
    window.location.hash = '#/sistema';
    expect(resolveDemoMode()).toBe(true);
    sessionStorage.removeItem(DEMO_FLAG_KEY);
    expect(resolveDemoMode()).toBe(false);
  });

  it('takes /mockup and the old kit paths typed without the hash to the demo address', () => {
    for (const path of ['/mockup', '/ui-kit', '/kit', '/ui']) {
      window.history.replaceState(null, '', path);
      normalizeDemoPath();
      expect(window.location.pathname + window.location.hash).toBe('/#/mockup');
    }
    window.history.replaceState(null, '', '/');
  });
});
