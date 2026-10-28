/**
 * «Dispositivi trovati» (REP-20261028-003): the screen over the launcher with the accordion, on
 * the fake device facade. The real client, flow and screen run on top of it; the launcher's
 * requests (the automatic widget, the plain add sheet) are mocks.
 */
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

import type { EntityMap } from '@/@types/ha';
import type { LauncherLayout } from '@/@types/launcher';
import { resetBrandLogos } from '@/components/widgets/utilities/discover/useBrandLogo';
import { PageProvider } from '@/hooks/context/PageContext';
import {
  AddSheetRequestProvider,
  AddWidgetRequestProvider,
} from '@/hooks/launcher/AddWidgetRequestContext';
import { DiscoveredFlowProvider } from '@/hooks/launcher/DiscoveredFlowContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { DiscoveredAddFlow } from '@/templates/devices/DiscoveredAddFlow';
import {
  DiscoveryScreen,
  SEARCH_POLL_MS,
  SEARCH_WINDOW_MS,
  UNDO_MS,
  resetShownTiles,
} from '@/templates/discovery/DiscoveryScreen';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { fakeConnection } from './UtilityHarness';
import {
  SAMSUNG_ENTITY,
  SAMSUNG_FLOW,
  samsungPinForm,
  tvDto,
  userForm,
  discoveredDto,
  errorReply,
  installFakeDevices,
  samsungConfirmForm,
  samsungCreated,
  samsungEntry,
  type FakeDevices,
} from './devicesFakeServer';

const layout = {
  version: 1,
  categoryDefaultsVersion: 1,
  cover: { enabled: false },
  pages: [{ id: 'home', label: 'home', kind: 'widgets', placements: { tablet: {} } }],
} as unknown as LauncherLayout;

// Two devices already in Home Assistant: a lamp no widget shows and a kitchen light that one shows.
const deviceRegistry = [
  { id: 'lampada', name: 'Lampada studio' },
  { id: 'cucina', name: 'Luce cucina' },
];
const entityRegistry = [
  { entity_id: 'light.studio', device_id: 'lampada', platform: 'hue' },
  { entity_id: 'light.cucina', device_id: 'cucina', platform: 'hue' },
];
const entities = (): EntityMap =>
  fixtureEntities([
    fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada studio' }),
    fixtureEntity('light.cucina', 'off', { friendly_name: 'Luce cucina' }),
    fixtureEntity(SAMSUNG_ENTITY, 'off', { friendly_name: 'Samsung 7 Series (49)' }),
    // The sensor of a device no widget type fits (it has no class a widget shows).
    fixtureEntity('sensor.acme_box', '1', { friendly_name: 'Acme Box' }),
  ]);

const connection = () =>
  fakeConnection({
    'config/device_registry/list': () => deviceRegistry,
    'config/entity_registry/list': () => entityRegistry,
  });

const requestAdd = vi.fn();
const requestSheet = vi.fn();
const onClose = vi.fn();
let fake: FakeDevices;

const seed = () => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home'], home: ['light.cucina'] })
  );
};

const screenOf = (searchWindow = false) =>
  render(
    <PageProvider>
      <WidgetRuntimeProvider
        value={createFixtureRuntime({ entities: entities(), conn: connection().conn })}
      >
        <AddWidgetRequestProvider value={requestAdd}>
          <AddSheetRequestProvider value={requestSheet}>
            <DiscoveredFlowProvider value={DiscoveredAddFlow}>
              <DiscoveryScreen open onClose={onClose} pageId="home" searchWindow={searchWindow} />
            </DiscoveredFlowProvider>
          </AddSheetRequestProvider>
        </AddWidgetRequestProvider>
      </WidgetRuntimeProvider>
    </PageProvider>
  );

const withFound = (...devices: ReturnType<typeof discoveredDto>[]) =>
  fake.on('GET /scoperti', () => ({ body: { devices } }));

const nestFound = () =>
  discoveredDto({
    flowId: 'found-nest',
    handler: 'nest',
    name: 'Nest Thermostat',
    model: null,
    family: 'climate',
    addable: false,
    reason: 'Aggiunta già in corso da un altro utente.',
  });

