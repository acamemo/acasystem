/**
 * «Dispositivi trovati» inside the launcher (REP-20261028-003): it opens by itself at the first
 * opening only, the widget «Trova dispositivi» brings it back, and a widget made by itself lands
 * on the current page at the first free place while the screen stays open. Real launcher, real
 * widget registry, the fake device facade and a fake Home Assistant.
 */
import { useMemo } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  headers: vi.fn(() => Promise.resolve({ Authorization: 'Bearer test' })),
  method: vi.fn(() => 'oauth'),
  unauthorized: vi.fn((message: string) => Object.assign(new Error(message), { status: 401 })),
}));

vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: auth.headers,
  getStoredAuthMethod: auth.method,
  notifyHomeAssistantApiUnauthorized: auth.unauthorized,
}));

import type { LauncherLayout } from '@/@types/launcher';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { DISCOVERY_SEEN_KEY } from '@/hooks/launcher/useDiscoveryScreen';
import { resetShownTiles } from '@/templates/discovery/DiscoveryScreen';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { fakeConnection } from './UtilityHarness';
import { installFakeDevices } from './devicesFakeServer';

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: false },
  pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: { tablet: {} } }],
};

const connection = () =>
  fakeConnection({
    'config/device_registry/list': () => [{ id: 'lampada', name: 'Lampada studio' }],
    'config/entity_registry/list': () => [
      { entity_id: 'light.studio', device_id: 'lampada', platform: 'hue' },
    ],
  });

let latest: LauncherController | null = null;

function Harness({ firstOpen = true }: { firstOpen?: boolean }) {
  const pages = usePages();
  const store = useMemo<LauncherStore>(
    () => ({
      ready: pages.settingsLoaded,
      layout: pages.launcherLayout,
      persistLayout: pages.persistLauncherLayout,
      pagesConfig: pages.pagesConfig,
      pageSettings: pages.pageSettings,
      cardSettings: pages.cardSettings,
      persistPagesConfig: pages.persistConfig,
      persistPageSettings: pages.persistPageSettings,
      persistCardSettings: pages.persistCardSettings,
    }),
    [pages]
  );
  const controller = useLauncherController({
    store,
    deviceClass: 'tablet',
    resolveSizes: (id, settings) => findWidgetDefinition(id, settings)?.sizes,
  });
  latest = controller;
  const runtime = useMemo(
    () =>
      createFixtureRuntime({
        entities: fixtureEntities([
          fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada studio' }),
        ]),
        conn: connection().conn,
      }),
    []
  );
  return (
    <LauncherScreen
      controller={controller}
      runtime={runtime}
      connection={{ phase: 'connected', label: 'Connesso' }}
      chips={[]}
      onOpenSystem={vi.fn()}
      detailsWidgetId={null}
      onCloseDetails={vi.fn()}
      discoveryOnFirstOpen={firstOpen}
    />
  );
}

async function openLauncher(firstOpen = true) {
  const view = render(
    <ToastProvider>
      <PageProvider>
        <Harness firstOpen={firstOpen} />
      </PageProvider>
    </ToastProvider>
  );
  await waitFor(() => expect(latest?.ready).toBe(true));
  act(() => latest?.goToPageId('home'));
  return view;
}

const discovery = () => screen.queryByRole('dialog', { name: 'Dispositivi trovati' });

beforeEach(() => {
  resetShownTiles();
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem('aca_edit_hint_seen', '1');
  latest = null;
  installFakeDevices();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('«Dispositivi trovati» nel launcher', () => {
  it('compare da sola alla prima apertura; «Salta» la chiude e non torna', async () => {
    const view = await openLauncher();
    const dialog = await screen.findByRole('dialog', { name: 'Dispositivi trovati' });
    expect(localStorage.getItem(DISCOVERY_SEEN_KEY)).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Salta|^Continua/ }));
    expect(localStorage.getItem(DISCOVERY_SEEN_KEY)).toBe('1');
    await waitFor(() => expect(discovery()).toBeNull());

    // The next start on this device: nothing by itself.
    view.unmount();
    await openLauncher();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(discovery()).toBeNull();
  });

  it('il widget «Trova dispositivi» riapre la schermata al tocco, senza aggiungere widget', async () => {
    localStorage.setItem(DISCOVERY_SEEN_KEY, '1');
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: { tablet: { rileva_card_1: { x: 0, y: 0, w: 2, h: 2 } } },
          },
        ],
      })
    );
    await openLauncher();
    expect(discovery()).toBeNull();
    fireEvent.click(
      await screen.findByRole('button', { name: /^Trova dispositivi, apri l’elenco/ })
    );

    expect(await screen.findByRole('dialog', { name: 'Dispositivi trovati' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Trova dispositivi' })).toBeNull();
  });

  it('«Crea il widget» mette il widget del tipo giusto nella pagina corrente, e la schermata resta aperta', async () => {
    // The first opening shows the screen by itself.
    await openLauncher();
    await screen.findByRole('dialog', { name: 'Dispositivi trovati' });

    fireEvent.click(await screen.findByRole('button', { name: /^Collegati/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Crea il widget: Lampada studio' }));

    // The light is on the page, at a place of the page, and the sheet never took the screen.
    await waitFor(() =>
      expect(latest?.layout.pages[0]?.placements.tablet?.['light.studio']).toBeDefined()
    );
    expect(JSON.parse(localStorage.getItem('tunet_pages_config') ?? '{}').home).toContain(
      'light.studio'
    );
    expect(discovery()).not.toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull();
    // The row now says where the device is.
    await waitFor(() => expect(screen.getByText('Nel widget')).toBeInTheDocument());
  });
});
