import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings, CardSettingsMap } from '@/@types/dashboard';
import type { Connection } from '@/@types/ha';
import type { LauncherApi, LauncherLayout, PageKind } from '@/@types/launcher';
import { todoWidget } from '@/components/widgets/home/todo';
import { readCameraSettings } from '@/components/widgets/media/model/camera';
import { readTvConfig } from '@/components/widgets/media/widgets/TvWidget';
import { readCostSettings } from '@/components/widgets/utilities/energy/costData';
import { readNordpoolSettings } from '@/components/widgets/utilities/energy/nordpoolData';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { PageSettingsSheet, WidgetSettingsSheet } from '@/templates/sheets';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { reorderPagesInLayout } from '@/utils/launcher/layout';
import { fakeConnection, flush } from './ControlsHarness';

const state = vi.hoisted(() => ({ pages: {} as Record<string, unknown> }));

vi.mock('@/hooks/context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/context')>()),
  usePages: () => state.pages,
}));

const entities = fixtureEntities([
  fixtureEntity('media_player.salotto', 'playing', { friendly_name: 'Salotto' }),
  fixtureEntity('media_player.cucina', 'idle', { friendly_name: 'Cucina' }),
  fixtureEntity('media_player.sonos', 'idle', {
    friendly_name: 'Sonos studio',
    manufacturer: 'Sonos',
  }),
  fixtureEntity('media_player.tv', 'on', { friendly_name: 'TV salotto' }),
  fixtureEntity('todo.ufficio', '1', { friendly_name: 'Attività ufficio' }),
  fixtureEntity('sensor.costo_oggi', '2.5', { friendly_name: 'Costo oggi' }),
  fixtureEntity('input_number.costo_mese', '40', { friendly_name: 'Costo mese manuale' }),
  fixtureEntity('binary_sensor.movimento_ingresso', 'off', {
    friendly_name: 'Movimento ingresso',
    device_class: 'motion',
  }),
  fixtureEntity('binary_sensor.porta', 'off', { friendly_name: 'Porta', device_class: 'door' }),
  fixtureEntity('script.pulisci_cucina', 'off', { friendly_name: 'Pulisci cucina' }),
  fixtureEntity('vacuum.robot', 'docked', { friendly_name: 'Robot' }),
]);

function makePages(overrides: Record<string, unknown> = {}) {
  return {
    pagesConfig: { pages: ['home'], header: [], home: [] },
    hiddenCards: [] as string[],
    customIcons: {} as Record<string, string>,
    saveCustomName: vi.fn(),
    saveCustomIcon: vi.fn(),
    persistCustomIcons: vi.fn(),
    toggleCardVisibility: vi.fn(),
    savePageSetting: vi.fn(),
    pageSettings: {} as Record<string, Record<string, unknown>>,
    ...overrides,
  };
}