const header = (name: string | RegExp) => screen.getByRole('button', { name });
const summary = () => screen.getByRole('dialog').getAttribute('aria-describedby');
const summaryText = () => document.getElementById(summary() ?? '')?.textContent;
/** The first tile comes after a short reveal (600 ms): room for a loaded machine. */
const REVEAL_WAIT = { timeout: 3000 };
const skeletons = () => document.querySelectorAll('.discovery-skeleton');
/** Reads of the list of devices found (not the ignored ones, whose path starts the same). */
const reads = () => fake.calls.filter((call) => call.method === 'GET' && call.path === '/scoperti');

beforeEach(() => {
  seed();
  resetBrandLogos();
  resetShownTiles();
  requestAdd.mockClear();
  requestSheet.mockClear();
  onClose.mockClear();
  fake = installFakeDevices();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('«Dispositivi trovati»: la finestra', () => {
  it('ha il titolo, il riepilogo «T trovati · C collegati» e «Salta»', async () => {
    withFound(discoveredDto(), nestFound());
    screenOf();

    expect(await screen.findByRole('dialog', { name: 'Dispositivi trovati' })).toBeInTheDocument();
    // 1 to connect, 1 not now (Nest), 2 linked (the lamp and the kitchen light): 4 found.
    await waitFor(() => expect(summaryText()).toBe('4 trovati · 2 collegati'));
    expect(header('Da collegare (1)')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Collegati (2)')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Non trovi il tuo dispositivo?')).toHaveAttribute('aria-expanded', 'false');
    // Nothing ignored: that section is not there.
    expect(screen.queryByRole('button', { name: /^Nascosti/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Salta' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('apre una sezione alla volta: «Collegati» chiude «Da collegare»', async () => {
    withFound(discoveredDto());
    screenOf();
    await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT);

    fireEvent.click(header('Collegati (2)'));
    expect(header('Collegati (2)')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Da collegare (1)')).toHaveAttribute('aria-expanded', 'false');
    // Tapping the open header closes it: none open.
    fireEvent.click(header('Collegati (2)'));
    expect(header('Collegati (2)')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Da collegare (1)')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Da collegare: la ricerca con lo scheletro', () => {
  it('alla prima apertura mostra lo scheletro, poi i dispositivi al posto delle tessere', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Nothing for the first 5 s, then a device: the grid gets it on the next read.
    let count = 0;
    fake.on('GET /scoperti', () => {
      count += 1;
      return { body: { devices: count < 2 ? [] : [discoveredDto()] } };
    });
    screenOf(true);

    await waitFor(() => expect(reads()).toHaveLength(1));
    expect(skeletons()).toHaveLength(4);
    expect(screen.getByRole('status')).toHaveTextContent('Cerco i dispositivi…');
    expect(screen.queryByText(/Nessun nuovo dispositivo individuato/)).toBeNull();
    // «Salta», not «Fatto»: the search is on.
    expect(screen.getByRole('button', { name: 'Salta' })).toBeInTheDocument();

    // The window reads every 5 s, not every 15 s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    const tile = await screen.findByRole(
      'button',
      { name: /^Collega Samsung 7 Series \(49\)/ },
      REVEAL_WAIT
    );
    expect(within(tile).getByText('UE49NU7100')).toBeInTheDocument();
    // Two skeleton tiles stay after the found ones, with their words.
    expect(skeletons()).toHaveLength(2);
    expect(screen.getByText('Sto cercando altri dispositivi…')).toBeInTheDocument();

    // At the end of the window the skeleton goes and the screen can say «Fatto» when empty.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_WINDOW_MS);
    });
    expect(skeletons()).toHaveLength(0);
    expect(screen.queryByText('Sto cercando altri dispositivi…')).toBeNull();
    expect(
      screen.getByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ })
    ).toBeInTheDocument();
  });

  it('i numeri seguono le tessere, e alla riapertura quelle già viste compaiono subito', async () => {
    withFound(discoveredDto());
    screenOf(false);
    await waitFor(() => expect(reads().length).toBeGreaterThan(0));
    // The device is known, but its tile is not on screen yet: the counts wait for it.
    expect(header('Da collegare (0)')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT)
    ).toBeInTheDocument();
    expect(header('Da collegare (1)')).toBeInTheDocument();

    cleanup();
    screenOf(false);
    // Already shown on this tablet: no wait of the first reveal (600 ms) this time.
    await waitFor(
      () =>
        expect(
          screen.getByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ })
        ).toBeInTheDocument(),
      { timeout: 400 }
    );
  });

  it('smette di cercare appena una lettura non porta niente di nuovo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFound(discoveredDto());
    screenOf(false);
    expect(
      await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT)
    ).toBeInTheDocument();
    expect(skeletons().length).toBeGreaterThan(0);

    // The next read brings the same device: no skeleton is left to suggest more.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_POLL_MS);
    });
    await waitFor(() => expect(skeletons()).toHaveLength(0));
    expect(screen.queryByText('Sto cercando altri dispositivi…')).toBeNull();
    // The end is said in words, not only by «Fatto».
    expect(screen.getByText('Ricerca terminata: 1 dispositivo da collegare.')).toBeInTheDocument();
  });

  it('anche alla riapertura cerca con lo scheletro, e le tessere entrano una alla volta', async () => {
    let answer: (() => void) | null = null;
    fake.on(
      'GET /scoperti',
      () =>
        new Promise((resolve) => {
          answer = () => resolve({ body: { devices: [discoveredDto()] } });
        })
    );
    screenOf(false);
    await waitFor(() => expect(skeletons().length).toBeGreaterThan(0));

    await act(async () => {
      answer?.();
    });
    // Not at once: the first tile takes the place of a skeleton after a short while.
    expect(screen.queryByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ })).toBeNull();
    expect(
      await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT)
    ).toBeInTheDocument();
    expect(skeletons().length).toBeGreaterThan(0);
  });

  it('senza dispositivi dice che non ne ha trovati, con «Scegli la marca» e «Fatto»', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    screenOf(false);
    await waitFor(() => expect(reads().length).toBeGreaterThan(0));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_WINDOW_MS);
    });

    expect(
      await screen.findByText(
        'Nessun nuovo dispositivo individuato. Se il tuo non compare, scegli la marca.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fatto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salta' })).toBeNull();
    const panel = document.getElementById(
      header('Da collegare (0)').getAttribute('aria-controls') ?? ''
    );
    // «Scegli la marca» opens «Non trovi il tuo dispositivo?», where «Altra marca» is the catalogue.
    fireEvent.click(within(panel as HTMLElement).getByRole('button', { name: 'Scegli la marca' }));
    await waitFor(() =>
      expect(header('Non trovi il tuo dispositivo?')).toHaveAttribute('aria-expanded', 'true')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Altra marca' }));
    await waitFor(() => expect(fake.callsTo('GET /catalogo').length).toBeGreaterThan(0));
  });

  it('con il servizio spento offre «Ripara il servizio», e «Collegati» funziona lo stesso', async () => {
    fake.on('GET /scoperti', () => errorReply(503, 'SERVICE_NOT_ACTIVE', 'Servizio non attivo.'));
    screenOf();

    expect(
      await screen.findByText('Il servizio dei dispositivi non è attivo.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ripara il servizio' })).toBeEnabled();
    expect(screen.queryByText(/Nessun nuovo dispositivo individuato/)).toBeNull();
    await waitFor(() => expect(header('Collegati (2)')).toBeInTheDocument());
    fireEvent.click(header('Collegati (2)'));
    expect(screen.getByRole('list', { name: 'Dispositivi collegati' })).toHaveTextContent(
      'Lampada studio'
    );
  });

  it('un dispositivo che ora non si può collegare non è una tessera: sta sotto, con il motivo', async () => {
    withFound(discoveredDto(), nestFound());
    screenOf();
    const later = await screen.findByRole('list', { name: 'Dispositivi da collegare più tardi' });
    expect(later).toHaveTextContent('Nest Thermostat');
    expect(later).toHaveTextContent('Aggiunta già in corso da un altro utente.');
    expect(within(later).getByRole('button', { name: 'Nascondi Nest Thermostat' })).toBeEnabled();
    const grid = screen.getByRole('list', { name: 'Dispositivi da collegare' });
    expect(within(grid).queryByText('Nest Thermostat')).toBeNull();
  });
});

