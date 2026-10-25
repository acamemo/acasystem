import { useMemo, useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
  });
  // The add sheet opens from a free cell with its «+» (the tray of types is gone, 2026-10-23).
  fireEvent.click(screen.getAllByRole('button', { name: /^Aggiungi un widget: / })[0]);
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
          {
            ...twoPages.pages[0],
            // One free cell is left: the «+» of the page; only the first light finds room.
            placements: {
              tablet: { full: { x: 0, y: 0, w: 8, h: 4 }, rest: { x: 0, y: 4, w: 7, h: 1 } },
            },
          },
        ],
      })
    );
    await openAddSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi tre luci' }));
    const continuation = latest?.layout.pages.find((page) => page.id !== 'home');
    expect(latest?.layout.pages).toHaveLength(2);
    // The first took the free cell touched; the other two share one continuation.
    expect(latest?.findPage('home')?.placements.tablet?.['light.one']).toBeDefined();
    expect(Object.keys(continuation?.placements.tablet ?? {}).sort()).toEqual([
      'light.three',
      'light.two',
    ]);
  });
});

describe('a full page (shell)', () => {
  it('has no free cell, so no «+»: the entry the old «+ Widget» button gave is gone (2026-10-23)', async () => {
    localStorage.clear();
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...twoPages,
        pages: [
          { ...twoPages.pages[0], placements: { tablet: { full: { x: 0, y: 0, w: 8, h: 5 } } } },
        ],
      })
    );
    latest = null;
    render(
      <ToastProvider>
        <PageProvider>
          <ScreenHarness />
        </PageProvider>
      </ToastProvider>
    );
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    expect(screen.queryAllByRole('button', { name: /^Aggiungi un widget: / })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Aggiungi widget' })).not.toBeInTheDocument();
  });
});

// ── «Aggiungi widget» of the pages view (the request of 2026-10-23) ──

