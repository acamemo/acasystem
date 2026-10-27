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
    // The clock of the cover reports the visibility of its page (REP-20261007-030).
    findWidgetDefinition: (id: string, settings?: CardSettings) =>
      id.startsWith('cover_clock')
        ? {
            type: 'cover_clock',
            label: 'Orologio',
            icon: 'clock' as const,
            frameless: true,
            sizes: { min: { w: 1, h: 1 }, max: { w: 3, h: 3 }, default: { w: 2, h: 2 } },
            matches: () => true,
            Widget: CoverProbe,
          }
        : actual.findWidgetDefinition(id, settings),
    findPageKindDefinition: (kind: PageKind) =>
      kind === 'lights'
        ? { kind: 'lights' as const, label: 'Luci', Page: SpecialPage }
        : actual.findPageKindDefinition(kind),
  };
});

function CoverProbe() {
  return <p data-testid="cover-visible">{String(usePageVisible())}</p>;
}

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

/**
 * The settings of a widget with its «Dimensione» and «Pagina» (REP-20261008-001): a tap
 * selects it, Invio (a click without a pointer) on the selected widget opens them.
 */
async function openPlacement(name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name},`) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name},`) }));
  return screen.findByRole('dialog', { name: 'Impostazioni del widget' });
}

/** Labels of the size and page steps of the sheet, in order. */
const placementSteps = (sheet: HTMLElement, name: string) =>
  ['Larghezza', 'Altezza', 'Pagina'].flatMap((row) =>
    within(within(sheet).getByRole('group', { name: `${row} di ${name}` }))
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  latest = null;
  counters.specialPage = 0;
  ha.entities = {};
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
      // A widget not selected lifts after a press of a second (REP-20261008-001).
      act(() => vi.advanceTimersByTime(1000));
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

describe('A11Y-1 e RESP-4: alternative a singolo tocco nelle impostazioni del widget', () => {
  it('offre dimensione e pagina nel foglio, senza comandi a frecce nel piede né dentro la pagina', async () => {
    const { container } = await openScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    const sheet = await openPlacement('Tessera A');
    expect(placementSteps(sheet, 'Tessera A')).toEqual([
      'Riduci larghezza',
      'Aumenta larghezza',
      'Riduci altezza',
      'Aumenta altezza',
      'Sposta nella pagina precedente',
      'Sposta nella pagina successiva',
    ]);
    // The on-screen arrows of the footer are gone (REP-20261008-001).
    expect(container.querySelector('.aca-widget-position')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sposta con le frecce' })).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Casa' })).queryByText(/Frecce per/)
    ).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Aumenta altezza' }));
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 3 });
    expect(within(sheet).getByRole('group', { name: 'Altezza di Tessera A' })).toHaveTextContent(
      '3 quadrati'
    );
  });

  it('il focus resta sul comando quando il widget cambia pagina, il foglio lo segue ed Esc chiude solo il foglio', async () => {
    await openScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    const sheet = await openPlacement('Tessera A');
    const next = within(sheet).getByRole('button', { name: 'Sposta nella pagina successiva' });
    next.focus();
    fireEvent.click(next);
    await waitFor(() => expect(placement('altra', 'test_tile_a')).toBeDefined());
    expect(placement('home', 'test_tile_a')).toBeUndefined();
    expect(latest?.currentPageId).toBe('altra');
    // The focus did not jump to the widget, and the sheet shows its new page.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole('button', { name: 'Sposta nella pagina successiva' })).toHaveFocus();
    expect(within(sheet).getByRole('group', { name: 'Pagina di Tessera A' })).toHaveTextContent(
      'Altra'
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Sposta nella pagina successiva' }), {
      key: 'Escape',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Impostazioni del widget' })).toBeNull()
    );
    expect(latest?.editMode).toBe(true);
    // Closed, the focus goes back to the widget on its new page (its old handle is gone).
    await waitFor(() => expect(screen.getByRole('button', { name: /^Tessera A,/ })).toHaveFocus());
  });
});

describe('RESP-3: rimozione e «Annulla» con bersagli da 44 px (REP-20261007-031)', () => {
  it('il cestino della barra e «Annulla» del messaggio sono controlli da 44 px', async () => {
    await openScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    fireEvent.click(screen.getByRole('button', { name: /^Tessera A,/ }));
    const remove = screen.getByRole('button', { name: 'Rimuovi Tessera A' });
    expect(remove).toHaveClass('aca-bar-button');
    fireEvent.click(remove);
    const undo = document.querySelector<HTMLElement>('.aca-undo')!;
    expect(within(undo).getByRole('button', { name: 'Annulla' })).toHaveClass('aca-m--md');
  });
});

describe('«Modifica la disposizione» e Sistema, senza viso (ADR-0016, C1 e C3)', () => {
  it('«Modifica la disposizione» ha un nome proprio, distinto da «Modifica le pagine», ed è il primo comando della schermata', async () => {
    await openScreen();
    const edit = screen.getByRole('button', { name: 'Modifica la disposizione' });
    expect(edit).toHaveClass('aca-frame-pill');
    expect(edit).toHaveAttribute('data-launcher-edit');
    const commands = screen.getByRole('group', { name: 'Comandi della schermata' });
    expect(commands.contains(edit)).toBe(true);
    expect(commands.firstElementChild).toBe(edit.closest('button'));
    // Sistema is the gear of the frame, not a part of a bar.
    const gear = screen.getByRole('button', { name: 'Sistema' });
    expect(gear.closest('.aca-system-gear')).not.toBeNull();
    expect(gear.closest('.aca-shell__footer')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Stato e comandi' })).toBeNull();
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
    // Anche la categoria Casa contiene un orologio: osserviamo quello della Copertina.
    const coverProbe = () =>
      screen
        .getAllByTestId('cover-visible')
        .find((probe) => probe.closest('[data-launcher-page="cover"]'));
    const toCover = async () => {
      await waitFor(() => expect(coverProbe()).toHaveTextContent('false'));
      fireEvent.change(screen.getByRole('slider', { name: 'Pagina', hidden: true }), {
        target: { value: '1' },
      });
    };
    const shown = renderPage(false);
    await toCover();
    expect(coverProbe()).toHaveTextContent('true');
    shown.unmount();
    renderPage(true);
    await toCover();
    expect(coverProbe()).toHaveTextContent('false');
  });

  it('mostra tutti i 26 preset senza associazione anche dopo il caricamento delle entità HA', async () => {
    renderPage(false);
    await waitFor(() => expect(document.querySelectorAll('.aca-category-widget')).toHaveLength(26));
  });

  it('il preset collegato usa l’entità reale', async () => {
    const id = 'fan.preset_visibility';
    ha.entities = fixtureEntities([fixtureEntity('fan.sala', 'on', { percentage: 50 })]);
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        categoryDefaultsVersion: 1,
        cover: { enabled: false },
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: { tablet: { [id]: { x: 0, y: 0, w: 2, h: 1 } } },
          },
        ],
      })
    );
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({
        [`home::${id}`]: { categoryWidgetType: 'fan', bindingEntityId: 'fan.sala' },
      })
    );
    renderPage(false);
    await waitFor(() => expect(document.querySelector(`[data-widget-id="${id}"]`)).not.toBeNull());
    expect(document.querySelector('[data-category-bind]')).toBeNull();
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