describe('Da collegare: la tessera', () => {
  it('un tocco sulla tessera avvia subito il collegamento, senza pannello', async () => {
    withFound(discoveredDto());
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungConfirmForm() }));
    screenOf();

    fireEvent.click(
      await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT)
    );
    expect(
      await screen.findByRole('heading', { name: 'Accetta sul televisore' })
    ).toBeInTheDocument();
    expect(fake.callsTo(`POST /scoperti/${SAMSUNG_FLOW}/aggiungi`)).toHaveLength(1);
  });

  it('«Nascondi» toglie subito la tessera, offre «Annulla» e avvisa il server dopo 8 secondi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFound(discoveredDto(), nestFound());
    screenOf();
    await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT);

    fake.on('POST /scoperti/:id/ignora', () => ({ body: { ignored: true } }));
    fireEvent.click(screen.getByRole('button', { name: 'Nascondi Samsung 7 Series (49)' }));
    expect(screen.queryByRole('button', { name: /^Collega Samsung 7 Series/ })).toBeNull();
    expect(
      screen.getByText(
        '«Samsung 7 Series (49)» nascosto: non verrà più proposto. Lo ritrovi in «Nascosti».'
      )
    ).toBeInTheDocument();
    const undo = screen.getByRole('button', { name: 'Annulla' });
    await waitFor(() => expect(undo).toHaveFocus());
    expect(fake.callsTo('POST /scoperti')).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS);
    });
    await waitFor(() =>
      expect(fake.callsTo(`POST /scoperti/${SAMSUNG_FLOW}/ignora`)).toHaveLength(1)
    );
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull();
  });

  it('«Annulla» riporta la tessera e il server non viene avvisato', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    withFound(discoveredDto());
    screenOf();
    await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT);

    fireEvent.click(screen.getByRole('button', { name: 'Nascondi Samsung 7 Series (49)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(
      screen.getByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ })
    ).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS);
    });
    expect(fake.callsTo('POST /scoperti')).toHaveLength(0);
  });

  it('a collegamento finito chiede il widget del tipo giusto, da solo, sulla pagina corrente', async () => {
    withFound(discoveredDto());
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungConfirmForm() }));
    fake.on('POST /flussi/:id', () => ({ body: samsungCreated() }));
    fake.on('GET /voci/:id', () => ({ body: samsungEntry() }));
    screenOf();

    fireEvent.click(
      await screen.findByRole('button', { name: /^Collega Samsung 7 Series \(49\)/ }, REVEAL_WAIT)
    );
    expect(
      await screen.findByRole('heading', { name: 'Accetta sul televisore' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salta' }));
    const done = await screen.findByRole('button', { name: 'Fine' });
    await waitFor(() => expect(done).toBeEnabled());
    fake.on('GET /scoperti', () => ({ body: { devices: [] } }));
    fireEvent.click(done);

    // The registries do not show the TV yet: the family of the integration decides.
    await waitFor(() => expect(requestAdd).toHaveBeenCalledTimes(1));
    expect(requestAdd).toHaveBeenCalledWith(
      'home',
      { type: 'androidtv', entityIds: [SAMSUNG_ENTITY] },
      { auto: true }
    );
    // The screen stays open on the grid and the device has left «Da collegare».
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Samsung 7 Series/ })).toBeNull()
    );
    // The search of this opening goes on, with its skeleton.
    expect(skeletons().length).toBeGreaterThan(0);
  });

  it('se nessun widget gli si adatta, nessun widget: «Scegli il widget» in «Collegati»', async () => {
    withFound(
      discoveredDto({ flowId: 'found-acme', handler: 'acme', name: 'Acme Box', family: null })
    );
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungConfirmForm() }));
    fake.on('POST /flussi/:id', () => ({
      body: samsungCreated(
        samsungEntry({
          domain: 'acme',
          title: 'Acme Box',
          device: {
            id: 'dev-acme',
            name: 'Acme Box',
            manufacturer: 'Acme',
            model: null,
            areaId: null,
            areaName: null,
          },
          entities: ['sensor.acme_box'],
          mediaPlayerEntityId: null,
        })
      ),
    }));
    fake.on('GET /voci/:id', () => ({
      body: samsungEntry({
        domain: 'acme',
        entities: ['sensor.acme_box'],
        mediaPlayerEntityId: null,
      }),
    }));
    screenOf();

    fireEvent.click(await screen.findByRole('button', { name: /^Collega Acme Box/ }, REVEAL_WAIT));
    fireEvent.click(await screen.findByRole('button', { name: 'Avanti' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salta' }));
    const done = await screen.findByRole('button', { name: 'Fine' });
    await waitFor(() => expect(done).toBeEnabled());
    fake.on('GET /scoperti', () => ({ body: { devices: [] } }));
    fireEvent.click(done);

    fireEvent.click(await screen.findByRole('button', { name: /^Collegati/ }));
    const choose = await screen.findByRole('button', { name: 'Scegli il widget: Acme Box' });
    expect(requestAdd).not.toHaveBeenCalled();
    fireEvent.click(choose);
    // The normal sheet, on the types: no automatic mode.
    expect(requestSheet).toHaveBeenCalledWith('home');
    expect(requestAdd).not.toHaveBeenCalled();
  });
});

