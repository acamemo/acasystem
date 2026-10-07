import { useMemo, useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings, HomeAssistantContextValue } from '@/@types/dashboard';
import type { LauncherLayout, PageKind, WidgetDefinition, WidgetProps } from '@/@types/launcher';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { widgetDisplayName } from '@/utils/launcher/names';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { DetailsSheet } from '@/templates/launcher/DetailsSheet';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { LauncherPage } from '@/pages/launcher/LauncherPage';

// REP-20261006-001, corsia launcher-ui: DES-1, PERF-1, PERF-2 (LauncherPage), A11Y-1, RESP-4, DES-2.

const counters = vi.hoisted(() => ({ specialPage: 0 }));

function SpecialPage() {
  counters.specialPage += 1;
  return <p>Contenuto della pagina speciale</p>;
}

vi.mock('@/components/widgets/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/widgets/registry')>();
  return {
    ...actual,
    findPageKindDefinition: (kind: PageKind) =>
      kind === 'lights'
        ? { kind: 'lights' as const, label: 'Luci', Page: SpecialPage }
        : actual.findPageKindDefinition(kind),
  };
});

function CoverProbe() {
  return <p data-testid="cover-visible">{String(usePageVisible())}</p>;
}
vi.mock('@/pages/cover/CoverPage', () => ({ CoverPage: () => <CoverProbe /> }));

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
  sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('test_tile'),
  Widget: Tile,
};
const findDefinition = (id: string, settings: CardSettings) =>
  tile.matches(id, settings) ? tile : undefined;

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: false },
  pages: [
    {
      id: 'home',
      label: 'Casa',
      kind: 'widgets',
      placements: {
        tablet: {
          test_tile_a: { x: 0, y: 0, w: 2, h: 2 },
          test_tile_b: { x: 2, y: 0, w: 2, h: 2 },
        },
      },
    },
    {
      id: 'altra',
      label: 'Altra',
      kind: 'widgets',
      placements: { tablet: { test_tile_c: { x: 0, y: 0, w: 2, h: 2 } } },
    },
    { id: 'luci', label: 'Luci di casa', kind: 'lights', placements: {} },
  ],
};

let latest: LauncherController | null = null;

function Harness() {
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
    resolveSizes: (id, settings) => findDefinition(id, settings)?.sizes,
  });
  latest = controller;
  const [details, setDetails] = useState<string | null>(null);
  const runtime = useMemo(
    () =>
      createFixtureRuntime({
        customNames: {
          test_tile_a: 'Tessera A',
          test_tile_b: 'Tessera B',
          test_tile_c: 'Tessera C',
        },
        openDetails: setDetails,
        editMode: controller.editMode,
      }),
    [controller.editMode]
  );
  return (
    <LauncherScreen
      controller={controller}
      runtime={runtime}
      cover={<p>Copertina di prova</p>}
      connection={{ phase: 'connected', label: 'Collegato' }}
      chips={[]}
      onOpenSystem={() => undefined}
      detailsWidgetId={details}
      onCloseDetails={() => setDetails(null)}
      findDefinition={findDefinition}
    />
  );
}

async function openScreen(pageId = 'home') {
  const view = render(
    <ToastProvider>
      <PageProvider>
        <Harness />
      </PageProvider>
    </ToastProvider>
  );
  await waitFor(() => expect(latest?.ready).toBe(true));
  act(() => latest?.goToPageId(pageId));
  return view;
}

const placement = (pageId: string, id: string) =>
  latest?.layout.pages.find((page) => page.id === pageId)?.placements.tablet?.[id];