describe('«Aggiungi widget» of the pages view (shell)', () => {
  type Pages = LauncherLayout['pages'];
  const widgetsPage = (
    id: string,
    label: string,
    placements: Record<string, { x: number; y: number; w: number; h: number }>,
    extra: Partial<Pages[number]> = {}
  ): Pages[number] => ({
    id,
    label,
    kind: 'widgets',
    placements: { tablet: placements },
    ...extra,
  });
  const FULL = { fisso: { x: 0, y: 0, w: 8, h: 5 } };
  const ROOMY = { uno: { x: 0, y: 0, w: 2, h: 2 } };

  /** The launcher on `pageId` with the pages view open, as Sistema → «Modifica le pagine» does. */
  async function openPagesView(pages: Pages, pageId: string, cover = false) {
    localStorage.clear();
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({ version: 1, cover: { enabled: cover }, pages } satisfies LauncherLayout)
    );
    latest = null;
    render(
      <ToastProvider>
        <PageProvider>
          <ScreenHarness />
        </PageProvider>
      </ToastProvider>
    );
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => {
      latest?.goToPageId(pageId);
      latest?.setEditMode(true);
      latest?.setOverview(true);
    });
    await waitFor(() => expect(latest?.overview).toBe(true));
  }

  const bar = () => screen.getByRole('toolbar', { name: 'Pagine' });
  const addWidget = () => within(bar()).getByRole('button', { name: 'Aggiungi widget' });
  const placed = (pageId: string) =>
    latest?.layout.pages.find((page) => page.id === pageId)?.placements.tablet?.['light.studio'];
  const spoken = () => document.querySelector('.sr-only[role="status"]');
  const notice = () => document.querySelector('.aca-undo');
  /** The sheet chooses «luce», a widget that needs no further choice (the mocked sheet above). */
  const addLight = () => {
    fireEvent.click(addWidget());
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi luce' }));
  };
  /** The view has closed and the new widget is selected, with its frame, on `pageId`. */
  async function expectSelectedOn(pageId: string) {
    const widget = () =>
      document.querySelector<HTMLElement>(
        `[data-launcher-page="${pageId}"] [data-widget-id="light.studio"]`
      );
    await waitFor(() => expect(widget()).toHaveClass('is-selected'));
    expect(latest?.overview).toBe(false);
    expect(latest?.editMode).toBe(true);
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
    expect(screen.queryByRole('toolbar', { name: 'Pagine' })).toBeNull();
    expect(screen.getByRole('toolbar', { name: /^Modifica / })).toBeInTheDocument();
    expect(widget()?.querySelectorAll('[data-resize-edge]').length).toBeGreaterThan(0);
  }

  it('is in the bar between «Nuova pagina» and the house, as a plain action with its tip', async () => {
    await openPagesView([widgetsPage('home', 'Casa', ROOMY)], 'home');
    const names = within(bar())
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names.slice(0, 4)).toEqual([
      'Elimina la pagina Casa',
      'Nuova pagina',
      'Aggiungi widget',
      'Casa è la pagina principale',
    ]);
    const button = addWidget();
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(button).not.toHaveAttribute('aria-expanded');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.textContent).toBe('');
  });

  it('on a page with room the widget takes its first free place, the view closes and it is selected', async () => {
    await openPagesView(
      [widgetsPage('home', 'Casa', ROOMY), widgetsPage('luci', 'Luci', {})],
      'home'
    );
    addLight();
    expect(placed('home')).toEqual({ x: 2, y: 0, w: 2, h: 2 });
    expect(placed('luci')).toBeUndefined();
    await expectSelectedOn('home');
    expect(latest?.currentPageId).toBe('home');
    await waitFor(() => expect(spoken()).toHaveTextContent(/aggiunto alla pagina\.$/));
    // The focus lands on the new widget (its handle), as after a «+» cell.
    await waitFor(() =>
      expect(document.activeElement?.closest('[data-widget-id]')).toBe(
        document.querySelector('[data-launcher-page="home"] [data-widget-id="light.studio"]')
      )
    );
  });

  it('on a full page the widget goes to the first page after it with room, which comes to the centre', async () => {
    await openPagesView(
      [
        widgetsPage('home', 'Casa', FULL),
        widgetsPage('piena', 'Piena', FULL),
        widgetsPage('luci', 'Luci', ROOMY),
      ],
      'home'
    );
    addLight();
    expect(placed('home')).toBeUndefined();
    expect(placed('piena')).toBeUndefined();
    expect(placed('luci')).toEqual({ x: 2, y: 0, w: 2, h: 2 });
    expect(latest?.layout.pages).toHaveLength(3);
    await expectSelectedOn('luci');
    expect(latest?.currentPageId).toBe('luci');
    await waitFor(() =>
      expect(spoken()).toHaveTextContent('aggiunto alla pagina Luci, perché questa è piena.')
    );
  });

  it('with no room on any page after it a new page is made at the end, and the view goes to it', async () => {
    await openPagesView(
      [widgetsPage('home', 'Casa', FULL), widgetsPage('luci', 'Luci', FULL)],
      'home'
    );
    addLight();
    const pages = latest?.layout.pages ?? [];
    expect(pages).toHaveLength(3);
    const created = pages[2];
    expect(created).toMatchObject({ kind: 'widgets', label: 'Nuova pagina' });
    expect(placed(created.id)).toMatchObject({ x: 0, y: 0 });
    await expectSelectedOn(created.id);
    expect(latest?.currentPageId).toBe(created.id);
    await waitFor(() =>
      expect(spoken()).toHaveTextContent('a una nuova pagina in fondo, perché le altre sono piene')
    );
  });

  it('a hidden page after the full one is passed over', async () => {
    await openPagesView(
      [
        widgetsPage('home', 'Casa', FULL),
        widgetsPage('nascosta', 'Nascosta', ROOMY, { hidden: true }),
        widgetsPage('luci', 'Luci', ROOMY),
      ],
      'home'
    );
    addLight();
    expect(placed('nascosta')).toBeUndefined();
    expect(placed('luci')).toBeDefined();
    await expectSelectedOn('luci');
  });

  const coverPage = (placements: Record<string, { x: number; y: number; w: number; h: number }>) =>
    ({
      id: 'cover',
      label: 'Copertina',
      kind: 'cover',
      placements: { tablet: placements },
    }) satisfies Pages[number];

  it('on the cover it goes where the cover has room, and stays on the cover', async () => {
    await openPagesView([widgetsPage('home', 'Casa', ROOMY), coverPage({})], 'cover', true);
    addLight();
    expect(placed('cover')).toBeDefined();
    expect(placed('home')).toBeUndefined();
    await expectSelectedOn('cover');
    expect(latest?.currentPage).toBe(0);
  });

  it('on a full cover, with no free cell, it goes to the first page after it with room', async () => {
    // The cover has three columns and a row: three widgets fill it.
    const one = (x: number) => ({ x, y: 0, w: 1, h: 1 });
    const full = {
      ...coverPage({}),
      columns: 3,
      placements: { 'tablet@3x1': { a: one(0), b: one(1), c: one(2) } },
    } as unknown as Pages[number];
    await openPagesView([widgetsPage('home', 'Casa', ROOMY), full], 'cover', true);
    addLight();
    const onCover = latest?.layout.pages.find((page) => page.id === 'cover');
    expect(
      Object.values(onCover?.placements ?? {}).flatMap((item) => Object.keys(item ?? {}))
    ).toEqual(['a', 'b', 'c']);
    expect(placed('home')).toBeDefined();
    await expectSelectedOn('home');
    expect(latest?.currentPageId).toBe('home');
  });

  it('is off, with the reason, on the cover that is hidden, a hidden page and a special page', async () => {
    const cases: [Pages, string, boolean, string][] = [
      [
        [widgetsPage('home', 'Casa', ROOMY)],
        'cover',
        false,
        'La copertina è nascosta: mostrala per aggiungere widget.',
      ],
      [
        [
          widgetsPage('home', 'Casa', ROOMY),
          widgetsPage('nascosta', 'Nascosta', {}, { hidden: true }),
        ],
        'nascosta',
        true,
        'La pagina è nascosta: mostrala per aggiungere widget.',
      ],
      [
        [
          widgetsPage('home', 'Casa', ROOMY),
          { id: 'lights', label: 'Luci', kind: 'lights', placements: {} },
        ],
        'lights',
        true,
        'Questa pagina non ha celle per i widget: scegli una pagina di widget.',
      ],
    ];
    for (const [pages, pageId, cover, reason] of cases) {
      await openPagesView(pages, pageId, cover);
      const button = addWidget();
      // Still reachable by the keyboard, and the reason is its description (IconAction).
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAccessibleDescription(reason);
      fireEvent.click(button);
      expect(screen.queryByRole('button', { name: 'Aggiungi luce' })).toBeNull();
      expect(notice()).toHaveTextContent(reason);
      expect(latest?.overview).toBe(true);
      expect(latest?.layout.pages.some((page) => page.placements.tablet?.['light.studio'])).toBe(
        false
      );
      cleanup();
    }
  });

  it('is reached by the keyboard, and with the layout locked the view ends and the bar goes away', async () => {
    await openPagesView([widgetsPage('home', 'Casa', ROOMY)], 'home');
    const button = addWidget();
    button.focus();
    expect(button).toHaveFocus();
    expect(button.tabIndex).toBe(0);
    // Locked from Sistema while the view is open: edit mode and the view end, the bar goes away.
    act(() => latest?.setLayoutOptions({ locked: true }));
    await waitFor(() => expect(latest?.overview).toBe(false));
    expect(screen.queryByRole('toolbar', { name: 'Pagine' })).toBeNull();
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

  it.each([
    [640, 400, '6'],
    [1024, 472, '8'],
  ])(
    'on a landscape screen %i×%i the automatic page has %s columns',
    async (width, height, cols) => {
      const window = globalThis.window;
      const before = { width: window.innerWidth, height: window.innerHeight };
      const size = (w: number, h: number) => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: h });
      };
      size(width, height);
      try {
        const { container } = renderPage(false);
        await waitFor(() =>
          expect(
            container
              .querySelector<HTMLElement>('[data-launcher-page="home"] .aca-launcher-grid')
              ?.style.getPropertyValue('--aca-cols')
          ).toBe(cols)
        );
      } finally {
        size(before.width, before.height);
      }
    }
  );

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