beforeEach(() => {
  state.pages = makePages();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

/**
 * Widget settings with a real store: what the sheet saves is what the widget then reads.
 * The saved settings are printed in an <output> so the test can hand them to the consumer.
 */
function SettingsHarness({
  widgetId,
  initial = {},
  conn = null,
  beside,
}: {
  widgetId: string;
  initial?: CardSettings;
  conn?: Connection | null;
  beside?: (settings: CardSettings) => ReactNode;
}) {
  const key = `home::${widgetId}`;
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>({ [key]: initial });
  const runtime = createFixtureRuntime({
    entities,
    conn,
    cardSettings,
    customNames: {},
    saveCardSetting: (settingsKey, setting, value) =>
      setCardSettings((current) => ({
        ...current,
        [settingsKey]: { ...current[settingsKey], [setting]: value },
      })),
  });
  const settings = cardSettings[key] ?? {};
  return (
    <WidgetRuntimeProvider value={runtime}>
      <WidgetSettingsSheet
        open
        onClose={() => undefined}
        widgetId={widgetId}
        settingsKey={key}
        pageId="home"
      />
      <output data-testid="salvate">{JSON.stringify(settings)}</output>
      {beside?.(settings)}
    </WidgetRuntimeProvider>
  );
}

const saved = (): CardSettings =>
  JSON.parse(screen.getByTestId('salvate').textContent ?? '{}') as CardSettings;

describe('PAR-2: lista del widget Attività', () => {
  it('la lista scelta nel foglio è quella che il widget carica', async () => {
    const { conn } = fakeConnection((message) =>
      message.type === 'todo/item/list'
        ? { items: [{ uid: 'a', summary: 'Comprare il pane', status: 'needs_action' }] }
        : null
    );
    render(
      <SettingsHarness
        widgetId="todo_card_1"
        initial={{ size: 'large' }}
        conn={conn}
        beside={(settings) => (
          <todoWidget.Widget
            id="todo_card_1"
            settingsKey="home::todo_card_1"
            settings={settings}
            size={{ w: 2, h: 3 }}
            editMode={false}
          />
        )}
      />
    );
    expect(
      screen.getByText('Scegli una lista di attività nelle impostazioni del widget.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lista di attività: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: /Attività ufficio.*todo\.ufficio/ }));
    await flush();
    expect(saved()).toMatchObject({ todoEntityId: 'todo.ufficio' });
    expect(await screen.findByText('Comprare il pane')).toBeInTheDocument();
    expect(screen.queryByText(/Scegli una lista di attività/)).not.toBeInTheDocument();
  });
});

describe('PAR-3: impostazioni di tipo con le chiavi lette dai widget nuovi', () => {
  it.each([
    'weather_temp_1',
    'calendar_card_1',
    'todo_card_1',
    'spacer_card_1',
    'camera_card_1',
    'androidtv_card_1',
    'vacuum.robot',
    'nordpool_card_1',
    'cost_card_1',
  ])('%s: nessun avviso «non ancora modificabili»', (widgetId) => {
    render(<SettingsHarness widgetId={widgetId} />);
    expect(screen.queryByText(/non sono ancora modificabili/)).not.toBeInTheDocument();
  });

  it('videocamera: legge gli alias legacy del motore e mostra solo i campi del modo scelto', () => {
    render(
      <SettingsHarness
        widgetId="camera_card_1"
        initial={{
          cameraId: 'camera.ingresso',
          cameraStreamEngine: 'custom',
          cameraWebrtcUrl: 'http://go2rtc.local/stream.html?src={entity_object_id}&mode=mse',
        }}
      />
    );
    const engine = screen.getByRole('group', { name: 'Motore video' });
    expect(within(engine).getByRole('button', { name: 'go2rtc' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(engine).queryByRole('button', { name: 'WebRTC' })).not.toBeInTheDocument();
    const mode = screen.getByRole('group', { name: 'Modalità go2rtc' });
    expect(within(mode).getByRole('button', { name: 'MSE' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('spinbutton', { name: 'Intervallo in secondi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sensore di movimento/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Su movimento' }));
    expect(
      screen.queryByRole('spinbutton', { name: 'Intervallo in secondi' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sensore di movimento: Nessuna' }));
    expect(screen.queryByRole('button', { name: /Porta/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Movimento ingresso/ }));

    fireEvent.click(within(engine).getByRole('button', { name: 'Istantanee' }));
    expect(screen.queryByRole('group', { name: 'Modalità go2rtc' })).not.toBeInTheDocument();

    const camera = readCameraSettings(saved());
    expect(camera.engine).toBe('snapshot');
    expect(camera.refreshMode).toBe('motion');
    expect(camera.motionSensorId).toBe('binary_sensor.movimento_ingresso');
  });

  it('videocamera: un vecchio «webrtc» appare come Home Assistant senza URL del lettore', () => {
    render(<SettingsHarness widgetId="camera_card_1" initial={{ cameraStreamEngine: 'webrtc' }} />);
    const engine = screen.getByRole('group', { name: 'Motore video' });
    expect(within(engine).getByRole('button', { name: 'Home Assistant' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('costi: sensori, etichette e decimali arrivano alla configurazione del widget', () => {
    render(<SettingsHarness widgetId="cost_card_1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Costo di oggi: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: /Costo oggi.*sensor\.costo_oggi/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Costo del mese: Nessuna' }));
    fireEvent.click(screen.getByRole('button', { name: /Costo mese manuale/ }));
    const today = screen.getByRole('textbox', { name: 'Etichetta di oggi' });
    expect(today).toHaveAttribute('placeholder', 'Oggi');
    fireEvent.change(today, { target: { value: '  Da mezzanotte ' } });
    fireEvent.blur(today);
    const month = screen.getByRole('textbox', { name: 'Etichetta del mese' });
    fireEvent.change(month, { target: { value: 'Ottobre' } });
    fireEvent.blur(month);

    const cost = readCostSettings(saved());
    expect(cost).toMatchObject({
      todayId: 'sensor.costo_oggi',
      monthId: 'input_number.costo_mese',
      todayLabel: 'Da mezzanotte',
      monthLabel: 'Ottobre',
    });
  });

  it('Nordpool: il prezzo con sostegno statale si imposta anche dal foglio', () => {
    render(<SettingsHarness widgetId="nordpool_card_1" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Prezzi con sostegno statale' }));
    expect(readNordpoolSettings(saved()).showWithSupport).toBe(true);
  });

  it('Android TV: il lettore della TV stessa non è tra quelli collegabili, come nel legacy', () => {
    render(
      <SettingsHarness widgetId="androidtv_card_1" initial={{ mediaPlayerId: 'media_player.tv' }} />
    );
    const list = screen.getByRole('group', { name: 'Lettori multimediali' });
    expect(
      within(list).queryByRole('button', { name: /media_player\.tv/ })
    ).not.toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: /Cucina.*media_player\.cucina/ }));
    expect(readTvConfig(saved()).linkedMediaPlayers).toEqual(['media_player.cucina']);
  });

  it('aspirapolvere: le associazioni vuote si chiamano «Automatico» e gli script delle stanze si gestiscono', () => {
    render(<SettingsHarness widgetId="vacuum.robot" />);
    expect(screen.getByRole('button', { name: 'Batteria: Automatico' })).toBeInTheDocument();
    const rooms = screen.getByRole('group', { name: 'Script delle stanze' });
    fireEvent.click(within(rooms).getByRole('button', { name: 'Aggiungi una stanza' }));
    expect(saved().roomScripts).toEqual([{ label: '', entityId: '' }]);

    const name = within(rooms).getByRole('textbox', { name: 'Stanza 1 Nome' });
    fireEvent.change(name, { target: { value: ' Cucina ' } });
    fireEvent.blur(name);
    fireEvent.click(within(rooms).getByRole('button', { name: 'Script della stanza 1: Nessuno' }));
    fireEvent.click(
      within(rooms).getByRole('button', { name: /Pulisci cucina.*script\.pulisci_cucina/ })
    );
    expect(saved().roomScripts).toEqual([{ label: 'Cucina', entityId: 'script.pulisci_cucina' }]);

    fireEvent.click(within(rooms).getByRole('button', { name: 'Rimuovi la stanza 1' }));
    expect(saved().roomScripts).toEqual([]);
  });
});

const baseLayout: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    { id: 'home', label: 'Principale', kind: 'widgets', placements: {} },
    { id: 'studio', label: 'Studio', kind: 'widgets', placements: {} },
    { id: 'ufficio', label: 'Ufficio', kind: 'widgets', placements: {} },
  ],
};

function launcherApi(layout: LauncherLayout, reorderPages: (ids: string[]) => void): LauncherApi {
  return {
    layout,
    grids: {
      phone: { w: 4, h: 6 },
      phoneLandscape: { w: 6, h: 2 },
      tabletPortrait: { w: 6, h: 8 },
      tablet: { w: 8, h: 5 },
    },
    deviceClass: 'tablet',
    currentPage: 1,
    goToPage: vi.fn(),
    editMode: true,
    setEditMode: vi.fn(),
    placeWidget: vi.fn(),
    moveWidget: vi.fn(() => true),
    resizeWidget: vi.fn(() => true),
    removeWidget: vi.fn(),
    addPage: vi.fn(() => 'nuova'),
    updatePage: vi.fn(),
    removePage: vi.fn(),
    reorderPages,
    setCoverEnabled: vi.fn(),
  };
}

/** Page settings over a launcher whose reorder really changes the layout. */
function PageHarness({
  pageId,
  initial = baseLayout,
}: {
  pageId: string | null;
  initial?: LauncherLayout;
}) {
  const [layout, setLayout] = useState(initial);
  const api = launcherApi(layout, (ids) =>
    setLayout((current) => reorderPagesInLayout(current, ids))
  );
  return (
    <WidgetRuntimeProvider value={createFixtureRuntime({ entities })}>
      <LauncherProvider value={api}>
        <PageSettingsSheet open onClose={() => undefined} pageId={pageId} />
        <output data-testid="ordine">{layout.pages.map((page) => page.id).join(',')}</output>
      </LauncherProvider>
    </WidgetRuntimeProvider>
  );
}

describe('CORR-5: riordino delle pagine', () => {
  it('sposta con la tastiera, annuncia la posizione e non perde il focus al bordo', () => {
    render(<PageHarness pageId="studio" />);
    const earlier = screen.getByRole('button', { name: 'Sposta prima' });
    const later = screen.getByRole('button', { name: 'Sposta dopo' });
    act(() => earlier.focus());
    fireEvent.click(earlier);
    expect(screen.getByTestId('ordine')).toHaveTextContent('studio,home,ufficio');
    expect(earlier).toBeDisabled();
    expect(later).toHaveFocus();
    expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent(
      'Pagina spostata alla posizione 1 di 3.'
    );

    fireEvent.click(later);
    fireEvent.click(later);
    expect(screen.getByTestId('ordine')).toHaveTextContent('home,ufficio,studio');
    expect(later).toBeDisabled();
    expect(earlier).toHaveFocus();
    expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent(
      'Pagina spostata alla posizione 3 di 3.'
    );
  });

  it('con una sola pagina spiega che non c’è un ordine da cambiare', () => {
    render(
      <PageHarness pageId="home" initial={{ ...baseLayout, pages: baseLayout.pages.slice(0, 1) }} />
    );
    expect(screen.queryByRole('button', { name: 'Sposta prima' })).not.toBeInTheDocument();
    expect(
      screen.getByText('C’è una sola pagina: non c’è un ordine da cambiare.')
    ).toBeInTheDocument();
  });
});

describe('DES-10: descrizione della pagina di widget', () => {
  it('dice «Pagina di widget», mentre la scelta del tipo resta «Widget»', () => {
    render(<PageHarness pageId="studio" />);
    expect(
      screen.getByRole('dialog', { name: 'Impostazioni della pagina' })
    ).toHaveAccessibleDescription('Pagina di widget: Studio');
    cleanup();
    render(<PageHarness pageId={null} />);
    const kinds = screen.getByRole('group', { name: 'Tipo di pagina' });
    expect(within(kinds).getByRole('button', { name: 'Widget' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      within(kinds).queryByRole('button', { name: 'Pagina di widget' })
    ).not.toBeInTheDocument();
  });
});

describe('PAR-1: lettori delle pagine Multimedia e Sonos', () => {
  function renderMediaPage(kind: PageKind, loaded = true) {
    const layout = {
      ...baseLayout,
      pages: [...baseLayout.pages, { id: 'musica', label: 'Musica', kind, placements: {} }],
    };
    render(
      <WidgetRuntimeProvider value={createFixtureRuntime({ entities, entitiesLoaded: loaded })}>
        <LauncherProvider value={launcherApi(layout, vi.fn())}>
          <PageSettingsSheet open onClose={() => undefined} pageId="musica" />
        </LauncherProvider>
      </WidgetRuntimeProvider>
    );
    return state.pages as ReturnType<typeof makePages>;
  }

  it('Multimedia elenca solo i lettori non Sonos, Sonos solo gli altoparlanti Sonos', () => {
    renderMediaPage('media');
    expect(screen.getByRole('switch', { name: 'Salotto' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Sonos studio' })).not.toBeInTheDocument();
    cleanup();
    renderMediaPage('sonos');
    expect(screen.getByRole('switch', { name: 'Sonos studio' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Salotto' })).not.toBeInTheDocument();
  });

  it('con una scelta salvata aggiunge in coda e conserva i lettori assenti, come il legacy', () => {
    state.pages = makePages({ pageSettings: { musica: { mediaIds: ['media_player.assente'] } } });
    const pages = renderMediaPage('media');
    const salotto = screen.getByRole('switch', { name: 'Salotto' });
    expect(salotto).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(salotto);
    expect(pages.savePageSetting).toHaveBeenLastCalledWith('musica', 'mediaIds', [
      'media_player.assente',
      'media_player.salotto',
    ]);
  });

  it('mostra tutti: togliere un lettore salva tutti gli altri', () => {
    const pages = renderMediaPage('media');
    fireEvent.click(screen.getByRole('switch', { name: 'Cucina' }));
    expect(pages.savePageSetting).toHaveBeenLastCalledWith('musica', 'mediaIds', [
      'media_player.salotto',
      'media_player.tv',
    ]);
  });

  it('durante il caricamento delle entità non dice che i lettori mancano', () => {
    renderMediaPage('media', false);
    expect(screen.getByText('Caricamento dei lettori…')).toBeInTheDocument();
    expect(
      screen.queryByText('Nessun lettore disponibile in Home Assistant.')
    ).not.toBeInTheDocument();
  });

  it('una pagina di widget non ha la sezione dei lettori', () => {
    render(<PageHarness pageId="studio" />);
    expect(screen.queryByRole('heading', { name: 'Lettori della pagina' })).not.toBeInTheDocument();
  });
});