function openMoveControls(name: string, action: 'Sposta' | 'Ridimensiona') {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name},`) }));
  const menu = screen.getByRole('dialog', { name: `Azioni per ${name}` });
  fireEvent.click(within(menu).getByRole('button', { name: action }));
  return screen.getByRole('group', { name: `${action} ${name}` });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  latest = null;
  counters.specialPage = 0;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('DES-1: guscio comune delle pagine speciali', () => {
  it('dà alla pagina speciale i margini delle pagine di widget e il titolo h1 con l’etichetta', async () => {
    await openScreen('luci');
    const region = screen.getByRole('region', { name: 'Luci di casa' });
    expect(
      within(region).getByRole('heading', { level: 1, name: 'Luci di casa' })
    ).toBeInTheDocument();
    expect(within(region).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const shell = region.querySelector('.aca-launcher-special');
    expect(shell).toHaveClass('aca-launcher-page');
    expect(within(region).getByText('Contenuto della pagina speciale')).toBeInTheDocument();
  });
});

describe('PERF-1: i fotogrammi del trascinamento non ridisegnano le pagine speciali', () => {
  it('la pagina speciale resta ferma mentre la sessione di trascinamento cambia', async () => {
    await openScreen();
    act(() => latest?.setEditMode(true));
    class Pointer extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(screen.getByRole('button', { name: /^Tessera A,/ }), {
        pointerId: 1,
        button: 0,
        clientX: 10,
        clientY: 10,
      });
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 50 });
      expect(document.querySelector('.aca-drag-ghost')).not.toBeNull();
      const baseline = counters.specialPage;
      expect(baseline).toBeGreaterThan(0);
      for (let step = 0; step < 10; step += 1) {
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 50 + step * 3, clientY: 50 });
        act(() => vi.advanceTimersByTime(20));
      }
      expect(document.querySelector('.aca-drag-ghost')).not.toBeNull();
      expect(counters.specialPage).toBe(baseline);
      fireEvent.pointerCancel(window, { pointerId: 1 });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});

describe('A11Y-1 e RESP-4: comandi a schermo per spostare e ridimensionare', () => {
  it('offre tutti i comandi a singolo tocco nel piede, senza suggerimento dentro la pagina', async () => {
    const { container } = await openScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const move = openMoveControls('Tessera A', 'Sposta');
    expect(move.closest('.aca-shell__footer')).not.toBeNull();
    expect(
      within(move)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual([
      'Sposta a sinistra',
      'Sposta a destra',
      'Sposta in alto',
      'Sposta in basso',
      'Sposta nella pagina precedente',
      'Sposta nella pagina successiva',
      'Fatto',
    ]);
    expect(container.querySelector('.aca-launcher-widget__mode')).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Casa' })).queryByText(/Frecce per/)
    ).toBeNull();

    fireEvent.click(within(move).getByRole('button', { name: 'Fatto' }));
    const resize = openMoveControls('Tessera A', 'Ridimensiona');
    expect(
      within(resize)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual([
      'Riduci larghezza',
      'Aumenta larghezza',
      'Riduci altezza',
      'Aumenta altezza',
      'Fatto',
    ]);
    fireEvent.click(within(resize).getByRole('button', { name: 'Aumenta altezza' }));
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 3 });
  });

  it('il focus resta sui comandi quando il widget cambia pagina, ed Esc chiude solo lo spostamento', async () => {
    await openScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const move = openMoveControls('Tessera A', 'Sposta');
    const next = within(move).getByRole('button', { name: 'Sposta nella pagina successiva' });
    next.focus();
    fireEvent.click(next);
    await waitFor(() => expect(placement('altra', 'test_tile_a')).toBeDefined());
    expect(placement('home', 'test_tile_a')).toBeUndefined();
    expect(latest?.currentPageId).toBe('altra');
    // A tap on the same control again keeps working: the focus did not jump to the widget.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole('button', { name: 'Sposta nella pagina successiva' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Sposta nella pagina successiva' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('group', { name: 'Sposta Tessera A' })).not.toBeInTheDocument();
    expect(latest?.editMode).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Tessera A,/ })).toHaveFocus());
  });
});

describe('RESP-3: la conferma di rimozione usa la taglia md (bersagli da 44 px)', () => {
  it('«×», «Annulla» e «Rimuovi» sono in taglia md', async () => {
    await openScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const remove = screen.getByRole('button', { name: 'Rimuovi Tessera A' });
    expect(remove).toHaveClass('aca-m--md');
    fireEvent.click(remove);
    const confirm = screen.getByRole('dialog', { name: 'Conferma la rimozione di Tessera A' });
    for (const name of ['Annulla', 'Rimuovi']) {
      expect(within(confirm).getByRole('button', { name })).toHaveClass('aca-m--md');
    }
  });
});

describe('PERF-2: LauncherPage spegne la visibilità mentre Sistema copre il launcher', () => {
  function renderPage(overlay: boolean) {
    return render(
      <ToastProvider>
        <PageProvider>
          <LauncherPage onOpenSystem={() => undefined} overlay={overlay ? <p>Sistema</p> : null} />
        </PageProvider>
      </ToastProvider>
    );
  }

  it('la copertina è visibile senza Sistema e ferma sotto Sistema', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({ ...layout, cover: { enabled: true } })
    );
    // Si parte da «Principale»: la copertina, a sinistra, si raggiunge dall'indicatore.
    const toCover = async () => {
      expect(await screen.findByTestId('cover-visible')).toHaveTextContent('false');
      fireEvent.change(screen.getByRole('slider', { name: 'Pagina', hidden: true }), {
        target: { value: '1' },
      });
    };
    const shown = renderPage(false);
    await toCover();
    expect(screen.getByTestId('cover-visible')).toHaveTextContent('true');
    shown.unmount();
    renderPage(true);
    await toCover();
    expect(screen.getByTestId('cover-visible')).toHaveTextContent('false');
  });
});

describe('DES-2: intestazione del foglio dei dettagli', () => {
  const climate: WidgetDefinition = {
    type: 'climate',
    label: 'Clima',
    icon: 'thermostat',
    sizes: tile.sizes,
    matches: () => true,
    Widget: Tile,
    Details: () => <p>Contenuto dei dettagli</p>,
  };
  const target = (title: string) => ({
    widgetId: 'climate_card_1',
    pageId: 'home',
    settingsKey: 'home::climate_card_1',
    settings: { climateId: 'climate.soggiorno' },
    title,
  });

  it('usa il nome del dispositivo come titolo e il tipo come descrizione', () => {
    const entities = fixtureEntities([
      fixtureEntity('climate.soggiorno', 'heat', { friendly_name: 'Clima soggiorno' }),
    ]);
    const title = widgetDisplayName('climate_card_1', target('').settings, entities, {}, 'Clima');
    expect(title).toBe('Clima soggiorno');
    render(
      <DetailsSheet target={target(title)} onClose={() => undefined} resolve={() => climate} />
    );
    const dialog = screen.getByRole('dialog', { name: 'Clima soggiorno' });
    expect(dialog).toHaveAccessibleDescription('Clima');
  });

  it('non ripete il tipo quando coincide con il titolo', () => {
    render(
      <DetailsSheet target={target('Clima')} onClose={() => undefined} resolve={() => climate} />
    );
    const dialog = screen.getByRole('dialog', { name: 'Clima' });
    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(within(dialog).getAllByText('Clima')).toHaveLength(1);
  });

  it('chiama una stanza con l’area scelta invece del tipo', () => {
    expect(
      widgetDisplayName(
        'room_card_1',
        { areaId: 'soggiorno', areaName: 'Soggiorno' },
        {},
        {},
        'Stanza'
      )
    ).toBe('Soggiorno');
  });
});