describe('Collegati', () => {
  it('dice «Nel widget» per chi ha un widget e offre «Crea il widget» agli altri', async () => {
    screenOf();
    fireEvent.click(await screen.findByRole('button', { name: 'Collegati (2)' }));

    const list = screen.getByRole('list', { name: 'Dispositivi collegati' });
    const kitchen = within(list).getByText('Luce cucina').closest('li') as HTMLElement;
    expect(within(kitchen).getByText('Nel widget')).toBeInTheDocument();
    expect(within(kitchen).queryByRole('button')).toBeNull();

    const lamp = within(list).getByText('Lampada studio').closest('li') as HTMLElement;
    fireEvent.click(within(lamp).getByRole('button', { name: 'Crea il widget: Lampada studio' }));
    expect(requestAdd).toHaveBeenCalledWith(
      'home',
      { type: 'light', entityIds: ['light.studio'] },
      { auto: true }
    );
  });
});

describe('Nascosti', () => {
  it('compare solo se ce ne sono, e «Mostra di nuovo» toglie la riga', async () => {
    let ignored = [{ entryId: 'ign1', handler: 'samsungtv', name: 'TV camera', family: 'tv' }];
    fake.on('GET /scoperti/ignorati', () => ({ body: { devices: ignored } }));
    fake.on('POST /scoperti/ignorati/:id/ripristina', () => {
      ignored = [];
      return { body: { restored: true } };
    });
    screenOf();

    fireEvent.click(await screen.findByRole('button', { name: 'Nascosti (1)' }));
    expect(
      screen.getByText('Torna in «Da collegare» appena si fa rivedere in rete.')
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Dispositivi nascosti' })).toHaveTextContent(
      'TV camera'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mostra di nuovo: TV camera' }));
    await waitFor(() =>
      expect(fake.callsTo('POST /scoperti/ignorati/ign1/ripristina')).toHaveLength(1)
    );
    await waitFor(() => expect(screen.queryByText('TV camera')).toBeNull());
    // Nothing left: the section is gone.
    expect(screen.queryByRole('button', { name: /^Nascosti/ })).toBeNull();
  });
});

describe('Da collegare: i televisori in rete', () => {
  it('un televisore collegabile è una tessera della griglia e conta in «Da collegare» e nei trovati', async () => {
    withFound(discoveredDto());
    fake.on('GET /tv-in-rete', () => ({
      body: {
        tvs: [
          tvDto({ model: 'QE55' }),
          tvDto({ id: 'off', name: 'TV spenta', collegabile: false }),
        ],
      },
    }));
    screenOf();

    const grid = await screen.findByRole('list', { name: 'Dispositivi da collegare' });
    const tile = await within(grid).findByRole(
      'button',
      { name: /^Collega Televisore Samsung/ },
      REVEAL_WAIT
    );
    // The name already says «Samsung»: the caption keeps only the model.
    expect(within(tile).getByText('QE55')).toBeInTheDocument();
    expect(within(grid).queryByText('TV spenta')).toBeNull();
    await waitFor(() => expect(header('Da collegare (2)')).toBeInTheDocument());
    await waitFor(() => expect(summaryText()).toBe('4 trovati · 2 collegati'));
  });

  it('la tessera del televisore apre il flusso, e non c’è «Nascondi»', async () => {
    withFound();
    fake.on('GET /tv-in-rete', () => ({ body: { tvs: [tvDto()] } }));
    fake.on('POST /tv-in-rete/:id/collega', () => ({ status: 201, body: samsungPinForm() }));
    screenOf();

    const tile = await screen.findByRole(
      'button',
      { name: /^Collega Televisore Samsung/ },
      REVEAL_WAIT
    );
    expect(screen.queryByRole('button', { name: /^Nascondi/ })).toBeNull();
    fireEvent.click(tile);
    fireEvent.click(await screen.findByRole('button', { name: 'Sono davanti alla TV, continua' }));

    await waitFor(() =>
      expect(fake.callsTo(`POST /tv-in-rete/${tvDto().id}/collega`)).toHaveLength(1)
    );
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
    expect(await screen.findByLabelText('Codice mostrato sul televisore')).toBeInTheDocument();
  });
});

describe('Non trovi il tuo dispositivo?: prima il tipo, poi la marca', () => {
  it('chiede il tipo, poi una marca di quel tipo avvia la sua integrazione', async () => {
    withFound();
    fake.on('POST /flussi', () => ({ status: 201, body: userForm() }));
    screenOf();

    fireEvent.click(await screen.findByRole('button', { name: 'Non trovi il tuo dispositivo?' }));
    expect(screen.getByText('Che cos’è? Scegli il tipo, poi la marca.')).toBeInTheDocument();
    const types = screen.getByRole('list', { name: 'Tipi di dispositivo' });
    fireEvent.click(within(types).getByRole('button', { name: 'Luci' }));
    const lights = screen.getByRole('list', { name: 'Marche consigliate' });
    expect(within(lights).getByRole('button', { name: 'Philips Hue' })).toBeInTheDocument();

    // «Tutti i tipi» goes back to the types.
    fireEvent.click(screen.getByRole('button', { name: 'Tutti i tipi' }));
    expect(screen.getByRole('list', { name: 'Tipi di dispositivo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Luci' }));
    fireEvent.click(screen.getByRole('button', { name: 'Philips Hue' }));
    await waitFor(() => expect(fake.callsTo('POST /flussi')).toHaveLength(1));
    expect(fake.callsTo('POST /flussi')[0]?.body).toMatchObject({ handler: 'hue' });
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
  });

  it('una marca di televisori avvia la sua integrazione, senza il catalogo', async () => {
    withFound();
    fake.on('POST /flussi', () => ({ status: 201, body: samsungPinForm() }));
    screenOf();

    fireEvent.click(await screen.findByRole('button', { name: 'Non trovi il tuo dispositivo?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Televisori' }));
    expect(
      screen.getByText('Televisori: scegli la marca, Acasystem ti guida passo passo.')
    ).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Marche consigliate' });
    expect(within(list).getAllByRole('button')).toHaveLength(8);
    fireEvent.click(within(list).getByRole('button', { name: 'LG' }));

    // The guide of the brand comes first; going on starts the integration of that brand.
    fireEvent.click(await screen.findByRole('button', { name: 'Sono davanti alla TV, continua' }));
    await waitFor(() => expect(fake.callsTo('POST /flussi')).toHaveLength(1));
    expect(fake.callsTo('POST /flussi')[0]?.body).toMatchObject({ handler: 'webostv' });
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
  });

  it('la marca di un televisore visto lo collega', async () => {
    withFound();
    fake.on('GET /tv-in-rete', () => ({ body: { tvs: [tvDto()] } }));
    fake.on('POST /tv-in-rete/:id/collega', () => ({ status: 201, body: samsungPinForm() }));
    screenOf();

    await screen.findByRole('button', { name: /^Collega Televisore Samsung/ }, REVEAL_WAIT);
    fireEvent.click(screen.getByRole('button', { name: 'Non trovi il tuo dispositivo?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Televisori' }));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Marche consigliate' })).getByRole('button', {
        name: 'Samsung',
      })
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sono davanti alla TV, continua' }));
    await waitFor(() =>
      expect(fake.callsTo(`POST /tv-in-rete/${tvDto().id}/collega`)).toHaveLength(1)
    );
  });
});
