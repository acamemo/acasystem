import { useMemo, useState } from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CardSettings,
  CardSettingsMap,
  PagesConfig,
  PageSettingsMap,
} from '@/@types/dashboard';
import type { HomeAssistantContextValue } from '@/@types/dashboard';
import type { LauncherLayout, WidgetDefinition, WidgetProps } from '@/@types/launcher';
import type { AddWidgetSheetProps, WidgetSettingsSheetProps } from '@/templates/sheets';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { useLauncher } from '@/hooks/launcher/LauncherContext';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { createFixtureRuntime, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { LauncherPage } from '@/pages/launcher/LauncherPage';

// The add sheet is replaced by two buttons that add like the real one (card created, then
// onAdded and onClose in the same handler); the settings sheet shows what it was opened for.
vi.mock('@/templates/sheets', () => ({
  AddWidgetSheet: ({ open, onAdded, onClose }: AddWidgetSheetProps) =>
    open ? (
      <div>
        <button
          type="button"
          onClick={() => {
            onAdded('light.one', { w: 2, h: 2 });
            onAdded('light.two', { w: 2, h: 2 });
            onAdded('light.three', { w: 2, h: 2 });
            onClose();
          }}
        >
          Aggiungi tre luci
        </button>
        <button
          type="button"
          onClick={() => {
            onAdded('todo_card_1');
            onClose();
          }}
        >
          Aggiungi attività
        </button>
        <button
          type="button"
          onClick={() => {
            onAdded('light.studio');
            onClose();
          }}
        >
          Aggiungi luce
        </button>
      </div>
    ) : null,
  WidgetSettingsSheet: ({ open, widgetId, settingsKey }: WidgetSettingsSheetProps) =>
    open ? <p>{`Impostazioni di ${widgetId} (${settingsKey})`}</p> : null,
  PageSettingsSheet: () => null,
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

function Tile({ id }: WidgetProps) {
  return <span>{`Widget ${id}`}</span>;
}

const tile: WidgetDefinition = {
  type: 'test_tile',
  label: 'Tessera',
  icon: 'grid',
  sizes: { min: { w: 1, h: 1 }, max: { w: 8, h: 5 }, default: { w: 2, h: 2 } },
  matches: () => true,
  Widget: Tile,
};
const findDefinition = (_id: string, _settings: CardSettings) => tile;

const twoPages: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    {
      id: 'home',
      label: 'Casa',
      kind: 'widgets',
      placements: { tablet: { 'sensor.a': { x: 0, y: 0, w: 2, h: 2 } } },
    },
    {
      id: 'luci',
      label: 'Luci',
      kind: 'widgets',
      placements: { tablet: { 'light.b': { x: 0, y: 0, w: 2, h: 2 } } },
    },
  ],
};

// ── Controller ──

function useLocalStore(initial: LauncherLayout) {
  const [layout, setLayout] = useState<LauncherLayout | null>(initial);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>({ header: [], pages: [] });
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({});
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>({});
  const store = useMemo<LauncherStore>(
    () => ({
      ready: true,
      layout,
      persistLayout: setLayout,
      pagesConfig,
      pageSettings,
      cardSettings,
      persistPagesConfig: setPagesConfig,
      persistPageSettings: setPageSettings,
      persistCardSettings: setCardSettings,
    }),
    [layout, pagesConfig, pageSettings, cardSettings]
  );
  return { store, setCardSettings };
}

describe('launcher controller (shell)', () => {
  it('starts on «Principale», the first widget page, with the cover on its left', () => {
    const { result } = renderHook(() =>
      useLauncherController({ store: useLocalStore(twoPages).store, deviceClass: 'tablet' })
    );
    // Pager: cover (0), home (1), luci (2).
    expect(result.current.entries[0].key).toBe('cover');
    expect(result.current.currentPageId).toBe('home');
    expect(result.current.currentPage).toBe(1);
    act(() => result.current.goToPage(0));
    expect(result.current.currentPageId).toBeNull();
  });

  it('returns the page that received a widget and carries its new settings to a new page', async () => {
    const full: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: { tablet: { 'sensor.grande': { x: 0, y: 0, w: 8, h: 5 } } },
        },
      ],
    };
    const { result } = renderHook(() => {
      const local = useLocalStore(full);
      const controller = useLauncherController({
        store: local.store,
        deviceClass: 'tablet',
        resolveSizes: () => tile.sizes,
      });
      return { ...local, controller };
    });

    let placedOn: string | null = null;
    act(() => {
      // As the add sheet does: the settings of the new card first, then the placement.
      result.current.setCardSettings({ 'home::car_card_1': { type: 'car', size: 'large' } });
      placedOn = result.current.controller.placeWidget('home', 'car_card_1', { w: 2, h: 2 });
    });
    expect(placedOn).not.toBeNull();
    expect(placedOn).not.toBe('home');
    expect(result.current.controller.currentPageId).toBe(placedOn);
    await waitFor(() =>
      expect(result.current.store.cardSettings[`${placedOn}::car_card_1`]).toEqual({
        type: 'car',
        size: 'large',
      })
    );
    // The original settings stay where they were.
    expect(result.current.store.cardSettings['home::car_card_1']).toEqual({
      type: 'car',
      size: 'large',
    });

    let samePage: string | null = null;
    act(() => {
      samePage = result.current.controller.placeWidget(placedOn ?? '', 'light.x', { w: 1, h: 1 });
    });
    expect(samePage).toBe(placedOn);
  });
});

// ── Launcher screen: settings after adding a to-do list or a car ──

let latest: LauncherController | null = null;

function ScreenHarness() {
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
    resolveSizes: (id, settings) => findDefinition(id, settings).sizes,
  });
  latest = controller;
  const runtime = useMemo(
    () => createFixtureRuntime({ editMode: controller.editMode }),
    [controller.editMode]
  );
  return (
    <LauncherScreen
      controller={controller}
      runtime={runtime}
      cover={<p>Copertina di prova</p>}
      connection={{ phase: 'connected', label: 'Connesso' }}
      chips={[]}
      onOpenSystem={() => undefined}
      detailsWidgetId={null}
      onCloseDetails={() => undefined}
      findDefinition={findDefinition}
    />
  );
}

async function openAddSheet() {
  render(
    <ToastProvider>
      <PageProvider>
        <ScreenHarness />
      </PageProvider>
    </ToastProvider>
  );
  await waitFor(() => expect(latest?.ready).toBe(true));
  act(() => {
    latest?.goToPageId('home');
    latest?.setEditMode(true);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi widget' }));
}

describe('launcher screen (shell)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(twoPages));
    latest = null;
  });

  it('opens the settings sheet of a to-do list right after adding it', async () => {
    await openAddSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi attività' }));

    expect(
      await screen.findByText('Impostazioni di todo_card_1 (home::todo_card_1)')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aggiungi attività' })).not.toBeInTheDocument();
    expect(latest?.findPage('home')?.placements.tablet?.todo_card_1).toBeDefined();
  });

  it('only closes the add sheet for other widgets', async () => {
    await openAddSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi luce' }));

    await waitFor(() =>
      expect(latest?.findPage('home')?.placements.tablet?.['light.studio']).toBeDefined()
    );
    expect(screen.queryByText(/^Impostazioni di/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aggiungi luce' })).not.toBeInTheDocument();
  });

  it('packs a multi-add into the same continuation instead of one new page per widget', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...twoPages,
        cover: { enabled: false },
        pages: [
          { ...twoPages.pages[0], placements: { tablet: { full: { x: 0, y: 0, w: 8, h: 5 } } } },
        ],
      })
    );
    await openAddSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi tre luci' }));
    const continuation = latest?.layout.pages.find((page) => page.id !== 'home');
    expect(latest?.layout.pages).toHaveLength(2);
    expect(Object.keys(continuation?.placements.tablet ?? {}).sort()).toEqual([
      'light.one',
      'light.three',
      'light.two',
    ]);
  });
});

// ── Launcher page: Sistema inside the provider, start on «Principale» ──

function SystemProbe() {
  const launcher = useLauncher();
  return (
    <div>
      <p>{`Copertina ${launcher.layout.cover.enabled ? 'attiva' : 'spenta'}`}</p>
      <p>{`Pagina ${launcher.currentPage}`}</p>
      <button type="button" onClick={() => launcher.setCoverEnabled(false)}>
        Spegni la copertina
      </button>
    </div>
  );
}

function renderPage(overlay: boolean) {
  return render(
    <ToastProvider>
      <PageProvider>
        <LauncherPage onOpenSystem={() => undefined} overlay={overlay ? <SystemProbe /> : null} />
      </PageProvider>
    </ToastProvider>
  );
}

const storedLayout = () =>
  JSON.parse(localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY) ?? 'null') as LauncherLayout | null;

describe('launcher page (shell)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(twoPages));
  });

  it('draws the overlay inside the launcher provider, with the launcher hidden', async () => {
    const { container } = renderPage(true);
    expect(await screen.findByText('Copertina attiva')).toBeInTheDocument();
    expect(container.querySelector('.aca-shell')?.closest('[hidden]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Spegni la copertina' }));
    expect(await screen.findByText('Copertina spenta')).toBeInTheDocument();
    await waitFor(() => expect(storedLayout()?.cover.enabled).toBe(false));
  });

  it('shows the launcher when there is no overlay', async () => {
    const { container } = renderPage(false);
    await waitFor(() => expect(container.querySelector('.aca-shell')).not.toBeNull());
    expect(container.querySelector('.aca-shell')?.closest('[hidden]')).toBeNull();
  });

  it('always opens on «Principale», ignoring and never writing the page of the last visit', async () => {
    localStorage.setItem('tunet_active_page', 'luci');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderPage(true);
    // Pager: cover (0), home (1), luci (2).
    expect(await screen.findByText('Pagina 1')).toBeInTheDocument();
    await waitFor(() => expect(storedLayout()).not.toBeNull());
    expect(setItem.mock.calls.filter(([key]) => key === 'tunet_active_page')).toEqual([]);
    setItem.mockRestore();
  });

  it('opens a generic entity widget using the stored page settings', async () => {
    ha.entities = {
      'sensor.a': fixtureEntity('sensor.a', '21', { friendly_name: 'Temperatura ufficio' }),
    };
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({ 'home::sensor.a': { type: 'entity' } })
    );
    const { container } = renderPage(false);
    const opener = container.querySelector<HTMLElement>(
      '[data-widget-id="sensor.a"] [data-widget-open]'
    );
    expect(opener).not.toBeNull();
    fireEvent.click(opener!);
    expect(await screen.findByRole('dialog', { name: 'Temperatura ufficio' })).toBeInTheDocument();
    ha.entities = {};
  });
});
